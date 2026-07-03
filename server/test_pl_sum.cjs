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
    const accountIds = [81, 82, 1270]; // 200110, 200120, 200121

    const moveLines = await executeKw('account.move.line', 'search_read', [
      [['account_id', 'in', accountIds]]
    ], {
      fields: ['account_id', 'debit', 'credit', 'parent_state'],
      limit: 20000
    });

    let sum110 = 0;
    let sum120 = 0;
    let sum121 = 0;

    moveLines.forEach(line => {
      // Only include lines from posted moves, not drafts! (parent_state === 'posted')
      if (line.parent_state === 'posted') {
        const net = (line.credit || 0) - (line.debit || 0);
        if (line.account_id[0] === 81) sum110 += net;
        else if (line.account_id[0] === 82) sum120 += net;
        else if (line.account_id[0] === 1270) sum121 += net;
      }
    });

    console.log('200110 (Produce):', sum110);
    console.log('200120 (Experiences):', sum120);
    console.log('200121 (Learning):', sum121);
    console.log('Total POSTED:', sum110 + sum120 + sum121);
    
    // Also without parent_state check to see if drafts are the issue
    let raw110 = 0, raw120 = 0, raw121 = 0;
    moveLines.forEach(line => {
      const net = (line.credit || 0) - (line.debit || 0);
      if (line.account_id[0] === 81) raw110 += net;
      else if (line.account_id[0] === 82) raw120 += net;
      else if (line.account_id[0] === 1270) raw121 += net;
    });
    console.log('--- ALL STATES ---');
    console.log('Raw 200110:', raw110);
    console.log('Raw 200120:', raw120);
    console.log('Raw 200121:', raw121);
    console.log('Total RAW:', raw110 + raw120 + raw121);

  } catch (err) {
    console.error(err);
  }
}
test();
