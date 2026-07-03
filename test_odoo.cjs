const xmlrpc = require('xmlrpc');

const db = 'simplability';
const username = 'finance@uncompromised.in';
const password = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const common = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/common' });

common.methodCall('authenticate', [db, username, password, {}], function (error, uid) {
  if (error) {
    console.log('Auth error:', error);
  } else {
    console.log('Authenticated! UID:', uid);
    
    // Test fetch a sale order
    if (uid) {
        const models = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/object' });
        models.methodCall('execute_kw', [db, uid, password, 'sale.order', 'search_read', [[]], {fields: ['name', 'amount_total'], limit: 5}], function (err, value) {
            if (err) {
                console.log('Fetch error:', err);
            } else {
                console.log('Data:', value);
            }
        });
    }
  }
});
