import { createClient } from '@/lib/supabase/server';
import { analyzeFridgeImage } from '@/lib/ai/gemma-vision';
import { NextRequest, NextResponse } from 'next/server';

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
    }

    // Convert to base64 for Gemma vision
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Analyze with Gemma
    const detectedItems = await analyzeFridgeImage(base64);

    return NextResponse.json({ items: detectedItems, scanPath: fileName });
  } catch (error) {
    console.error('Scan fridge error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
