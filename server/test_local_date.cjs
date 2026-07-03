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
      fields: ['name', 'amount_total', 'date_order', 'state', 'config_id'],
      order: 'date_order desc',
      limit: 2000
    });

    const start = new Date("2026-04-01T00:00:00");
    const end = new Date("2026-07-02T23:59:59.999");

    const configs = {};
    
    posOrders.forEach(o => {
      const d = new Date(o.date_order); 
      if (d >= start && d <= end) {
        const cId = o.config_id ? o.config_id[1] : 'Unknown';
        if (!configs[cId]) configs[cId] = { count: 0, sum: 0 };
        configs[cId].count++;
        configs[cId].sum += o.amount_total || 0;
      }
    });

    console.log(configs);

  } catch (err) {
    console.error(err);
  }
}
test();
