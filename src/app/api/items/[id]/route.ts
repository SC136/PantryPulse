import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const updates = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pantry_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Check if item is expired — log as waste
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: item } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single() as { data: any };

  if (item && !item.is_used && item.expiry_date && new Date(item.expiry_date) < new Date()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('waste_log').insert([{
      user_id: user.id,
      item_name: item.name,
      estimated_price: item.price,
      reason: 'expired',
    }]);
  }

  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
