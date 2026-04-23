import { createClient } from '@/lib/supabase/server';
import { generateRecipe } from '@/lib/ai/deepseek';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { message, pantryItems, expiringItems, dietaryPrefs, cuisinePrefs, cookingSkill } = await req.json();

    const stream = await generateRecipe(
      pantryItems || [],
      expiringItems || [],
      message || 'Suggest a recipe using my pantry items',
      dietaryPrefs || [],
      cuisinePrefs || [],
      cookingSkill || 'intermediate'
    );

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Cook API error:', error);
    return NextResponse.json({ error: 'Failed to generate recipe' }, { status: 500 });
  }
}
