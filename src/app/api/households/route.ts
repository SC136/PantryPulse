import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** GET  — list households current user belongs to */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships, error: mErr } = await (supabase as any)
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!memberships || memberships.length === 0) return NextResponse.json([]);

  const ids = memberships.map((m: { household_id: string }) => m.household_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: households, error: hErr } = await (supabase as any)
    .from('households')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: true });

  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });
  return NextResponse.json(households ?? []);
}

/** POST — create a new household */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: household, error: hErr } = await (supabase as any)
    .from('households')
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

  // Add creator as owner
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mErr } = await (supabase as any)
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'owner' });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json(household, { status: 201 });
}
