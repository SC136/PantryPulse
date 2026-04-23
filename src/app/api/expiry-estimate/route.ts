import { estimateExpiry } from '@/lib/ai/deepseek';
import { getDefaultExpiryDays } from '@/lib/utils/expiry';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple in-memory cache for common items
const expiryCache = new Map<string, number>();

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { itemName } = await req.json();
    if (!itemName) return NextResponse.json({ error: 'itemName required' }, { status: 400 });

    const key = itemName.toLowerCase().trim();

    // Check cache first
    if (expiryCache.has(key)) {
      return NextResponse.json({ days: expiryCache.get(key), source: 'cache' });
    }

    // Check local defaults
    const defaultDays = getDefaultExpiryDays(key);
    if (defaultDays !== null) {
      expiryCache.set(key, defaultDays);
      return NextResponse.json({ days: defaultDays, source: 'default' });
    }

    // Ask AI
    const days = await estimateExpiry(itemName);
    expiryCache.set(key, days);
    return NextResponse.json({ days, source: 'ai' });
  } catch (error) {
    console.error('Expiry estimate error:', error);
    return NextResponse.json({ days: 7, source: 'fallback' });
  }
}
