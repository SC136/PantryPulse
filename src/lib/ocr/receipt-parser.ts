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
  const lines = text.split('\n').filter(line => line.trim().length > 3);
  const items: ParsedReceiptItem[] = [];

  for (const line of lines) {
    // Skip common receipt headers/footers
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes('total') ||
      lowerLine.includes('subtotal') ||
      lowerLine.includes('tax') ||
      lowerLine.includes('change') ||
      lowerLine.includes('card') ||
      lowerLine.includes('visa') ||
      lowerLine.includes('mastercard') ||
      lowerLine.includes('receipt') ||
      lowerLine.includes('thank you') ||
      lowerLine.includes('date:') ||
      lowerLine.includes('time:') ||
      lowerLine.includes('store') ||
      lowerLine.includes('cashier') ||
      lowerLine.includes('payment')
    ) {
      continue;
    }

    // Try to extract item name and price
    // Pattern: "Item Name    $XX.XX" or "Item Name  XX.XX"
    const priceMatch = line.match(/^(.+?)\s+\$?(\d+\.\d{2})\s*$/);
    if (priceMatch) {
      const name = cleanItemName(priceMatch[1]);
      if (name.length > 1) {
        items.push({
          name,
          quantity: 1,
          price: parseFloat(priceMatch[2]),
        });
        continue;
      }
    }

    // Pattern: "QTY x Item Name  $XX.XX"
    const qtyMatch = line.match(/^(\d+)\s*[xX]\s+(.+?)\s+\$?(\d+\.\d{2})\s*$/);
    if (qtyMatch) {
      const name = cleanItemName(qtyMatch[2]);
      if (name.length > 1) {
        items.push({
          name,
          quantity: parseInt(qtyMatch[1], 10),
          price: parseFloat(qtyMatch[3]),
        });
        continue;
      }
    }

    // Fallback: just the item name (no price detected)
    const cleanedName = cleanItemName(line);
    if (cleanedName.length > 2 && /[a-zA-Z]{2,}/.test(cleanedName)) {
      items.push({
        name: cleanedName,
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
