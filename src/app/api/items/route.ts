import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const expiring = searchParams.get('expiring');
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
  const rawOffset = Number.parseInt(searchParams.get('offset') ?? '', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  // Compute days_until_expiry live in JS so it never goes stale between inserts
  let query = supabase
    .from('pantry_items')
    .select('id,name,category,quantity,unit,expiry_date,price,is_used')
    .eq('user_id', user.id)
    .eq('is_used', false)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (expiring === 'true') {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 4);
    // Build date string using server's local timezone (typically UTC in production).
    // Note: This uses the server's timezone, not the client's, so all users see
    // the same expiry cutoff. If per-user timezone handling is needed, the client
    // should compute the threshold locally and pass it as a query param instead.
    const thresholdDateStr = threshold.getFullYear() + '-' +
      String(threshold.getMonth() + 1).padStart(2, '0') + '-' +
      String(threshold.getDate()).padStart(2, '0');
    query = query.lte('expiry_date', thresholdDateStr);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute days_until_expiry fresh on every request — avoids stale stored values
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const withFreshExpiry = (data ?? []).map((item) => {
    if (!item.expiry_date) return { ...item, days_until_expiry: null };
    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const days = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...item, days_until_expiry: days };
  });

  return NextResponse.json(withFreshExpiry);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const items = Array.isArray(body) ? body : [body];

  const toInsert = items.map((item: Record<string, unknown>) => ({
    ...item,
    user_id: user.id,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pantry_items')
    .insert(toInsert)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
