const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db.cjs');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB connection
let db;
connectDB().then(database => {
  db = database;
}).catch(console.error);

// Middleware to ensure DB is connected
const ensureDB = (req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connecting, please try again' });
  }
  next();
};

app.use('/api', ensureDB);

// Top-level orders
app.get('/api/sales', async (req, res) => {
  try {
    const lines = await db.collection('move_lines').find({
      account_type: 'income',
      $or: [
        { partner_id_name: null },
        { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
      ]
    }).toArray();
    
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
app.get('/api/sales-lines', async (req, res) => {
  try {
    const products = await db.collection('products').find({}).toArray();
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = { name: p.name, category: p.categ_id_name || 'Uncategorized' };
    });

    const lines = await db.collection('move_lines').find({
      account_type: 'income',
      $or: [
        { partner_id_name: null },
        { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
      ]
    }).toArray();
    
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
        account_code: line.account_id_code,
        date: line.date
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
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await db.collection('products').find({ type: 'product' }).toArray();
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
app.get('/api/receivables', async (req, res) => {
  try {
    // Equivalent to:
    // SELECT ml.*, p.tags as partner_tags FROM move_lines ml LEFT JOIN partners p ON ml.partner_id_id = p.id
    const lines = await db.collection('move_lines').aggregate([
      {
        $match: {
          account_type: 'asset_receivable',
          parent_state: 'posted',
          account_id_code: { $ne: 'Trade' },
          $or: [
            { partner_id_name: null },
            { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
          ]
        }
      },
      {
        $lookup: {
          from: 'partners',
          localField: 'partner_id_id',
          foreignField: 'id',
          as: 'partner_info'
        }
      },
      {
        $unwind: {
          path: '$partner_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          partner_tags: '$partner_info.tags'
        }
      },
      {
        $sort: { date_maturity: -1 }
      }
    ]).toArray();

    const formattedLines = lines.map(line => ({
      id: line.id,
      name: line.name,
      date: line.date,
      date_maturity: line.date_maturity,
      partner_id: line.partner_id_id ? [line.partner_id_id, line.partner_id_name] : null,
      partner_tags: line.partner_tags,
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

// Spoilage
app.get('/api/spoilage', async (req, res) => {
  try {
    const lines = await db.collection('move_lines').find({
      account_type: 'income',
      parent_state: 'posted',
      partner_id_name: { $in: ['Beyond Zero Farms LLP MSME', 'Spoilage  Pilferage', 'Spoilage Decay', 'Spoilage Sorting'] }
    }).sort({ date: -1 }).toArray();

    const processedLines = lines.map(line => {
      let factor = 1;
      if (line.product_id_name) {
        const variantMatch = line.product_id_name.match(/\((.*?)\)$/);
        if (variantMatch) {
          const variant = variantMatch[1].toLowerCase().replace(/\s/g, '');
          if (variant.includes('kg')) {
            const num = parseFloat(variant.replace(/[^\d.]/g, ''));
            if (!isNaN(num)) factor = num;
          } else if (variant.includes('g') || variant.includes('gm') || variant.includes('gms')) {
            const num = parseFloat(variant.replace(/[^\d.]/g, ''));
            if (!isNaN(num)) factor = num / 1000;
          }
        }
      }
      return {
        date: line.date,
        partner: line.partner_id_name,
        product: line.product_id_name,
        farm: line.farm,
        revised_qty: line.quantity * factor,
        value: (line.quantity * factor) * line.price_unit
      };
    });

    res.json({ lines: processedLines });
  } catch (err) {
    console.error('Error fetching spoilage:', err);
    res.status(500).json({ error: err.message });
  }
});

// Produce
app.get('/api/produce', async (req, res) => {
  try {
    const lines = await db.collection('vendor_bills').find({}).sort({ date: -1 }).toArray();
    res.json({ lines });
  } catch (err) {
    console.error('Error fetching produce bills:', err);
    res.status(500).json({ error: err.message });
  }
});

const path = require('path');

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Odoo proxy server running on port ${PORT} (MongoDB backed)`));

module.exports = app;
