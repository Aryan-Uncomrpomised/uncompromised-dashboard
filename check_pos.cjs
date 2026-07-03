const xmlrpc = require('xmlrpc');

const db = 'simplability';
const username = 'finance@uncompromised.in';
const password = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const common = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/common' });

common.methodCall('authenticate', [db, username, password, {}], function (error, uid) {
    if (uid) {
        const models = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/object' });
        
        models.methodCall('execute_kw', [db, uid, password, 'pos.order', 'search_read', [[]], {fields: ['name', 'state', 'date_order'], limit: 10}], function (err, value) {
            console.log('POS Orders:', value);
        });
    }
});
