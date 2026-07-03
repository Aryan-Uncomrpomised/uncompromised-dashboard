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

const isConnectedProduct = (categoryName, productName = '') => {
  if (!categoryName && !productName) return false;
  const lowerCat = (categoryName || '').toLowerCase();
  const lowerProd = (productName || '').toLowerCase();
  return lowerCat.includes('experience') || lowerCat.includes('learning') || lowerCat.includes('lear') || lowerCat.includes('service') || lowerCat.includes('event') || lowerCat.includes('gather') || lowerProd.includes('experience') || lowerProd.includes('learning');
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

    const posOrders = await executeKw('pos.order', 'search_read', [
      [['state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['name', 'amount_total', 'date_order', 'state'],
      order: 'date_order desc',
      limit: 1000
    });

    const posLines = await executeKw('pos.order.line', 'search_read', [
      [['order_id.state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['order_id', 'product_id', 'qty', 'price_subtotal_incl', 'price_subtotal'],
      order: 'id desc',
      limit: 10000
    });

    const validPosOrderIds = new Set(posOrders.map(o => o.id));
    const validLines = posLines.filter(l => validPosOrderIds.has(l.order_id[0]));

    const produceLines = validLines.filter(line => {
      const pId = line.product_id ? line.product_id[0] : null;
      const pInfo = productMap[pId];
      if (!pInfo) return false;
      return !isConnectedProduct(pInfo.category, pInfo.name);
    });

    const produceOrderIds = new Set(produceLines.map(l => l.order_id[0]));
    
    const sumProduceLinesIncl = produceLines.reduce((s, l) => s + (l.price_subtotal_incl || 0), 0);
    const sumProduceLinesExcl = produceLines.reduce((s, l) => s + (l.price_subtotal || 0), 0);
    const sumProduceOrders = posOrders.filter(o => produceOrderIds.has(o.id)).reduce((s, o) => s + (o.amount_total || 0), 0);

    console.log("NUM PRODUCE ORDERS:", produceOrderIds.size);
    console.log("SUM PRODUCE ORDERS AMOUNT_TOTAL:", sumProduceOrders);
    console.log("SUM PRODUCE LINES INCL:", sumProduceLinesIncl);
    console.log("SUM PRODUCE LINES EXCL:", sumProduceLinesExcl);

  } catch (err) {
    console.error(err);
  }
}
test();
