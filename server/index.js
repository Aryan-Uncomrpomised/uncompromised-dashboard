const express = require('express');
const cors = require('cors');
const xmlrpc = require('xmlrpc');

const app = express();
app.use(cors());
app.use(express.json());

const ODOO_HOST = 'simplability.odoo.com';
const DB = 'simplability';
const USERNAME = 'finance@uncompromised.in';
const API_KEY = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

let currentUid = null;

const commonClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/object' });

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

app.get('/api/sales', async (req, res) => {
  try {
    console.log('Fetching sales data from Odoo...');
    const saleOrders = await executeKw('sale.order', 'search_read', [[]], {
      fields: ['name', 'date_order', 'amount_total', 'state', 'partner_id'],
      limit: 100
    });
    const posOrders = await executeKw('pos.order', 'search_read', [[]], {
      fields: ['name', 'date_order', 'amount_total', 'state', 'partner_id'],
      limit: 100
    });
    console.log(`Fetched ${saleOrders.length} sale orders and ${posOrders.length} POS orders.`);
    res.json({ saleOrders, posOrders });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Odoo proxy server running on port ${PORT}`));
