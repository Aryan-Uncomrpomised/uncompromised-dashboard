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
      if (err) return reject(err);
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
      [
        ['state', 'in', ['paid', 'done', 'invoiced']],
        ['date_order', '>=', '2026-04-01 00:00:00'],
        ['date_order', '<=', '2026-07-02 23:59:59']
      ]
    ], {
      fields: ['name', 'amount_total', 'amount_paid', 'amount_return', 'amount_tax', 'date_order', 'state'],
      order: 'date_order desc'
    });

    const sumTotal = posOrders.reduce((s, o) => s + (o.amount_total || 0), 0);
    const sumPaid = posOrders.reduce((s, o) => s + (o.amount_paid || 0), 0);
    
    console.log("DATE RANGE ORDERS:", posOrders.length);
    console.log("SUM TOTAL:", sumTotal);
    console.log("SUM PAID:", sumPaid);

    const orderIds = posOrders.map(o => o.id);
    if (orderIds.length > 0) {
      const payments = await executeKw('pos.payment', 'search_read', [
        [['pos_order_id', 'in', orderIds]]
      ], {
        fields: ['amount']
      });
      
      const sumPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
      console.log("SUM PAYMENTS:", sumPayments);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
