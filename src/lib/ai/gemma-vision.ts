import axios from 'axios';

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

  try {
    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as DetectedItem[];
    }
    return [];
  } catch (error) {
    console.error('Gemma vision error:', error);
    return [];
  }
}
