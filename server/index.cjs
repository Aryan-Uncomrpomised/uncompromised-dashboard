const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db.cjs');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB connection
let db;

// Middleware to ensure DB is connected
const ensureDB = async (req, res, next) => {
  try {
    if (!db) {
      db = await connectDB();
    }
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
};

app.use('/api', ensureDB);

// Top-level orders
app.get('/api/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {
      account_type: 'income',
      $or: [
        { partner_id_name: null },
        { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
      ]
    };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    const orders = await db.collection('move_lines').aggregate([
      { $match: match },
      {
        $group: {
          _id: '$move_id_id',
          id: { $first: '$move_id_id' },
          name: { $first: '$move_id_name' },
          partner_id_id: { $first: '$partner_id_id' },
          partner_id_name: { $first: '$partner_id_name' },
          date: { $first: '$date' },
          ref: { $first: '$ref' },
          move_name: { $first: '$move_name' },
          credit: { $sum: '$credit' },
          debit: { $sum: '$debit' }
        }
      }
    ]).toArray();
    
    const saleOrdersMap = {};
    const posOrdersMap = {};
    const partnerMap = {};

    orders.forEach(order => {
      const isWebsite = (order.ref || order.move_name || '').toUpperCase().startsWith('S');
      const orderId = order.id;
      const orderName = order.name;
      const partner = order.partner_id_id ? [order.partner_id_id, order.partner_id_name] : null;

      if (order.partner_id_id) {
        partnerMap[order.partner_id_id] = { name: order.partner_id_name, city: 'Unknown' };
      }

      const netRevenue = (order.credit || 0) - (order.debit || 0);
      const dateStr = order.date ? `${order.date} 12:00:00` : '';

      if (isWebsite) {
        saleOrdersMap[orderId] = { id: orderId, name: orderName, amount_total: netRevenue, date_order: dateStr, state: 'done', partner_id: partner };
      } else {
        posOrdersMap[orderId] = { id: orderId, name: orderName, amount_total: netRevenue, date_order: dateStr, state: 'paid', partner_id: partner };
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
    const { startDate, endDate } = req.query;
    
    const products = await db.collection('products').find({}).toArray();
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = { name: p.name, category: p.categ_id_name || 'Uncategorized' };
    });

    const match = {
      account_type: 'income',
      $or: [
        { partner_id_name: null },
        { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
      ]
    };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    // Use projection to massively reduce memory footprint
    const lines = await db.collection('move_lines').find(match).project({
      move_id_id: 1, move_id_name: 1,
      product_id_id: 1, product_id_name: 1,
      quantity: 1, credit: 1, debit: 1,
      price_unit: 1, account_id_code: 1,
      date: 1, ref: 1, move_name: 1, _id: 0
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
    const lines = await db.collection('move_lines').find({
      account_type: 'asset_receivable',
      parent_state: 'posted',
      account_id_code: { $ne: 'Trade' },
      $or: [
        { partner_id_name: null },
        { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
      ]
    }).sort({ date_maturity: -1 }).toArray();

    // In-memory lookup for partners to avoid slow aggregation
    const partnerIds = [...new Set(lines.map(l => l.partner_id_id).filter(Boolean))];
    const partners = await db.collection('partners').find({ id: { $in: partnerIds } }).toArray();
    const partnerMap = {};
    partners.forEach(p => {
      partnerMap[p.id] = p.tags;
    });

    // Fetch POC mappings
    const pocList = await db.collection('partner_pocs').find({}).toArray();
    const pocMap = {};
    pocList.forEach(item => {
      if (item.partner_name) {
        pocMap[item.partner_name.trim().toLowerCase()] = item.poc;
      }
    });

    const formattedLines = lines.map(line => {
      const pName = line.partner_id_name || '';
      return {
        id: line.id,
        name: line.name,
        date: line.date,
        date_maturity: line.date_maturity,
        partner_id: line.partner_id_id ? [line.partner_id_id, line.partner_id_name] : null,
        partner_tags: partnerMap[line.partner_id_id] || null,
        poc: pocMap[pName.trim().toLowerCase()] || '',
        amount_residual: line.amount_residual,
        debit: line.debit,
        credit: line.credit,
        move_name: line.move_name,
        move_id: line.move_id_id ? [line.move_id_id, line.move_id_name] : null
      };
    });

    res.json({ lines: formattedLines });
  } catch (err) {
    console.error('Error fetching receivables:', err);
    res.status(500).json({ error: err.message });
  }
});

// Spoilage
app.get('/api/spoilage', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {
      account_type: 'income',
      parent_state: 'posted',
      partner_id_name: { $in: ['Beyond Zero Farms LLP MSME', 'Spoilage  Pilferage', 'Spoilage Decay', 'Spoilage Sorting'] }
    };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }
    const lines = await db.collection('move_lines').find(match).sort({ date: -1 }).toArray();

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
        value: (line.quantity * factor) * line.price_unit,
        bill_ref: line.move_id_name || 'N/A'
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
    const { startDate, endDate } = req.query;
    const match = { price_unit: 0 };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }
    const lines = await db.collection('vendor_bills').find(match).sort({ date: -1 }).toArray();
    res.json({ lines });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Partner POC Mappings
app.get('/api/partner-pocs', async (req, res) => {
  try {
    const list = await db.collection('partner_pocs').find({}).sort({ partner_name: 1 }).toArray();
    res.json({ list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/partner-pocs', async (req, res) => {
  try {
    const { partner_name, poc } = req.body;
    if (!partner_name) return res.status(400).json({ error: 'partner_name is required' });
    
    await db.collection('partner_pocs').updateOne(
      { partner_name: partner_name.trim() },
      { $set: { partner_name: partner_name.trim(), poc: (poc || '').trim() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/partner-pocs/bulk', async (req, res) => {
  try {
    const { mappings } = req.body;
    if (!Array.isArray(mappings)) return res.status(400).json({ error: 'mappings array is required' });

    for (const item of mappings) {
      if (item.partner_name) {
        await db.collection('partner_pocs').updateOne(
          { partner_name: item.partner_name.trim() },
          { $set: { partner_name: item.partner_name.trim(), poc: (item.poc || '').trim() } },
          { upsert: true }
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/partner-pocs/unmapped', async (req, res) => {
  try {
    const partnersInReceivables = await db.collection('move_lines').distinct('partner_id_name', {
      account_type: 'asset_receivable',
      parent_state: 'posted',
      partner_id_name: { $ne: null }
    });

    const mappedList = await db.collection('partner_pocs').find({}).toArray();
    const mappedNames = new Set(mappedList.map(item => item.partner_name.trim().toLowerCase()));

    const unmapped = partnersInReceivables
      .filter(name => name && name !== 'Beyond Zero Farms LLP - Others MSME' && !mappedNames.has(name.trim().toLowerCase()))
      .sort();

    res.json({ unmapped });
  } catch (err) {
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
