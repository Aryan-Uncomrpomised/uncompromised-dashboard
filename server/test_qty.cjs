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
    const moveLines = await executeKw('account.move.line', 'search_read', [
      [
        ['account_id', 'in', [81]], 
        ['parent_state', '=', 'posted']
      ]
    ], {
      fields: ['id', 'quantity', 'debit', 'credit', 'name'],
      limit: 20000
    });

    let diffLines = [];
    
    moveLines.forEach(line => {
      const net = (line.credit || 0) - (line.debit || 0);
      let val = net;
      if (line.quantity < 0 && val > 0) {
        val = -val;
      }
      
      if (val !== net) {
        diffLines.push({
          id: line.id,
          name: line.name,
          quantity: line.quantity,
          net: net,
          newVal: val,
          diff: net - val // e.g. 391 - (-391) = 782
        });
      }
    });

    console.log(diffLines);
    
    let totalDiff = 0;
    diffLines.forEach(l => totalDiff += l.diff);
    console.log('Total Difference caused by getRevenue:', totalDiff);

  } catch (err) {
    console.error(err);
  }
}
test();
