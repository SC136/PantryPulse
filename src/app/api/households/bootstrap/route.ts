import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/households/bootstrap
 * Idempotent — if user has no household memberships:
 *   1. Create "My Household"
 *   2. Insert owner membership
 *   3. Backfill pantry_items.household_id for user's items where null
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if user already has any memberships
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: existErr } = await (supabase as any)
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1);

  // Surface any DB errors (e.g. table missing, RLS)
  if (existErr) {
    console.error('[bootstrap] household_members query error:', existErr);
    return NextResponse.json({ error: existErr.message, code: existErr.code }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    // Already bootstrapped — backfill any remaining null household_id items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('pantry_items')
      .update({ household_id: existing[0].household_id })
      .eq('user_id', user.id)
      .is('household_id', null);

    return NextResponse.json({ status: 'already_bootstrapped', household_id: existing[0].household_id });
  }

  console.log('[bootstrap] user.id:', user.id, 'user.email:', user.email);

  // Create default household
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: household, error: hErr } = await (supabase as any)
    .from('households')
    .insert([{ name: 'My Household', created_by: user.id }])
    .select()
    .single();

  if (hErr) {
    console.error('[bootstrap] households insert error:', JSON.stringify(hErr, null, 2));
    console.error('[bootstrap] hErr.message:', hErr.message);
    console.error('[bootstrap] hErr.code:', hErr.code);
    console.error('[bootstrap] hErr.details:', hErr.details);
    console.error('[bootstrap] hErr.hint:', hErr.hint);
    return NextResponse.json({ error: hErr.message || 'insert failed', code: hErr.code, details: hErr.details, hint: hErr.hint }, { status: 500 });
  }

  // Add owner membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mErr } = await (supabase as any)
    .from('household_members')
    .insert({ household_id: household.id, user_id: user.id, role: 'owner' });

  if (mErr) {
    console.error('[bootstrap] household_members insert error:', mErr);
    return NextResponse.json({ error: mErr.message, code: mErr.code }, { status: 500 });
  }

  // Backfill existing pantry items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('pantry_items')
    .update({ household_id: household.id })
    .eq('user_id', user.id)
    .is('household_id', null);

  return NextResponse.json({ status: 'created', household_id: household.id }, { status: 201 });
}
