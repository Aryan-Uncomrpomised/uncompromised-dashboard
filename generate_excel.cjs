const db = require('better-sqlite3')('server/odoo_cache.db');
const fs = require('fs');

const products = db.prepare('SELECT name, categ_id_name FROM products').all();

const isFreshItem = (categoryName, productName = '') => {
  if (!categoryName && !productName) return false;
  const c = (categoryName || '').toLowerCase();
  const p = (productName || '').toLowerCase();
  if (c.includes('fresh') || p.includes('fresh') || p.includes('raw mango') || p.includes('raw banana')) return true;
  const freshList = ['apple', 'banana', 'guava', 'papaya', 'mango', 'grapes', 'kiwi', 'strawberry', 'tomato', 'onion', 'potato', 'brinjal', 'bhindi', 'capsicum', 'cabbage', 'cauliflower', 'spinach', 'methi', 'coriander', 'curry leaves', 'basil', 'lemongrass', 'oregano', 'mint', 'drumstick', 'turai', 'karela', 'tinda', 'pumpkin', 'mushroom', 'corn', 'peanut'];
  return freshList.some(item => p.includes(item));
};

let csv = 'Product Name,Category,Classification\n';
products.forEach(p => {
  const classification = isFreshItem(p.categ_id_name, p.name) ? 'Fresh' : 'Processed';
  const cleanName = (p.name || '').replace(/"/g, '""');
  const cleanCategory = (p.categ_id_name || '').replace(/"/g, '""');
  csv += `"${cleanName}","${cleanCategory}",${classification}\n`;
});

fs.writeFileSync('Product_Categorization.csv', csv);
console.log('Generated Product_Categorization.csv');
