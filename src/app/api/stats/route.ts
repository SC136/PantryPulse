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

  const [wasteData, savedData, totalItems, wasteItems] = await Promise.all([
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
      .eq('is_used', true),
    supabase
      .from('waste_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('wasted_at', startOfMonth.toISOString())
      .order('wasted_at', { ascending: false }),
  ]);

  const wasted = ((wasteData.data || []) as any[]).reduce(
    (s: number, i: any) => s + (i.estimated_price || 0),
    0
  );
  const saved = ((savedData.data || []) as any[]).reduce(
    (s: number, i: any) => s + (i.price || 0),
    0
  );
  const total = wasted + saved;
  const reductionPct = total > 0 ? Math.round((saved / total) * 100) : 0;

  // Top wasted item
  const wasteNameCounts: Record<string, number> = {};
  ((wasteItems.data || []) as any[]).forEach((item: any) => {
    wasteNameCounts[item.item_name] = (wasteNameCounts[item.item_name] || 0) + 1;
  });
  const topWasted = Object.entries(wasteNameCounts).sort((a, b) => b[1] - a[1])[0];

  return NextResponse.json({
    moneySaved: saved,
    moneyWasted: wasted,
    reductionPct,
    itemsRescued: totalItems.count || 0,
    wasteLog: wasteItems.data || [],
    topWastedItem: topWasted ? topWasted[0] : null,
  });
}
