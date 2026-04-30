import { extractReceiptItems } from '@/lib/ai/chat';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rawText } = await req.json();
    if (!rawText) return NextResponse.json({ error: 'rawText required' }, { status: 400 });

    const items = await extractReceiptItems(rawText);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Filter receipt error:', error);
    return NextResponse.json({ error: 'Failed to filter items' }, { status: 500 });
  }
}
