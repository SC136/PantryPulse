import { ExpiryStatus } from '@/types';

// Default shelf life estimates (days) — used as fallback before AI call
export const DEFAULT_SHELF_LIFE: Record<string, number> = {
  milk: 7,
  bread: 5,
  eggs: 21,
  chicken: 3,
  beef: 4,
  pork: 4,
  fish: 2,
  shrimp: 2,
  lettuce: 5,
  spinach: 5,
  tomatoes: 7,
  onions: 30,
  potatoes: 21,
  carrots: 21,
  apples: 21,
  bananas: 5,
  oranges: 14,
  yogurt: 14,
  cheese: 21,
  butter: 30,
  rice: 180,
  pasta: 365,
  'canned goods': 730,
};

export function getDefaultExpiryDays(itemName: string): number | null {
  const lower = itemName.toLowerCase();
  for (const [key, days] of Object.entries(DEFAULT_SHELF_LIFE)) {
    if (lower.includes(key)) return days;
  }
  return null;
}

export function getExpiryLabel(daysLeft: number | null): string {
  if (daysLeft === null) return 'No expiry set';
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago`;
  if (daysLeft === 0) return 'Expires today!';
  if (daysLeft === 1) return 'Expires tomorrow';
  return `${daysLeft} days left`;
}

export function getExpiryStatusFromDays(days: number | null): ExpiryStatus {
  if (days === null) return 'unknown';
  if (days <= 1) return 'critical';
  if (days <= 4) return 'warning';
  return 'safe';
}
