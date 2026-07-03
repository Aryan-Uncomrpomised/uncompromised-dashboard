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
    const accounts = await executeKw('account.account', 'search_read', [
      [['code', 'like', '200110']]
    ], {
      fields: ['id', 'name', 'code']
    });
    console.log("ACCOUNTS:", accounts);

    if (accounts.length > 0) {
      const accountId = accounts[0].id;
      const moveLines = await executeKw('account.move.line', 'search_read', [
        [['account_id', '=', accountId]]
      ], {
        fields: ['id', 'name', 'ref', 'move_id', 'move_name', 'product_id', 'quantity', 'price_unit', 'debit', 'credit', 'balance', 'date'],
        limit: 10,
        order: 'date desc'
      });
      console.log("MOVE LINES:");
      console.log(moveLines);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
