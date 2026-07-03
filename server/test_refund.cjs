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
    const posOrders = await executeKw('pos.order', 'search_read', [
      [['name', '=', 'Order POS Syphon #00001 - 000022 REFUND']]
    ], {
      fields: ['name', 'amount_total'],
    });

    if (posOrders.length > 0) {
      const order = posOrders[0];
      const posLines = await executeKw('pos.order.line', 'search_read', [
        [['order_id', '=', order.id]]
      ], {
        fields: ['order_id', 'qty', 'price_unit', 'price_subtotal_incl', 'price_subtotal']
      });
      
      console.log(order);
      console.log(posLines);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
