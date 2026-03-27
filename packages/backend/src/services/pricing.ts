import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey,
});

interface PriceEstimate {
  suggestedPrice: number;
  rationale: string;
  platforms: string[];
}

/**
 * Ask Claude to estimate a selling price for an item.
 *
 * We send the item's name, description, condition, dimensions, and weight.
 * Claude returns a JSON object with a suggested price, rationale, and
 * recommended selling platforms.
 *
 * The result is saved to the item record so we don't re-call the API
 * unless the user explicitly requests a refresh.
 */
export async function estimatePrice(itemId: string): Promise<PriceEstimate> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { category: true },
  });

  if (!item) throw new Error('Item not found');
  if (item.deletedAt) throw new Error('Item has been deleted');

  // Build a description string with everything Claude needs
  const details = [
    `Item: ${item.name}`,
    item.description && `Description: ${item.description}`,
    `Category: ${item.category.name}`,
    `Condition: ${item.condition}`,
    item.quantity > 1 && `Quantity: ${item.quantity}`,
    item.lengthIn && item.widthIn && item.heightIn &&
      `Dimensions: ${item.lengthIn}"L × ${item.widthIn}"W × ${item.heightIn}"H`,
    item.weightLbs && `Weight: ${item.weightLbs} lbs`,
    item.notes && `Additional notes: ${item.notes}`,
    item.estimatedSaleValue && `Owner's estimate: $${item.estimatedSaleValue}`,
  ].filter(Boolean).join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are helping someone sell household items during a cross-country move. Based on the item details below, provide a realistic selling price for the US secondhand market (2026).

${details}

Respond with ONLY a JSON object (no markdown, no code fences) in this exact format:
{
  "suggestedPrice": <number>,
  "rationale": "<2-3 sentences explaining the price based on condition, brand, age, and market demand>",
  "platforms": ["<best platform>", "<second best>", "<third best>"]
}

For platforms, choose from: Facebook Marketplace, OfferUp, Craigslist, eBay, Poshmark, Mercari, Nextdoor, Consignment Shop, Garage Sale.

Be realistic — used items typically sell for 20-50% of retail, less for commodity items, more for premium brands in good condition.`,
      },
    ],
  });

  // Extract the text response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  // Parse the JSON response
  let estimate: PriceEstimate;
  try {
    estimate = JSON.parse(textBlock.text);
  } catch {
    throw new Error(`Failed to parse Claude response: ${textBlock.text}`);
  }

  // Validate the response shape
  if (
    typeof estimate.suggestedPrice !== 'number' ||
    typeof estimate.rationale !== 'string' ||
    !Array.isArray(estimate.platforms)
  ) {
    throw new Error('Invalid response shape from Claude');
  }

  // Save to database
  await prisma.item.update({
    where: { id: itemId },
    data: {
      llmPriceSuggestion: estimate.suggestedPrice,
      llmPriceRationale: estimate.rationale,
      llmPricePlatforms: estimate.platforms,
      llmPriceGeneratedAt: new Date(),
    },
  });

  return estimate;
}
