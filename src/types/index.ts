export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  category: 'fridge' | 'freezer' | 'pantry';
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date: string | null;
  days_until_expiry: number | null;
  price: number | null;
  store: string | null;
  image_url: string | null;
  is_used: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id?: string;
  user_id?: string;
  title: string;
  description?: string;
  cookTime?: number;
  cook_time_minutes?: number;
  servings: number;
  expiringUsed?: string[];
  ingredients: { item: string; amount: string }[];
  steps?: string[];
  instructions?: string;
  tags?: string[];
  tip?: string;
  is_favorited?: boolean;
  generated_at?: string;
}

export interface GroceryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  is_purchased: boolean;
  added_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  recipe?: Recipe;
  timestamp: Date;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  dietary_preferences: string[];
  cuisine_preferences: string[];
  cooking_skill: 'beginner' | 'intermediate' | 'advanced';
  household_size: number;
  has_air_fryer: boolean;
  has_instant_pot: boolean;
  created_at?: string;
}

export interface WasteLogEntry {
  id: string;
  user_id: string;
  item_name: string;
  estimated_price: number | null;
  wasted_at: string;
  reason: string;
}

export type ExpiryStatus = 'critical' | 'warning' | 'safe' | 'unknown';

export function getExpiryStatus(daysLeft: number | null): ExpiryStatus {
  if (daysLeft === null || daysLeft === undefined) return 'unknown';
  if (daysLeft <= 1) return 'critical';
  if (daysLeft <= 4) return 'warning';
  return 'safe';
}

export function getExpiryColor(status: ExpiryStatus): string {
  switch (status) {
    case 'critical': return 'var(--accent-warm)';
    case 'warning': return 'var(--accent-gold)';
    case 'safe': return 'var(--accent-safe)';
    default: return 'var(--ink-muted)';
  }
}
