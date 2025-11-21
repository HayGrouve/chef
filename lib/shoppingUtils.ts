export function parseIngredient(text: string) {
  text = text.trim().toLowerCase();
  
  // Basic regex to capture leading number/fraction
  // e.g. "2 cups milk" -> qty: 2, unit: "cups", item: "milk"
  // "1/2 tsp salt" -> qty: 0.5, unit: "tsp", item: "salt"
  
  const match = text.match(/^([\d./]+)\s*(\w+)?\s+(.+)$/);
  
  if (match) {
    let qty = 0;
    const qtyStr = match[1];
    
    if (qtyStr.includes('/')) {
      const [num, den] = qtyStr.split('/').map(Number);
      qty = den !== 0 ? num / den : 0;
    } else {
      qty = parseFloat(qtyStr);
    }

    return {
      qty,
      unit: match[2] || "",
      item: match[3].trim(),
      original: text
    };
  }
  
  return {
    qty: 1,
    unit: "",
    item: text,
    original: text
  };
}

