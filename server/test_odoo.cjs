const xmlrpc = require('xmlrpc');
const DB = 'simplability';
const USERNAME = 'finance@uncompromised.in';
const API_KEY = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const commonClient = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/object' });

function executeKw(model, method, args, kwargs = {}) {
  return new Promise((resolve, reject) => {
    commonClient.methodCall('authenticate', [DB, USERNAME, API_KEY, {}], (err, uid) => {
      if (err || !uid) return reject(err || new Error('Auth failed'));
      objectClient.methodCall('execute_kw', [DB, uid, API_KEY, model, method, args, kwargs], (err, value) => {
        if (err) reject(err);
        else resolve(value);
      });
    });
  });
}

async function test() {
  const bills = await executeKw('account.move.line', 'search_read', [
    [
      ['parent_state', 'in', ['posted', 'draft']],
      ['product_id.name', 'ilike', 'Hybrid Tomato'],
      ['date', '>=', '2026-05-01'],
      ['date', '<=', '2026-05-31'],
      ['partner_id.name', 'in', ['Beyond Zero Farms LLP MSME', 'Beyond Zero Farms LLP - Others MSME', 'UF Processing', 'Market produce-MANDI']]
    ]
  ], {
    fields: ['product_id', 'quantity', 'parent_state', 'partner_id'],
  });
  
  const byProd = {};
  bills.forEach(b => {
    const pName = b.product_id[1];
    if (!byProd[pName]) byProd[pName] = 0;
    byProd[pName] += b.quantity;
  });
  console.log(byProd);
}
test().catch(console.error);
