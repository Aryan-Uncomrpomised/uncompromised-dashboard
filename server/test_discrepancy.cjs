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
        ['account_id', 'in', [81]], // 200110 only
        ['parent_state', '=', 'posted']
      ]
    ], {
      fields: ['id', 'date', 'debit', 'credit', 'move_name', 'ref'],
      limit: 20000
    });

    let totalOdoo = 0;
    
    const start = new Date('2026-04-01T00:00:00');
    // Mimic the frontend timezone handling
    
    let totalFrontend = 0;
    
    moveLines.forEach(line => {
      const net = (line.credit || 0) - (line.debit || 0);
      
      // Odoo exact date matching (what the P&L does)
      if (line.date >= '2026-04-01' && line.date <= '2026-07-03') {
        totalOdoo += net;
      }
      
      // Frontend logic
      const dateStr = line.date ? `${line.date} 12:00:00` : '';
      const orderDate = new Date(dateStr);
      const frontendStart = new Date('2026-04-01');
      frontendStart.setHours(0, 0, 0, 0);
      const frontendEnd = new Date('2026-07-03'); // Assuming it evaluated to today
      frontendEnd.setHours(23, 59, 59, 999);
      
      if (orderDate >= frontendStart && orderDate <= frontendEnd) {
        totalFrontend += net;
      } else {
        if (line.date >= '2026-04-01' && line.date <= '2026-07-03') {
          console.log(`Line ${line.id} on ${line.date} excluded by frontend! orderDate:`, orderDate);
        }
      }
    });

    console.log('Odoo total (2026-04-01 to 2026-07-03):', totalOdoo);
    console.log('Frontend total (same range):', totalFrontend);
    
    // Also check total without end date constraint
    let totalNoEnd = 0;
    moveLines.forEach(line => {
      const net = (line.credit || 0) - (line.debit || 0);
      const dateStr = line.date ? `${line.date} 12:00:00` : '';
      const orderDate = new Date(dateStr);
      const frontendStart = new Date('2026-04-01');
      frontendStart.setHours(0, 0, 0, 0);
      if (orderDate >= frontendStart) {
        totalNoEnd += net;
      }
    });
    console.log('Frontend total (No end date):', totalNoEnd);

  } catch (err) {
    console.error(err);
  }
}
test();
