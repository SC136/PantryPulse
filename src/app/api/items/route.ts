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

  let query = supabase
    .from('pantry_items')
    .select('id,name,category,quantity,unit,expiry_date,days_until_expiry,price,is_used,household_id')
    .eq('user_id', user.id)
    .eq('is_used', false)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const householdId = searchParams.get('household_id');
  if (householdId) {
    query = query.eq('household_id', householdId);
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (expiring === 'true') {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 4);
    query = query.lte('expiry_date', threshold.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
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
