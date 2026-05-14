import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error && user) {
      // Check if profile is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('dietary_preferences, cuisine_preferences')
        .eq('id', user.id)
        .single();

      const isOnboarded = profile && (profile.dietary_preferences?.length > 0 || profile.cuisine_preferences?.length > 0);
      
      return NextResponse.redirect(new URL(isOnboarded ? '/pantry' : '/profile?onboarding=true', request.url));
    }
  }

  return NextResponse.redirect(new URL('/auth/error', request.url));
}
