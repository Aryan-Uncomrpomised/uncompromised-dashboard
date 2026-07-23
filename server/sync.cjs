const xmlrpc = require('xmlrpc');
const { connectDB, client } = require('./db.cjs');
const { UOM_RATIO, FARM_CODE_MAPPING } = require('./produceMappings.cjs');

const ODOO_HOST = process.env.ODOO_HOST || 'simplability.odoo.com';
const DB = process.env.ODOO_DB || 'simplability';
const USERNAME = process.env.ODOO_USERNAME || 'finance@uncompromised.in';
const API_KEY = process.env.ODOO_API_KEY || '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

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

async function syncSales(db) {
  console.log('Syncing Sales & Spoilage...');
  const accountIds = [81, 82, 1270];

  const moveLines = await executeKw('account.move.line', 'search_read', [
    [
      ['account_id', 'in', accountIds],
      ['parent_state', '=', 'posted']
    ]
  ], {
    fields: ['id', 'name', 'ref', 'move_id', 'move_name', 'product_id', 'quantity', 'price_unit', 'debit', 'credit', 'date', 'partner_id', 'account_id', 'analytic_distribution'],
    limit: 100000,
    order: 'date desc'
  });

  await db.collection('move_lines').deleteMany({ account_type: 'income' });

  const partnerOps = [];
  const lineOps = moveLines.map(line => {
    const pId = line.partner_id ? line.partner_id[0] : null;
    const pName = line.partner_id ? line.partner_id[1] : null;
    if (pId) {
      partnerOps.push({
        updateOne: {
          filter: { id: pId },
          update: { $setOnInsert: { id: pId, name: pName, city: 'Unknown', tags: null } },
          upsert: true
        }
      });
    }

    const mId = line.move_id ? line.move_id[0] : null;
    const mName = line.move_id ? line.move_id[1] : null;
    const prId = line.product_id ? line.product_id[0] : null;
    const prName = line.product_id ? line.product_id[1] : null;
    const aId = line.account_id ? line.account_id[0] : null;
    const aCode = line.account_id ? line.account_id[1].split(' ')[0] : null;
    
    let farm = null;
    if (line.analytic_distribution) {
      const keys = Object.keys(line.analytic_distribution);
      if (keys.length > 0) {
        const analyticCode = keys[0].replace(/,/g, '');
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

    return {
      insertOne: {
        document: {
          id: line.id,
          name: line.name || '',
          ref: line.ref || '',
          move_id_id: mId,
          move_id_name: mName,
          move_name: line.move_name || '',
          product_id_id: prId,
          product_id_name: prName,
          quantity: line.quantity || 0,
          price_unit: line.price_unit || 0,
          debit: line.debit || 0,
          credit: line.credit || 0,
          amount_residual: 0,
          date: line.date || '',
          date_maturity: '',
          partner_id_id: pId,
          partner_id_name: pName,
          account_id_id: aId,
          account_id_code: aCode,
          reconciled: 0,
          parent_state: 'posted',
          account_type: 'income',
          farm: farm
        }
      }
    };
  });

  if (partnerOps.length > 0) await db.collection('partners').bulkWrite(partnerOps);
  if (lineOps.length > 0) await db.collection('move_lines').bulkWrite(lineOps);

  console.log(`Synced ${moveLines.length} income lines.`);
}

async function syncReceivables(db) {
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

  await db.collection('move_lines').deleteMany({ account_type: 'asset_receivable' });

  const partnerOps = [];
  const lineOps = moveLines.map(line => {
    const pId = line.partner_id ? line.partner_id[0] : null;
    const pName = line.partner_id ? line.partner_id[1] : null;
    if (pId) {
      partnerOps.push({
        updateOne: {
          filter: { id: pId },
          update: { $setOnInsert: { id: pId, name: pName, city: 'Unknown', tags: null } },
          upsert: true
        }
      });
    }

    const mId = line.move_id ? line.move_id[0] : null;
    const mName = line.move_id ? line.move_id[1] : null;
    const aId = line.account_id ? line.account_id[0] : null;
    const aCode = line.account_id ? line.account_id[1].split(' ')[0] : null;

    return {
      insertOne: {
        document: {
          id: line.id,
          name: line.name || '',
          ref: '',
          move_id_id: mId,
          move_id_name: mName,
          move_name: line.move_name || '',
          product_id_id: null,
          product_id_name: null,
          quantity: 0,
          price_unit: 0,
          debit: line.debit || 0,
          credit: line.credit || 0,
          amount_residual: line.amount_residual || 0,
          date: line.date || '',
          date_maturity: line.date_maturity || '',
          partner_id_id: pId,
          partner_id_name: pName,
          account_id_id: aId,
          account_id_code: aCode,
          reconciled: 0,
          parent_state: line.parent_state || 'posted',
          account_type: 'asset_receivable',
          farm: null
        }
      }
    };
  });

  if (partnerOps.length > 0) await db.collection('partners').bulkWrite(partnerOps);
  if (lineOps.length > 0) await db.collection('move_lines').bulkWrite(lineOps);

  console.log(`Synced ${moveLines.length} receivable lines.`);
}

async function syncProducts(db) {
  console.log('Syncing Products & Inventory...');
  const products = await executeKw('product.template', 'search_read', [[]], {
    fields: ['name', 'categ_id', 'qty_available', 'virtual_available', 'type', 'standard_price', 'list_price'],
    limit: 10000
  });

  await db.collection('products').deleteMany({});

  const ops = products.map(p => {
    const cId = p.categ_id ? p.categ_id[0] : null;
    const cName = p.categ_id ? p.categ_id[1] : 'Uncategorized';
    return {
      insertOne: {
        document: {
          id: p.id,
          name: p.name || '',
          categ_id_id: cId,
          categ_id_name: cName,
          qty_available: p.qty_available || 0,
          virtual_available: p.virtual_available || 0,
          type: p.type || '',
          standard_price: p.standard_price || 0,
          list_price: p.list_price || 0
        }
      }
    };
  });

  if (ops.length > 0) await db.collection('products').bulkWrite(ops);
  console.log(`Synced ${products.length} products.`);
}

async function syncVendorBills(db) {
  console.log('Syncing Vendor Bills (Produce)...');
  const bills = await executeKw('account.move.line', 'search_read', [
    [
      ['parent_state', '=', 'posted'],
      ['move_id.move_type', 'in', ['in_invoice', 'in_receipt', 'in_refund']],
      ['partner_id.name', 'in', ['Beyond Zero Farms LLP MSME', 'UF Processing', 'Market produce-MANDI']],
      ['display_type', '=', 'product']
    ]
  ], {
    fields: ['ref', 'name', 'date', 'move_id', 'partner_id', 'product_id', 'account_id', 'quantity', 'product_uom_id', 'price_unit', 'discount', 'price_total', 'analytic_distribution', 'parent_state'],
    limit: 50000,
    order: 'date desc'
  });

  // Fetch true Bill Date (invoice_date) from account.move instead of Accounting Date (date)
  const moveIds = [...new Set(bills.map(b => b.move_id ? b.move_id[0] : null).filter(Boolean))];
  let moveDates = {};
  if (moveIds.length > 0) {
    const moves = await executeKw('account.move', 'search_read', [
      [['id', 'in', moveIds]]
    ], {
      fields: ['id', 'invoice_date']
    });
    moves.forEach(m => {
      if (m.invoice_date) moveDates[m.id] = m.invoice_date;
    });
  }

  await db.collection('vendor_bills').deleteMany({});

  const ops = [];
  for (const line of bills) {
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
    
    let analyticCode = null;
    let farm = null;
    if (line.analytic_distribution) {
      const keys = Object.keys(line.analytic_distribution);
      if (keys.length > 0) {
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

    const ratio = uomName && UOM_RATIO[uomName] ? UOM_RATIO[uomName] : 1;
    const qtyPurchased = (line.quantity || 0) * ratio;

    const mId = line.move_id ? line.move_id[0] : null;
    const billDate = (mId && moveDates[mId]) ? moveDates[mId] : line.date;

    ops.push({
      insertOne: {
        document: {
          id: line.id,
          ref: line.ref || line.name || '',
          bill_name: line.move_id ? line.move_id[1] : 'N/A',
          date: billDate || '',
          partner_id: pId,
          partner_name: pName,
          product_id: prodId,
          product_name: prodName,
          product_new: productNew,
          account_id: aId,
          account_name: aName,
          quantity: line.quantity || 0,
          uom_name: uomName,
          price_unit: line.price_unit || 0,
          discount: line.discount || 0,
          amount_total: line.price_total || 0,
          analytic_code: analyticCode,
          farm: farm,
          qty_purchased: qtyPurchased,
          parent_state: line.parent_state || 'posted'
        }
      }
    });
  }

  if (ops.length > 0) await db.collection('vendor_bills').bulkWrite(ops);
  console.log(`Synced ${bills.length} vendor bill lines.`);
}

async function syncPartners(db) {
  console.log('Syncing Partners & Tags...');
  
  const categories = await executeKw('res.partner.category', 'search_read', [[]], {
    fields: ['id', 'name'],
    limit: 5000
  });
  
  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.id] = c.name;
  });

  const partners = await executeKw('res.partner', 'search_read', [[['active', '=', true]]], {
    fields: ['id', 'name', 'city', 'category_id'],
    limit: 10000
  });

  const ops = partners.map(partner => {
    let tags = null;
    if (partner.category_id && partner.category_id.length > 0) {
      tags = partner.category_id.map(id => categoryMap[id] || '').filter(Boolean).join(', ');
    }
    return {
      updateOne: {
        filter: { id: partner.id },
        update: { $set: {
          id: partner.id,
          name: partner.name || '',
          city: partner.city || '',
          tags: tags || null
        }},
        upsert: true
      }
    };
  });

  if (ops.length > 0) await db.collection('partners').bulkWrite(ops);
  console.log(`Synced ${partners.length} partners.`);
}

async function syncStockQuants(db) {
  console.log('Syncing Stock Quants by Location...');
  const targetLocationIds = [8, 254, 246, 218];
  const quants = await executeKw('stock.quant', 'search_read', [
    [['location_id', 'in', targetLocationIds], ['quantity', '>', 0]]
  ], {
    fields: ['product_id', 'location_id', 'quantity'],
    limit: 50000
  });

  await db.collection('stock_quants').deleteMany({});

  const ops = quants.map(q => {
    return {
      insertOne: {
        document: {
          id: q.id,
          product_id: q.product_id ? q.product_id[0] : null,
          product_name: q.product_id ? q.product_id[1] : '',
          location_id: q.location_id ? q.location_id[0] : null,
          location_name: q.location_id ? q.location_id[1] : '',
          quantity: q.quantity || 0
        }
      }
    };
  });

  if (ops.length > 0) await db.collection('stock_quants').bulkWrite(ops);
  console.log(`Synced ${quants.length} stock quants.`);
}

async function runSync() {
  console.log(`\n[${new Date().toISOString()}] Starting Odoo background sync...`);
  try {
    const db = await connectDB();
    await syncPartners(db);
    await syncProducts(db);
    await syncSales(db);
    await syncReceivables(db);
    await syncVendorBills(db);
    await syncStockQuants(db);
    console.log(`[${new Date().toISOString()}] Sync complete.`);
  } catch (err) {
    console.error('Error during sync:', err);
  } finally {
    if (require.main === module && client) {
      // If we run as a script, close the connection when done
      await client.close();
    }
  }
}

// If run directly via node sync.cjs
if (require.main === module) {
  runSync();
}

module.exports = { runSync };
