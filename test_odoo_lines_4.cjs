const { connectDB, client } = require('./server/db.cjs');
const xmlrpc = require('xmlrpc');

const ODOO_HOST = process.env.ODOO_HOST || 'simplability.odoo.com';
const DB = process.env.ODOO_DB || 'simplability';
const USERNAME = process.env.ODOO_USERNAME || 'finance@uncompromised.in';
const API_KEY = process.env.ODOO_API_KEY || '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const commonClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/object' });

let currentUid = null;
const authenticate = () => {
  return new Promise((resolve, reject) => {
    if (currentUid) return resolve(currentUid);
    commonClient.methodCall('authenticate', [DB, USERNAME, API_KEY, {}], (err, uid) => {
      if (err) return reject(err);
      if (!uid) return reject(new Error('Authentication failed'));
      currentUid = uid;
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
    const lines = await executeKw('account.move.line', 'search_read', [
      [
        ['id', '=', 192803]
      ]
    ], {
      fields: ['id', 'date', 'move_id.invoice_date']
    });
    console.log(lines);
  } catch(e) {
    console.error(e);
  }
}
test();
