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
    const accountIds = [81, 82, 1270];

    const moveLines = await executeKw('account.move.line', 'search_read', [
      [
        ['account_id', 'in', accountIds],
        ['date', '>=', '2026-04-01'],
        ['date', '<=', '2026-07-03'],
        ['parent_state', '=', 'posted'] // VERY IMPORTANT!
      ]
    ], {
      fields: ['account_id', 'debit', 'credit']
    });

    let sum110 = 0, sum120 = 0, sum121 = 0;

    moveLines.forEach(line => {
      const net = (line.credit || 0) - (line.debit || 0);
      if (line.account_id[0] === 81) sum110 += net;
      else if (line.account_id[0] === 82) sum120 += net;
      else if (line.account_id[0] === 1270) sum121 += net;
    });

    console.log('2026-04-01 to 2026-07-03 (POSTED ONLY):');
    console.log('200110:', sum110);
    console.log('200120:', sum120);
    console.log('200121:', sum121);
    console.log('Total:', sum110 + sum120 + sum121);

  } catch (err) {
    console.error(err);
  }
}
test();
