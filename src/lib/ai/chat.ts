import OpenAI from 'openai';

const RECIPE_TIMEOUT_MS = 20_000;
const EXPIRY_TIMEOUT_MS = 8_000;

function createTimeoutController(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clear: () => clearTimeout(timer) };
}

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

  let stream: Awaited<ReturnType<typeof client.chat.completions.create>>;
  const { controller, clear } = createTimeoutController(RECIPE_TIMEOUT_MS);

  try {
    stream = await client.chat.completions.create({
      model: 'meta/llama-4-maverick-17b-128e-instruct',
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
    }, {
      signal: controller.signal,
      timeout: RECIPE_TIMEOUT_MS,
    });
  } catch (error) {
    console.error('Generate recipe error:', error);
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('I had trouble reaching the recipe model just now. Please try again in a moment.'));
        ctrl.close();
      },
    });
  } finally {
    clear();
  }

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
  const { controller, clear } = createTimeoutController(EXPIRY_TIMEOUT_MS);

  try {
    const completion = await client.chat.completions.create({
      model: 'meta/llama-4-maverick-17b-128e-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a food safety expert. Given a food item name, estimate its typical shelf life in days when stored properly. Respond with ONLY a single integer number. Nothing else.'
        },
        { role: 'user', content: itemName }
      ],
      temperature: 0.1,
      max_tokens: 10,
    }, {
      signal: controller.signal,
      timeout: EXPIRY_TIMEOUT_MS,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || '7';
    const days = parseInt(text, 10);
    return isNaN(days) ? 7 : days;
  } catch (error) {
    console.error('Estimate expiry error:', error);
    return 7;
  } finally {
    clear();
  }
}

export async function extractReceiptItems(rawText: string): Promise<Array<{ name: string; quantity: number; price: number | null }>> {
  try {
    const completion = await client.chat.completions.create({
      model: 'meta/llama-4-maverick-17b-128e-instruct',
      messages: [
        {
          role: 'system',
          content: `You are an expert at parsing messy grocery receipts from OCR text.
Your task is to identify and extract ONLY individual food, beverage, and household consumable items.

Rules:
1. EXTRACT: Name of the product, estimated quantity, and price (in Rupees ₹).
2. IGNORE: Store names, addresses, dates, receipt numbers, payment details, sub-totals, taxes, savings, delivery fees, "grand total", or store policy text.
3. NOISY TEXT: OCR text is often broken. Try your best to reconstruct item names (e.g., "M1LK 1L" -> "Milk 1L").
4. FORMAT: You must return a JSON object with an "items" key containing an array of items.
Example: {"items": [{"name": "Milk", "quantity": 1, "price": 60}, {"name": "Eggs", "quantity": 1, "price": 80}]}

Strictly respond with ONLY the JSON object. No preamble or markdown blocks.`
        },
        { role: 'user', content: `OCR Text to parse (prices in Rupees):\n\n${rawText}` }
      ],
      temperature: 0.1,
      // Some models might not support response_format: { type: 'json_object' } if it's not OpenAI native
    });

    const content = completion.choices?.[0]?.message?.content || '{"items": []}';
    
    // Clean potential markdown blocks
    const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const data = JSON.parse(jsonString);
    const items = data.items || [];
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('Extract receipt items error:', error);
    return [];
  }
}
