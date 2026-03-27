/**
 * Format dimensions as a readable string like 24"L × 16"W × 14"H
 */
export function formatDimensions(
  lengthIn: number | null,
  widthIn: number | null,
  heightIn: number | null,
): string {
  const parts: string[] = [];
  if (lengthIn != null) parts.push(`${lengthIn}"L`);
  if (widthIn != null) parts.push(`${widthIn}"W`);
  if (heightIn != null) parts.push(`${heightIn}"H`);
  return parts.join(' × ') || 'No dimensions';
}

/**
 * Format weight with "lbs" suffix
 */
export function formatWeight(weightLbs: number | null): string {
  if (weightLbs == null) return 'No weight';
  return `${weightLbs} lbs`;
}

/**
 * Calculate volume in cubic inches
 */
export function calcVolumeCuIn(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
): number {
  return lengthIn * widthIn * heightIn;
}

/**
 * Calculate fill percentage of a container
 */
export function calcFillPercent(usedCuIn: number, totalCuIn: number): number {
  if (totalCuIn <= 0) return 0;
  return Math.round((usedCuIn / totalCuIn) * 100);
}
