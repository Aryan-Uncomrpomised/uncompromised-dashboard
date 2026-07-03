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
      if (err) reject(err);
      else resolve(uid);
    });
  });
};

const executeKw = async (model, method, args, kwargs = {}) => {
  const uid = await authenticate();
  return new Promise((resolve, reject) => {
    objectClient.methodCall('execute_kw', [DB, uid, API_KEY, model, method, args, kwargs], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

async function testReceivables() {
  try {
    // Look up the receivable account type
    const accounts = await executeKw('account.account', 'search_read', [
      [['account_type', '=', 'asset_receivable']]
    ], { fields: ['id', 'name', 'code'] });
    console.log('Receivable Accounts:', accounts);

    const accountIds = accounts.map(a => a.id);

    // Fetch unreconciled receivable lines
    const moveLines = await executeKw('account.move.line', 'search_read', [
      [
        ['account_id', 'in', accountIds],
        ['reconciled', '=', false],
        ['amount_residual', '!=', 0]
      ]
    ], {
      fields: ['id', 'name', 'date', 'date_maturity', 'partner_id', 'amount_residual', 'debit', 'credit', 'move_name', 'move_id'],
      limit: 10
    });
    
    console.log('Sample Unreconciled Receivable Lines:', moveLines);

  } catch (err) {
    console.error('Error:', err);
  }
}

testReceivables();
