const xmlrpc = require('xmlrpc');

const db = 'simplability';
const username = 'finance@uncompromised.in';
const password = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const common = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/common' });

common.methodCall('authenticate', [db, username, password, {}], function (error, uid) {
    if (uid) {
        const models = xmlrpc.createSecureClient({ host: 'simplability.odoo.com', port: 443, path: '/xmlrpc/2/object' });
        
        // Fetch Categories
        models.methodCall('execute_kw', [db, uid, password, 'product.category', 'search_read', [[]], {fields: ['name']}], function (err, value) {
            console.log('Categories:', value.map(v => v.name));
        });

        // Test POS orders
        models.methodCall('execute_kw', [db, uid, password, 'pos.order', 'search_read', [[]], {fields: ['name'], limit: 5}], function (err, value) {
            console.log('POS Orders count:', value ? value.length : 0);
            console.log('POS Orders:', value);
            if(err) console.log(err);
        });
    }
});
