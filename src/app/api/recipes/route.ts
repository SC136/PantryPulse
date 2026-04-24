import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
  const rawOffset = Number.parseInt(searchParams.get('offset') ?? '', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('recipes')
    .select('id,title,ingredients,instructions,cook_time_minutes,servings,tags,is_favorited,generated_at')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const toInsert = {
    user_id: user.id,
    title: body.title,
    ingredients: body.ingredients,
    instructions: body.steps ? body.steps.join('\n') : (body.instructions || ''),
    cook_time_minutes: body.cookTime || body.cook_time_minutes || null,
    servings: body.servings || 2,
    tags: body.tags || body.expiringUsed || [],
    is_favorited: false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('recipes')
    .insert(toInsert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
