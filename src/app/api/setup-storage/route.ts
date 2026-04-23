import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const buckets = [
    { name: 'fridge-scans', public: false },
    { name: 'receipt-scans', public: false },
    { name: 'item-photos', public: true },
  ];

  const results = [];
  for (const bucket of buckets) {
    const { error } = await supabase.storage.createBucket(bucket.name, {
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
