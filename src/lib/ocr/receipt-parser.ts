export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  price: number | null;
}

export async function parseReceiptText(imageFile: File): Promise<ParsedReceiptItem[]> {
  // Dynamically import Tesseract to avoid SSR issues
  const Tesseract = await import('tesseract.js');
  
  const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
    logger: () => {},
  });

  return extractItemsFromText(text);
}

function extractItemsFromText(text: string): ParsedReceiptItem[] {
  const lines = text.split('\n').filter(line => line.trim().length > 2);
  const items: ParsedReceiptItem[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase().trim();
    
    // Skip very short lines or empty ones
    if (lowerLine.length < 2) continue;

    // Skip common non-item receipt keywords
    if (
      lowerLine.includes('total') ||
      lowerLine.includes('subtotal') ||
      lowerLine.includes('tax') ||
      lowerLine.includes('savings') ||
      lowerLine.includes('discount') ||
      lowerLine.includes('change') ||
      lowerLine.includes('cash') ||
      lowerLine.includes('visa') ||
      lowerLine.includes('card') ||
      lowerLine.includes('thank you') ||
      lowerLine.includes('items sold') ||
      lowerLine.includes('quantity') ||
      lowerLine.includes('price') ||
      lowerLine.includes('amount') ||
      lowerLine.includes('store') ||
      lowerLine.includes('tel:') ||
      lowerLine.includes('date') ||
      lowerLine.includes('time') ||
      lowerLine.includes('http') ||
      lowerLine.includes('.com')
    ) {
      continue;
    }

    // Attempt to extract item name and price
    // Price usually looks like XX.XX or X.XX at the end of a line
    const priceRegex = /(\d+[\.,]\d{2})\s*$/;
    const priceMatch = line.match(priceRegex);

    if (priceMatch) {
      const priceStr = priceMatch[1].replace(',', '.');
      const namePart = line.replace(priceMatch[0], '').trim();
      const cleanedName = cleanItemName(namePart);

      if (cleanedName.length > 2) {
        items.push({
          name: cleanedName,
          quantity: 1,
          price: parseFloat(priceStr),
        });
        continue;
      }
    }

    // Fallback: If no price but looks like an item name (contains letters)
    const fallbackName = cleanItemName(line);
    if (fallbackName.length > 3 && /[a-zA-Z]{3,}/.test(fallbackName)) {
      items.push({
        name: fallbackName,
        quantity: 1,
        price: null,
      });
    }
  }

  return items;
}

function cleanItemName(name: string): string {
  return name
    .replace(/[#@*(){}[\]]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\d+\s+/, '')
    .trim();
}
