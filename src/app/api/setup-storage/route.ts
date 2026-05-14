import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET() {
  // CRITICAL: Verify user is authenticated
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Storage bucket creation requires service_role (admin) key to bypass RLS.
  // Falls back to anon key if service_role isn't set — will fail with RLS error.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const buckets = [
    { name: 'fridge-scans', public: false },
    { name: 'receipt-scans', public: false },
    { name: 'item-photos', public: true },
  ];

  const results = [];
  for (const bucket of buckets) {
    const { error } = await supabaseAdmin.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    });
    if (error && !error.message.includes('already exists')) {
      results.push({ bucket: bucket.name, error: error.message });
    } else {
      results.push({ bucket: bucket.name, status: 'ok' });
    }
  }

  return NextResponse.json({ success: true, results });
}
