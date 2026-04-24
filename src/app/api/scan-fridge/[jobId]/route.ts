import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jobId } = await params;

  const { data, error } = await (supabase as any)
    .from('fridge_scan_jobs')
    .select('id,status,detected_items,error,scan_path,created_at,updated_at,completed_at')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Scan job not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      jobId: data.id,
      status: data.status,
      items: data.detected_items || [],
      error: data.error,
      scanPath: data.scan_path,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
