const xmlrpc = require('xmlrpc');

const ODOO_HOST = 'simplability.odoo.com';
const DB = 'simplability';
const USERNAME = 'finance@uncompromised.in';
const API_KEY = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const commonClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/object' });

let currentUid = null;
const authenticate = () => {
  return new Promise((resolve, reject) => {
    commonClient.methodCall('authenticate', [DB, USERNAME, API_KEY, {}], (err, uid) => {
      if (err) return reject(err);
      if (!uid) return reject(new Error('Authentication failed'));
      resolve(uid);
    });
  });
};

const executeKw = async (model, method, args, kwargs = {}) => {
  const uid = await authenticate();
  return new Promise((resolve, reject) => {
    objectClient.methodCall('execute_kw', [DB, uid, API_KEY, model, method, args, kwargs], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

async function test() {
  try {
    const posOrders = await executeKw('pos.order', 'search_read', [
      [['state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['name', 'amount_total', 'date_order', 'state', 'partner_id', 'lines'],
      order: 'date_order desc',
      limit: 1000
    });

    const posLines = await executeKw('pos.order.line', 'search_read', [
      [['order_id.state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['order_id', 'product_id', 'qty', 'price_subtotal_incl', 'price_unit'],
      order: 'id desc',
      limit: 10000
    });

    const validPosOrderIds = new Set(posOrders.map(o => o.id));
    const filteredPosLines = posLines.filter(line => validPosOrderIds.has(line.order_id[0]));

    const sumOrders = posOrders.reduce((sum, order) => sum + (order.amount_total || 0), 0);
    const sumLines = filteredPosLines.reduce((sum, line) => sum + (line.price_subtotal_incl || 0), 0);
    
    console.log("SUM ORDERS:", sumOrders);
    console.log("SUM LINES:", sumLines);

  } catch (err) {
    console.error(err);
  }
}

test();
