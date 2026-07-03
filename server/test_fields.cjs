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
      [['state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['name', 'amount_total', 'amount_paid', 'amount_return', 'amount_tax', 'date_order', 'state'],
      order: 'date_order desc',
      limit: 1000
    });

    const sumTotal = posOrders.reduce((s, o) => s + (o.amount_total || 0), 0);
    const sumPaid = posOrders.reduce((s, o) => s + (o.amount_paid || 0), 0);
    const sumTax = posOrders.reduce((s, o) => s + (o.amount_tax || 0), 0);
    const sumUntaxed = sumTotal - sumTax;

    console.log("SUM TOTAL:", sumTotal);
    console.log("SUM PAID:", sumPaid);
    console.log("SUM TAX:", sumTax);
    console.log("SUM UNTAXED:", sumUntaxed);
    console.log("NUM ORDERS:", posOrders.length);

  } catch (err) {
    console.error(err);
  }
}
test();
