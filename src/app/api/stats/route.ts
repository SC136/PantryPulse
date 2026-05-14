/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [wasteData, savedData, rescuedItems, wasteItems] = await Promise.all([
    supabase
      .from('waste_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('wasted_at', startOfMonth.toISOString()),
    supabase
      .from('pantry_items')
      .select('price')
      .eq('user_id', user.id)
      .eq('is_used', true)
      .gte('updated_at', startOfMonth.toISOString()),
    supabase
      .from('pantry_items')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_used', true)
      .gte('updated_at', startOfMonth.toISOString()),
    supabase
      .from('waste_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('wasted_at', startOfMonth.toISOString())
      .order('wasted_at', { ascending: false }),
  ]);

  if (wasteData.error || savedData.error || rescuedItems.error || wasteItems.error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  const wasted = ((wasteData.data || []) as any[]).reduce(
    (s: number, i: any) => s + (i.estimated_price || 0),
    0
  );
  const saved = ((savedData.data || []) as any[]).reduce(
    (s: number, i: any) => s + (i.price || 0),
    0
  );
  // Round to 2 decimal places to avoid floating point precision errors
  const roundedWasted = Math.round(wasted * 100) / 100;
  const roundedSaved = Math.round(saved * 100) / 100;
  const total = roundedWasted + roundedSaved;
  const reductionPct = total > 0 ? Math.round((roundedSaved / total) * 100) : 0;

  // Top wasted item
  const wasteNameCounts: Record<string, number> = {};
  ((wasteItems.data || []) as any[]).forEach((item: any) => {
    wasteNameCounts[item.item_name] = (wasteNameCounts[item.item_name] || 0) + 1;
  });
  const sortedWaste = Object.entries(wasteNameCounts).sort((a, b) => b[1] - a[1]);
  const topWasted = sortedWaste.length > 0 ? sortedWaste[0] : null;

  return NextResponse.json({
    moneySaved: roundedSaved,
    moneyWasted: roundedWasted,
    reductionPct,
    itemsRescued: rescuedItems.count || 0,
    wasteLog: wasteItems.data || [],
    topWastedItem: topWasted ? topWasted[0] : null,
  });
}
