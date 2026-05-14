import { estimateExpiry } from '@/lib/ai/chat';
import { getDefaultExpiryDays } from '@/lib/utils/expiry';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple in-memory cache with size limit to prevent memory leaks
const expiryCache = new Map<string, number>();
const MAX_CACHE_SIZE = 500;

function getCachedValue(key: string): number | undefined {
  return expiryCache.get(key);
}

function setCachedValue(key: string, value: number): void {
  // If cache is at max size, clear the oldest entry
  if (expiryCache.size >= MAX_CACHE_SIZE && !expiryCache.has(key)) {
    const firstKey = expiryCache.keys().next().value;
    if (firstKey) expiryCache.delete(firstKey);
  }
  expiryCache.set(key, value);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { itemName } = await req.json();
    if (!itemName) return NextResponse.json({ error: 'itemName required' }, { status: 400 });

    const key = itemName.toLowerCase().trim();

    // Check cache first
    const cachedDays = getCachedValue(key);
    if (cachedDays !== undefined) {
      return NextResponse.json({ days: cachedDays, source: 'cache' });
    }

    // Check local defaults
    const defaultDays = getDefaultExpiryDays(key);
    if (defaultDays !== null) {
      setCachedValue(key, defaultDays);
      return NextResponse.json({ days: defaultDays, source: 'default' });
    }

    // Ask AI
    const days = await estimateExpiry(itemName);
    setCachedValue(key, days);
    return NextResponse.json({ days, source: 'ai' });
  } catch (error) {
    console.error('Expiry estimate error:', error);
    return NextResponse.json({ days: 7, source: 'fallback' });
  }
}
