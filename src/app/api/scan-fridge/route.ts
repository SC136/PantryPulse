import { createClient } from '@/lib/supabase/server';
import { analyzeFridgeImage } from '@/lib/ai/gemma-vision';
import { after, NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-scan.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('fridge-scans')
      .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload scan image' }, { status: 500 });
    }

    // Create a scan job and return immediately so image analysis is fully async.
    const { data: job, error: jobError } = await (supabase as any)
      .from('fridge_scan_jobs')
      .insert({ user_id: user.id, scan_path: fileName, status: 'queued' })
      .select('id')
      .single();

    if (jobError || !job?.id) {
      console.error('Failed to create scan job:', jobError);
      return NextResponse.json({ error: 'Failed to start scan job' }, { status: 500 });
    }

    const jobId = job.id as string;

    after(async () => {
      try {
        const now = new Date().toISOString();
        await (supabase as any)
          .from('fridge_scan_jobs')
          .update({ status: 'processing', updated_at: now })
          .eq('id', jobId)
          .eq('user_id', user.id);

        const { data: scanFile, error: downloadError } = await supabase.storage
          .from('fridge-scans')
          .download(fileName);

        if (downloadError || !scanFile) {
          throw new Error(downloadError?.message || 'Failed to download scan image');
        }

        const buffer = await scanFile.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const detectedItems = await analyzeFridgeImage(base64);

        await (supabase as any)
          .from('fridge_scan_jobs')
          .update({
            status: 'completed',
            detected_items: detectedItems,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Async fridge scan job failed:', error);
        const message = error instanceof Error ? error.message : 'Scan job failed';
        await (supabase as any)
          .from('fridge_scan_jobs')
          .update({
            status: 'failed',
            error: message.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('user_id', user.id);
      }
    });

    return NextResponse.json({ jobId, status: 'queued', scanPath: fileName }, { status: 202 });
  } catch (error) {
    console.error('Scan fridge error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
