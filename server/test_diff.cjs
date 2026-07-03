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
      [['state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['name', 'amount_total', 'date_order'],
      order: 'date_order desc',
      limit: 1000
    });

    const posLines = await executeKw('pos.order.line', 'search_read', [
      [['order_id.state', 'in', ['paid', 'done', 'invoiced']]]
    ], {
      fields: ['order_id', 'price_subtotal_incl'],
      order: 'id desc',
      limit: 10000
    });

    const lineSums = {};
    posLines.forEach(l => {
      const oId = l.order_id[0];
      if (!lineSums[oId]) lineSums[oId] = 0;
      lineSums[oId] += l.price_subtotal_incl || 0;
    });

    let diffCount = 0;
    let sumAmountTotal = 0;
    let sumLineTotal = 0;
    
    posOrders.forEach(o => {
      const lineSum = lineSums[o.id];
      if (lineSum !== undefined) {
        sumAmountTotal += o.amount_total;
        sumLineTotal += lineSum;
        const diff = Math.abs(o.amount_total - lineSum);
        if (diff > 1.0 && diffCount < 5) {
          console.log(`ORDER ${o.name}: amount_total = ${o.amount_total}, line_sum = ${lineSum}`);
          diffCount++;
        }
      }
    });

    console.log(`TOTALS FOR MATCHED ORDERS: amount_total = ${sumAmountTotal}, line_sum = ${sumLineTotal}`);

  } catch (err) {
    console.error(err);
  }
}
test();
