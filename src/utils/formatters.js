export const cleanProductName = (rawName) => {
  if (!rawName) return 'Unknown Product';
  let clean = String(rawName);
  
  // Remove SKU prefix like "[179.1] " or "[179]"
  if (clean.includes(']')) {
    clean = clean.split(']')[1].trim();
  }
  
  // Remove trailing _P suffix used in some backend systems
  clean = clean.replace(/_P$/, '').trim();
  
  // Remove packaging sizes like (1kg), (500g), etc.
  clean = clean.replace(/\(\s*\d+(\.\d+)?\s*(kg|g|gm|pc|pcs)\s*\)/ig, '').trim();
  
  // Strip Hindi translations after slash (e.g. "Okra (Bhindi)/भिंडी" -> "Okra (Bhindi)")
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts[0].trim().length > 0) {
      clean = parts[0].trim();
    } else if (parts.length > 1) {
      clean = parts[1].trim(); // Fallback if it was just "/बैंगन"
    }
  }
  
  // Fix weird stray parenthesis like "Chikoo/चीकू)" which becomes "Chikoo)"
  clean = clean.replace(/\)$/, '').trim();
  
  return clean || 'Unknown Product';
};
