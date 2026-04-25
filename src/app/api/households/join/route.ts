import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/households/join
 * Body: { token }
 * Verifies invite token, checks email match, creates membership, sets accepted_at.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

  // Look up invite by token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error: iErr } = await (supabase as any)
    .from('household_invites')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single();

  if (iErr || !invite) {
    return NextResponse.json({ error: 'Invalid or already-used invite' }, { status: 404 });
  }

  // Verify email matches
  if (invite.invited_email !== user.email?.toLowerCase().trim()) {
    return NextResponse.json(
      { error: 'This invite was sent to a different email address' },
      { status: 403 }
    );
  }

  // Check not already a member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: alreadyMember } = await (supabase as any)
    .from('household_members')
    .select('user_id')
    .eq('household_id', invite.household_id)
    .eq('user_id', user.id)
    .single();

  if (alreadyMember) {
    return NextResponse.json({ error: 'Already a member', household_id: invite.household_id });
  }

  // Insert membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: mErr } = await (supabase as any)
    .from('household_members')
    .insert({
      household_id: invite.household_id,
      user_id: user.id,
      role: invite.role || 'member',
    });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Mark invite as accepted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('household_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  return NextResponse.json({ success: true, household_id: invite.household_id });
}
