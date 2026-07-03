const db = require('better-sqlite3')('odoo_cache.db');
const { UOM_RATIO } = require('./produceMappings.cjs');

const lines = db.prepare(`SELECT * FROM vendor_bills WHERE date >= '2026-05-01' AND date <= '2026-05-31'`).all();

const cropMap = {};
lines.forEach(line => {
  let productNew = line.product_name;
  const pos = productNew.indexOf(']');
  if (pos >= 0) productNew = productNew.substring(pos + 1).trim();
  productNew = productNew.replace('_P', '').trim();
  
  if (!cropMap[productNew]) cropMap[productNew] = 0;
  cropMap[productNew] += line.qty_purchased;
});

const topCrops = Object.keys(cropMap)
  .map(k => ({ name: k, value: cropMap[k] }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 10);

console.log(topCrops);
