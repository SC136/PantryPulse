import axios from 'axios';

const GEMMA_TIMEOUT_MS = 15_000;

export interface DetectedItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedDaysLeft: number;
  category: 'fridge' | 'freezer' | 'pantry';
}

export async function analyzeFridgeImage(base64Image: string): Promise<DetectedItem[]> {
  const payload = {
    model: 'google/gemma-3-27b-it',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this fridge/pantry image. List every food item visible.
For each item respond ONLY in this JSON format — no markdown, no explanation:
[{"name":"Spinach","quantity":1,"unit":"bag","estimatedDaysLeft":3,"category":"fridge"}]
Be thorough — identify everything visible. If you cannot determine days left, estimate conservatively. Valid categories: fridge, freezer, pantry.`
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          }
        ]
      }
    ],
    max_tokens: 1024,
    temperature: 0.2,
    top_p: 0.7,
  };

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), GEMMA_TIMEOUT_MS);

    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      payload,
      {
        timeout: GEMMA_TIMEOUT_MS,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    clearTimeout(timeout);

    const content = response.data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as DetectedItem[];
      } catch (parseError) {
        console.error('Failed to parse vision response JSON:', parseError, 'Content:', jsonMatch[0]);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error('Gemma vision error:', error);
    return [];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
