const express = require('express');
const cors = require('cors');
const db = require('./db.cjs');

const app = express();
app.use(cors());
app.use(express.json());

// Top-level orders
app.get('/api/sales', (req, res) => {
  try {
    const lines = db.prepare(`SELECT * FROM move_lines WHERE account_type = 'income'`).all();
    
    const saleOrdersMap = {};
    const posOrdersMap = {};
    const partnerMap = {};

    lines.forEach(line => {
      const isWebsite = (line.ref || line.move_name || '').toUpperCase().startsWith('S');
      const orderId = line.move_id_id;
      const orderName = line.move_id_name;
      const partner = line.partner_id_id ? [line.partner_id_id, line.partner_id_name] : null;

      if (line.partner_id_id) {
        partnerMap[line.partner_id_id] = { name: line.partner_id_name, city: 'Unknown' };
      }

      const netRevenue = (line.credit || 0) - (line.debit || 0);
      const dateStr = line.date ? `${line.date} 12:00:00` : '';

      if (isWebsite) {
        if (!saleOrdersMap[orderId]) {
          saleOrdersMap[orderId] = { id: orderId, name: orderName, amount_total: 0, date_order: dateStr, state: 'done', partner_id: partner };
        }
        saleOrdersMap[orderId].amount_total += netRevenue;
      } else {
        if (!posOrdersMap[orderId]) {
          posOrdersMap[orderId] = { id: orderId, name: orderName, amount_total: 0, date_order: dateStr, state: 'paid', partner_id: partner };
        }
        posOrdersMap[orderId].amount_total += netRevenue;
      }
    });

    res.json({
      saleOrders: Object.values(saleOrdersMap),
      posOrders: Object.values(posOrdersMap),
      partnerMap
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detailed Order Lines
app.get('/api/sales-lines', (req, res) => {
  try {
    const products = db.prepare(`SELECT * FROM products`).all();
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = { name: p.name, category: p.categ_id_name || 'Uncategorized' };
    });

    const lines = db.prepare(`SELECT * FROM move_lines WHERE account_type = 'income'`).all();
    
    const saleLines = [];
    const posLines = [];

    lines.forEach(line => {
      const isWebsite = (line.ref || line.move_name || '').toUpperCase().startsWith('S');
      const netRevenue = (line.credit || 0) - (line.debit || 0);

      const formattedLine = {
        order_id: [line.move_id_id, line.move_id_name],
        product_id: [line.product_id_id, line.product_id_name],
        qty: line.quantity,
        product_uom_qty: line.quantity,
        price_subtotal_incl: netRevenue,
        price_subtotal: netRevenue,
        price_unit: line.price_unit,
        account_code: line.account_id_code
      };

      if (isWebsite) {
        saleLines.push(formattedLine);
      } else {
        posLines.push(formattedLine);
      }
    });

    res.json({ saleLines, posLines, productMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory
app.get('/api/inventory', (req, res) => {
  try {
    const products = db.prepare(`SELECT * FROM products WHERE type = 'product'`).all();
    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      categ_id: p.categ_id_id ? [p.categ_id_id, p.categ_id_name] : null,
      qty_available: p.qty_available,
      virtual_available: p.virtual_available
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Receivables
app.get('/api/receivables', (req, res) => {
  try {
    const lines = db.prepare(`
      SELECT * FROM move_lines 
      WHERE account_type = 'asset_receivable' 
      AND parent_state = 'posted'
      AND account_id_code != 'Trade'
      ORDER BY date_maturity DESC
    `).all();

    const formattedLines = lines.map(line => ({
      id: line.id,
      name: line.name,
      date: line.date,
      date_maturity: line.date_maturity,
      partner_id: line.partner_id_id ? [line.partner_id_id, line.partner_id_name] : null,
      amount_residual: line.amount_residual,
      debit: line.debit,
      credit: line.credit,
      move_name: line.move_name,
      move_id: line.move_id_id ? [line.move_id_id, line.move_id_name] : null
    }));

    res.json({ lines: formattedLines });
  } catch (err) {
    console.error('Error fetching receivables:', err);
    res.status(500).json({ error: err.message });
  }
});

// Produce
app.get('/api/produce', (req, res) => {
  try {
    const lines = db.prepare(`
      SELECT * FROM vendor_bills 
      ORDER BY date DESC
    `).all();
    res.json({ lines });
  } catch (err) {
    console.error('Error fetching produce bills:', err);
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = 3001;
  app.listen(PORT, () => console.log(`Odoo proxy server running on port ${PORT} (SQLite backed)`));
}

module.exports = app;
