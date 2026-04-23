import { createClient } from '@/lib/supabase/server';
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
    const fileName = `${user.id}/${Date.now()}-receipt.jpg`;
    await supabase.storage
      .from('receipt-scans')
      .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

    // Convert file to buffer for OCR (server-side)
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Use simple text extraction approach on server
    // Return the base64 so client can do Tesseract OCR (runs in browser)
    return NextResponse.json({
      imageBase64: base64,
      scanPath: fileName,
      message: 'Receipt uploaded. OCR processing will happen client-side.',
    });
  } catch (error) {
    console.error('Scan receipt error:', error);
    return NextResponse.json({ error: 'Failed to process receipt' }, { status: 500 });
  }
}
