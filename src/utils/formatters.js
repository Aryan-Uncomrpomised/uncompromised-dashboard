export const cleanProductName = (rawName) => {
  if (!rawName) return 'Unknown Product';
  let clean = String(rawName).trim();
  
  // Remove SKU prefix like "[179.1] " or "[179]" at the beginning only
  clean = clean.replace(/^\[[^\]]+\]\s*/, '');
  
  // Remove trailing _P suffix used in some backend systems
  clean = clean.replace(/_P$/, '').trim();
  
  // Remove packaging sizes like (1kg), (500g), etc.
  clean = clean.replace(/\(\s*\d+(\.\d+)?\s*(kg|g|gm|pc|pcs)\s*\)/ig, '').trim();
  
  // Remove packaging sizes without parenthesis like 500 gms, 500g, 1 kg, etc.
  clean = clean.replace(/\d+(\.\d+)?\s*(kg|g|gm|gms|pc|pcs)\b/ig, '').trim();
  
  // Strip Hindi translations after slash (e.g. "Okra (Bhindi)/भिंडी" -> "Okra (Bhindi)")
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts[0].trim().length > 0) {
      clean = parts[0].trim();
    } else if (parts.length > 1) {
      clean = parts[1].trim(); // Fallback if it was just "/बैंगन"
    }
  }
  
  // Remove all parenthesis brackets ( and ) to keep product names clean and uncluttered
  clean = clean.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();

  // Translate specific Hindi crop names to English
  const cleanLower = clean.toLowerCase().trim();
  if (
    cleanLower === 'बैंगन' || 
    cleanLower === 'बैगन' || 
    cleanLower === 'baingan' || 
    cleanLower === 'baigan' ||
    cleanLower.includes('baingan') ||
    cleanLower.includes('brinjal')
  ) {
    return 'Brinjal Eggplant';
  }
  
  return clean || 'Unknown Product';
};