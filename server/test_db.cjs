const db = require('better-sqlite3')('odoo_cache.db');
const res = db.prepare(`SELECT product_name, product_new, quantity, uom_name, date, partner_name FROM vendor_bills WHERE date LIKE '2026-05%' AND product_name LIKE '%Tomato%'`).all();
console.log(res);
