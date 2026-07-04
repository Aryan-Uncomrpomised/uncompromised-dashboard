const xmlrpc = require('xmlrpc');
const db = require('./db.cjs');
const { UOM_RATIO, FARM_CODE_MAPPING } = require('./produceMappings.cjs');

const ODOO_HOST = 'simplability.odoo.com';
const DB = 'simplability';
const USERNAME = 'finance@uncompromised.in';
const API_KEY = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

const commonClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/common' });
const objectClient = xmlrpc.createSecureClient({ host: ODOO_HOST, port: 443, path: '/xmlrpc/2/object' });

let currentUid = null;

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

// Prepared statements for SQLite
const insertMoveLine = db.prepare(`
  INSERT OR REPLACE INTO move_lines (
    id, name, ref, move_id_id, move_id_name, move_name, product_id_id, product_id_name,
    quantity, price_unit, debit, credit, amount_residual, date, date_maturity,
    partner_id_id, partner_id_name, account_id_id, account_id_code, reconciled, parent_state, account_type
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

const insertVendorBill = db.prepare(`
  INSERT OR REPLACE INTO vendor_bills (
    id, ref, date, partner_id, partner_name, product_id, product_name, product_new,
    account_id, account_name, quantity, uom_name, price_unit, discount, amount_total,
    analytic_code, farm, qty_purchased, parent_state
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products (
    id, name, categ_id_id, categ_id_name, qty_available, virtual_available, type
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertPartner = db.prepare(`
  INSERT OR REPLACE INTO partners (id, name, city) VALUES (?, ?, ?)
`);

async function syncSales() {
  console.log('Syncing Sales & Income...');
  const accountIds = [81, 82, 1270]; // Produce, Experiences, Learning

  const moveLines = await executeKw('account.move.line', 'search_read', [
    [
      ['account_id', 'in', accountIds],
      ['parent_state', '=', 'posted']
    ]
  ], {
    fields: ['id', 'name', 'ref', 'move_id', 'move_name', 'product_id', 'quantity', 'price_unit', 'debit', 'credit', 'date', 'partner_id', 'account_id'],
    limit: 100000,
    order: 'date desc'
  });

  const insertMany = db.transaction((lines) => {
    db.exec("DELETE FROM move_lines WHERE account_type = 'income'");
    for (const line of lines) {
      const pId = line.partner_id ? line.partner_id[0] : null;
      const pName = line.partner_id ? line.partner_id[1] : null;
      if (pId) insertPartner.run(pId, pName, 'Unknown'); // We don't have city in this query

      const mId = line.move_id ? line.move_id[0] : null;
      const mName = line.move_id ? line.move_id[1] : null;
      const prId = line.product_id ? line.product_id[0] : null;
      const prName = line.product_id ? line.product_id[1] : null;
      const aId = line.account_id ? line.account_id[0] : null;
      const aCode = line.account_id ? line.account_id[1].split(' ')[0] : null;

      insertMoveLine.run(
        line.id, line.name || '', line.ref || '', mId, mName, line.move_name || '', prId, prName,
        line.quantity || 0, line.price_unit || 0, line.debit || 0, line.credit || 0, 0, // amount_residual=0 for income
        line.date || '', '', pId, pName, aId, aCode, 0, 'posted', 'income'
      );
    }
  });

  insertMany(moveLines);
  console.log(`Synced ${moveLines.length} income lines.`);
}

async function syncReceivables() {
  console.log('Syncing Receivables...');
  const accounts = await executeKw('account.account', 'search_read', [
    [['account_type', '=', 'asset_receivable']]
  ], { fields: ['id', 'name', 'code'] });
  
  if (!accounts || accounts.length === 0) return;
  const accountIds = accounts.map(a => a.id);

  const moveLines = await executeKw('account.move.line', 'search_read', [
    [
      ['account_id', 'in', accountIds],
      ['reconciled', '=', false],
      ['amount_residual', '!=', 0]
    ]
  ], {
    fields: ['id', 'name', 'date', 'date_maturity', 'partner_id', 'amount_residual', 'debit', 'credit', 'move_name', 'move_id', 'account_id', 'parent_state'],
    limit: 50000,
    order: 'date_maturity desc'
  });

  const insertMany = db.transaction((lines) => {
    db.exec("DELETE FROM move_lines WHERE account_type = 'asset_receivable'");
    for (const line of lines) {
      const pId = line.partner_id ? line.partner_id[0] : null;
      const pName = line.partner_id ? line.partner_id[1] : null;
      if (pId) insertPartner.run(pId, pName, 'Unknown');

      const mId = line.move_id ? line.move_id[0] : null;
      const mName = line.move_id ? line.move_id[1] : null;
      const aId = line.account_id ? line.account_id[0] : null;
      const aCode = line.account_id ? line.account_id[1].split(' ')[0] : null;

      insertMoveLine.run(
        line.id, line.name || '', '', mId, mName, line.move_name || '', null, null,
        0, 0, line.debit || 0, line.credit || 0, line.amount_residual || 0,
        line.date || '', line.date_maturity || '', pId, pName, aId, aCode, 0, line.parent_state || 'posted', 'asset_receivable'
      );
    }
  });

  insertMany(moveLines);
  console.log(`Synced ${moveLines.length} receivable lines.`);
}

async function syncProducts() {
  console.log('Syncing Products & Inventory...');
  const products = await executeKw('product.product', 'search_read', [[]], {
    fields: ['name', 'categ_id', 'qty_available', 'virtual_available', 'type'],
    limit: 10000
  });

  const insertMany = db.transaction((prods) => {
    db.exec('DELETE FROM products');
    for (const p of prods) {
      const cId = p.categ_id ? p.categ_id[0] : null;
      const cName = p.categ_id ? p.categ_id[1] : 'Uncategorized';
      insertProduct.run(
        p.id, p.name || '', cId, cName,
        p.qty_available || 0, p.virtual_available || 0, p.type || ''
      );
    }
  });

  insertMany(products);
  console.log(`Synced ${products.length} products.`);
}

async function syncVendorBills() {
  console.log('Syncing Vendor Bills (Produce)...');
  const bills = await executeKw('account.move.line', 'search_read', [
    [
      ['parent_state', '=', 'posted'],
      ['move_id.move_type', 'in', ['in_invoice', 'in_receipt', 'in_refund']],
      ['partner_id.name', 'in', ['Beyond Zero Farms LLP MSME', 'Beyond Zero Farms LLP - Others MSME']]
    ]
  ], {
    fields: ['ref', 'name', 'date', 'partner_id', 'product_id', 'account_id', 'quantity', 'product_uom_id', 'price_unit', 'discount', 'price_total', 'analytic_distribution', 'parent_state'],
    limit: 50000,
    order: 'date desc'
  });

  const insertMany = db.transaction((lines) => {
    db.exec('DELETE FROM vendor_bills');
    for (const line of lines) {
      if (!line.product_id) continue;
      
      const pId = line.partner_id ? line.partner_id[0] : null;
      const pName = line.partner_id ? line.partner_id[1] : null;
      const prodId = line.product_id ? line.product_id[0] : null;
      const prodName = line.product_id ? line.product_id[1] : '';
      
      let productNew = prodName;
      const pos = productNew.indexOf(']');
      if (pos >= 0) productNew = productNew.substring(pos + 1).trim();
      productNew = productNew.replace('_P', '').trim();

      const aId = line.account_id ? line.account_id[0] : null;
      const aName = line.account_id ? line.account_id[1] : null;
      const uomName = line.product_uom_id ? line.product_uom_id[1] : null;
      
      // Analytic Code & Farm mapping
      let analyticCode = null;
      let farm = null;
      if (line.analytic_distribution) {
        // e.g. { '3,14,94,240': 100 }
        const keys = Object.keys(line.analytic_distribution);
        if (keys.length > 0) {
          // Remove commas
          analyticCode = keys[0].replace(/,/g, '');
          farm = FARM_CODE_MAPPING[analyticCode];
          if (!farm) {
            if (analyticCode.startsWith('1710')) farm = 'Unknown/UF 23000/Bloom';
            else if (analyticCode.startsWith('1711') || analyticCode.startsWith('3119')) farm = 'Unknown/UF 23001/Badi';
            else if (analyticCode.startsWith('1712') || analyticCode.startsWith('3129')) farm = 'Unknown/UF 23002/Khadija';
            else if (analyticCode.startsWith('3139')) farm = 'Unknown/UF 23003/Thoor';
            else if (analyticCode.startsWith('3149')) farm = 'Unknown/UF 23004/Gattani';
            else if (analyticCode.startsWith('32994')) farm = 'Unknown/UF 24005/Chandrangan';
            else if (analyticCode.startsWith('318294') || analyticCode.startsWith('318394')) farm = 'Unknown/UF 25007/Sarai (Dabok)';
          }
        }
      }

      // UOM Ratio
      const ratio = uomName && UOM_RATIO[uomName] ? UOM_RATIO[uomName] : 1;
      const qtyPurchased = (line.quantity || 0) * ratio;

      insertVendorBill.run(
        line.id,
        line.ref || line.name || '',
        line.date || '',
        pId, pName,
        prodId, prodName, productNew,
        aId, aName,
        line.quantity || 0,
        uomName,
        line.price_unit || 0,
        line.discount || 0,
        line.price_total || 0,
        analyticCode,
        farm,
        qtyPurchased,
        line.parent_state || 'posted'
      );
    }
  });

  insertMany(bills);
  console.log(`Synced ${bills.length} vendor bill lines.`);
}

async function runSync() {
  console.log(`\n[${new Date().toISOString()}] Starting Odoo background sync...`);
  try {
    await syncProducts();
    await syncSales();
    await syncReceivables();
    await syncVendorBills();
    console.log(`[${new Date().toISOString()}] Sync complete.`);
  } catch (err) {
    console.error('Error during sync:', err);
  }
}

// If run directly via node sync.cjs
if (require.main === module) {
  runSync();
}

module.exports = { runSync };
