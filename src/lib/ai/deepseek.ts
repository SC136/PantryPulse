import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export async function generateRecipe(
  pantryItems: string[],
  expiringItems: string[],
  userMessage: string,
  dietaryPrefs: string[] = [],
  cuisinePrefs: string[] = [],
  cookingSkill: string = 'intermediate'
): Promise<ReadableStream> {
  const dietLine = dietaryPrefs.length > 0
    ? `\nDietary restrictions: ${dietaryPrefs.join(', ')}`
    : '';
  const cuisineLine = cuisinePrefs.length > 0
    ? `\nPreferred cuisines: ${cuisinePrefs.join(', ')}`
    : '';

  const stream = await client.chat.completions.create({
    model: 'deepseek-ai/deepseek-v3.2',
    messages: [
      {
        role: 'system',
        content: `You are PantryPulse's recipe engine. Strict rules:
1. ONLY use ingredients from the provided pantry list. Basics (salt, pepper, oil, water, sugar, flour) are always allowed.
2. PRIORITIZE expiring ingredients — build the recipe around them first.
3. Respond in this exact JSON format:
{
  "title": "Recipe Title",
  "description": "One evocative sentence",
  "cookTime": 20,
  "servings": 2,
  "expiringUsed": ["ingredient1"],
  "ingredients": [{"item": "name", "amount": "1 cup"}],
  "steps": ["Step 1.", "Step 2."],
  "tip": "One practical kitchen tip"
}
4. Substitution awareness: if a common substitution is useful, mention it inline naturally.
5. Ingredient synonyms: treat "capsicum"="bell pepper", "coriander"="cilantro", "aubergine"="eggplant".
6. Cooking skill level: ${cookingSkill}. Adjust complexity accordingly.${dietLine}${cuisineLine}`
      },
      {
        role: 'user',
        content: `Pantry: ${pantryItems.join(', ')}\nExpiring soon: ${expiringItems.join(', ')}\n\nRequest: ${userMessage}`
      }
    ],
    temperature: 0.85,
    top_p: 0.95,
    max_tokens: 2048,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function estimateExpiry(itemName: string): Promise<number> {
  const completion = await client.chat.completions.create({
    model: 'deepseek-ai/deepseek-v3.2',
    messages: [
      {
        role: 'system',
        content: 'You are a food safety expert. Given a food item name, estimate its typical shelf life in days when stored properly. Respond with ONLY a single integer number. Nothing else.'
      },
      { role: 'user', content: itemName }
    ],
    temperature: 0.1,
    max_tokens: 10,
  });

  const text = completion.choices?.[0]?.message?.content?.trim() || '7';
  const days = parseInt(text, 10);
  return isNaN(days) ? 7 : days;
}
