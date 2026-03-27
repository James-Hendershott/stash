import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, nochange } from '@nozbe/watermelondb/decorators';

export default class Item extends Model {
  static table = 'items';

  @field('server_id') serverId!: string;
  @text('name') name!: string;
  @text('description') description!: string | null;
  @field('category_id') categoryId!: string;
  @field('category_name') categoryName!: string | null;
  @field('category_color') categoryColor!: string | null;
  @field('condition') condition!: string;
  @field('quantity') quantity!: number;
  @field('length_in') lengthIn!: number | null;
  @field('width_in') widthIn!: number | null;
  @field('height_in') heightIn!: number | null;
  @field('weight_lbs') weightLbs!: number | null;
  @field('shape_type') shapeType!: string;
  @field('fate') fate!: string;
  @field('origin_location_id') originLocationId!: string;
  @field('origin_location_name') originLocationName!: string | null;
  @field('destination_location_id') destinationLocationId!: string | null;
  @field('destination_location_name') destinationLocationName!: string | null;
  @field('photo_path') photoPath!: string | null;
  @field('qr_code_path') qrCodePath!: string | null;
  @field('is_container') isContainer!: boolean;
  @field('estimated_sale_value') estimatedSaleValue!: number | null;
  @field('llm_price_suggestion') llmPriceSuggestion!: number | null;
  @text('llm_price_rationale') llmPriceRationale!: string | null;
  @text('notes') notes!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
