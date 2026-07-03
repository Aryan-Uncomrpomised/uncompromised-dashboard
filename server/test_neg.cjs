const xmlrpc = require('xmlrpc');

const ODOO_HOST = 'simplability.odoo.com';
const DB = 'simplability';
const USERNAME = 'finance@uncompromised.in';
const API_KEY = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const commonClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/object' });

const authenticate = () => {
  return new Promise((resolve, reject) => {
    commonClient.methodCall('authenticate', [DB, USERNAME, API_KEY, {}], (err, uid) => {
      resolve(uid);
    });
  });
};

const executeKw = async (model, method, args, kwargs = {}) => {
  const uid = await authenticate();
  return new Promise((resolve, reject) => {
    objectClient.methodCall('execute_kw', [DB, uid, API_KEY, model, method, args, kwargs], (err, result) => {
      resolve(result);
    });
  });
};

async function test() {
  try {
    const products = await executeKw('product.product', 'search_read', [[]], {
      fields: ['name', 'categ_id']
    });
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = { name: p.name, category: p.categ_id ? p.categ_id[1] : 'Uncategorized' };
    });

    const posLines = await executeKw('pos.order.line', 'search_read', [
      [['order_id.state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['order_id', 'product_id', 'qty', 'price_subtotal_incl', 'price_subtotal'],
      order: 'id desc',
      limit: 10000
    });

    const negativeLines = posLines.filter(l => l.price_subtotal_incl < 0);
    
    let sumNeg = 0;
    const negProducts = {};
    
    negativeLines.forEach(l => {
      sumNeg += l.price_subtotal_incl;
      const pId = l.product_id ? l.product_id[0] : null;
      const pName = l.product_id ? l.product_id[1] : 'Unknown';
      const cat = pId && productMap[pId] ? productMap[pId].category : 'Uncategorized';
      
      const key = `${pName} (${cat})`;
      if (!negProducts[key]) negProducts[key] = { count: 0, sum: 0 };
      negProducts[key].count++;
      negProducts[key].sum += l.price_subtotal_incl;
    });

    console.log("TOTAL NEGATIVE AMOUNT:", sumNeg);
    console.log(negProducts);

  } catch (err) {
    console.error(err);
  }
}
test();
