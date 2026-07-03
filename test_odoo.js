const xmlrpc = require('xmlrpc');

const ODOO_HOST = 'simplability.odoo.com';
const DB = 'simplability';
const USERNAME = 'finance@uncompromised.in';
const API_KEY = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const commonClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/object' });

commonClient.methodCall('authenticate', [DB, USERNAME, API_KEY, {}], (err, uid) => {
    if(err) { console.error(err); return; }
    console.log("Authenticated UID:", uid);
    
    // Fetch Sale Orders
    objectClient.methodCall('execute_kw', [DB, uid, API_KEY, 'sale.order', 'search_read', [[]], {fields: ['name', 'team_id'], limit: 10}], (err, result) => {
        if(err) console.error("Sale error:", err);
        else console.log("Sale Orders:", result);
    });

    // Fetch POS Orders
    objectClient.methodCall('execute_kw', [DB, uid, API_KEY, 'pos.order', 'search_read', [[]], {fields: ['name', 'session_id'], limit: 10}], (err, result) => {
        if(err) console.error("POS error:", err);
        else console.log("POS Orders:", result);
    });
});
