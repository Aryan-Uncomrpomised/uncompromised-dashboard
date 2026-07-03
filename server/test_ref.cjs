const db = require('better-sqlite3')('odoo_cache.db');
const bills = db.prepare(`SELECT ref, analytic_code FROM vendor_bills WHERE partner_name LIKE '%Beyond Zero%' LIMIT 20`).all();

bills.forEach(b => {
  let pqFarm = null;
  if (b.ref && b.ref.includes('] ') && b.ref.includes(' - ')) {
    const beforeDash = b.ref.split(' - ')[0];
    const afterBracket = beforeDash.split('] ')[1];
    if (afterBracket) {
      const parts = afterBracket.split('/');
      if (parts.length >= 2) {
         pqFarm = parts[0].trim() + '/' + parts[1].trim();
      } else {
         pqFarm = afterBracket.trim();
      }
    }
  }
  console.log({ ref: b.ref, pqFarm, analytic: b.analytic_code });
});
