import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * POST /api/households/invite
 * Body: { household_id, email }
 * Creates an invite row and returns the join URL.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { household_id, email } = await req.json();
  if (!household_id || !email) {
    return NextResponse.json({ error: 'household_id and email are required' }, { status: 400 });
  }

  // Verify caller is a member of this household
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any)
    .from('household_members')
    .select('role')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 });
  }

  const token = randomUUID();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error } = await (supabase as any)
    .from('household_invites')
    .insert({
      household_id,
      invited_email: email.toLowerCase().trim(),
      token,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build the join URL
  const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
  const joinUrl = `${origin}/join?token=${token}`;

  return NextResponse.json({ invite, joinUrl }, { status: 201 });
}
