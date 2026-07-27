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

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.collection('users').findOne({ 
      username: username.trim().toLowerCase() 
    });

    if (user && user.password === password) {
      return res.json({ 
        success: true, 
        user: { 
          username: user.username, 
          role: user.role || 'admin' 
        } 
      });
    }

    return res.status(401).json({ error: 'Invalid username or password' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await db.collection('users').findOne({ username: cleanUsername });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = {
      username: cleanUsername,
      password: password,
      role: role || 'admin',
      created_at: new Date().toISOString()
    };

    await db.collection('users').insertOne(newUser);
    res.json({ 
      success: true, 
      user: { 
        username: newUser.username, 
        role: newUser.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
      partner_id_name: 1,
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
        partner_name: line.partner_id_name,
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
    const products = await db.collection('products').find({}).toArray();
    const formatted = products.map(p => ({
      id: p.id,
      name: p.name,
      categ_id: p.categ_id_id ? [p.categ_id_id, p.categ_id_name] : null,
      qty_available: p.qty_available || 0,
      virtual_available: p.virtual_available || 0,
      standard_price: p.standard_price || 0,
      list_price: p.list_price || 0
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Opening Stock calculation
app.get('/api/inventory/opening-stock', async (req, res) => {
  try {
    const { startDate } = req.query;
    if (!startDate) {
      return res.json({ openingStocks: {} });
    }

    // 1. Fetch current live inventory from products
    const products = await db.collection('products').find({
      name: { $regex: /_[pP]\s*$/ }
    }).toArray();

    const cropMap = {};
    products.forEach(p => {
      const cleanName = cleanProductName(p.name);
      if (!cropMap[cleanName]) {
        cropMap[cleanName] = {
          liveInventory: 0,
          salesAfterStart: 0,
          harvestAfterStart: 0,
          spoilageAfterStart: 0
        };
      }
      cropMap[cleanName].liveInventory += (p.qty_available || 0);
    });

    // 2. Fetch sales from startDate to today
    const salesLines = await db.collection('move_lines').find({
      account_type: 'income',
      date: { $gte: startDate },
      $or: [
        { partner_id_name: null },
        { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
      ]
    }).project({ product_id_name: 1, quantity: 1, credit: 1, debit: 1 }).toArray();

    salesLines.forEach(line => {
      const cleanName = cleanProductName(line.product_id_name);
      if (cropMap[cleanName]) {
        const netRevenue = (line.credit || 0) - (line.debit || 0);
        if (netRevenue > 0) {
          cropMap[cleanName].salesAfterStart += (line.quantity || 0);
        }
      }
    });

    // 3. Fetch harvest from startDate to today
    const produceLines = await db.collection('vendor_bills').find({
      date: { $gte: startDate }
    }).project({ product_name: 1, product_new: 1, qty_purchased: 1 }).toArray();

    produceLines.forEach(line => {
      const cleanName = cleanProductName(line.product_new || line.product_name);
      if (cropMap[cleanName]) {
        cropMap[cleanName].harvestAfterStart += (line.qty_purchased || 0);
      }
    });

    // 4. Fetch spoilage from startDate to today
    const spoilageLines = await db.collection('move_lines').find({
      account_type: 'income',
      parent_state: 'posted',
      partner_id_name: { $in: ['Beyond Zero Farms LLP MSME', 'Spoilage  Pilferage', 'Spoilage Decay', 'Spoilage Sorting'] },
      date: { $gte: startDate }
    }).project({ product_id_name: 1, quantity: 1 }).toArray();

    spoilageLines.forEach(line => {
      const cleanName = cleanProductName(line.product_id_name);
      if (cropMap[cleanName]) {
        cropMap[cleanName].spoilageAfterStart += (line.quantity || 0);
      }
    });

    // Calculate opening stock: Opening = Live - Harvest + Sales + Spoilage
    const openingStocks = {};
    Object.keys(cropMap).forEach(cleanName => {
      const { liveInventory, salesAfterStart, harvestAfterStart, spoilageAfterStart } = cropMap[cleanName];
      const opening = liveInventory - harvestAfterStart + salesAfterStart + spoilageAfterStart;
      openingStocks[cleanName] = opening;
    });

    res.json({ openingStocks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock Quants
app.get('/api/stock-quants', async (req, res) => {
  try {
    const quants = await db.collection('stock_quants').find({}).toArray();
    res.json(quants);
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
    const match = {};
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

// --- Daily Stock Upload & Notifications ---

const cleanProductName = (rawName) => {
  if (!rawName) return 'Unknown Product';
  let clean = String(rawName).trim();
  
  // Remove SKU prefix like "[179.1] " or "[179]" at the beginning only
  clean = clean.replace(/^\[[^\]]+\]\s*/, '');
  
  // Remove trailing _P suffix used in some backend systems
  clean = clean.replace(/_P$/, '').trim();
  
  // Remove packaging sizes like (1kg), (500g), etc.
  clean = clean.replace(/\(\s*\d+(\.\d+)?\s*(kg|g|gm|pc|pcs)\s*\)/ig, '').trim();
  
  // Remove packaging sizes without parenthesis like 500 gms, 500g, 1 kg, etc.
  clean = clean.replace(/\d+(\.\d+)?\s*(kg|g|gm|gms|pc|pcs)\b/ig, '').trim();
  
  // Strip Hindi translations after slash (e.g. "Okra (Bhindi)/भिंडी" -> "Okra (Bhindi)")
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts[0].trim().length > 0) {
      clean = parts[0].trim();
    } else if (parts.length > 1) {
      clean = parts[1].trim(); // Fallback if it was just "/बैंगन"
    }
  }
  
  // Remove all parenthesis brackets ( and ) to keep product names clean and uncluttered
  clean = clean.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();

  // Translate specific Hindi crop names to English
  const cleanLower = clean.toLowerCase().trim();
  if (
    cleanLower === 'बैंगन' || 
    cleanLower === 'बैगन' || 
    cleanLower === 'baingan' || 
    cleanLower === 'baigan' ||
    cleanLower.includes('baingan') ||
    cleanLower.includes('brinjal')
  ) {
    return 'Brinjal Eggplant';
  }
  
  return clean || 'Unknown Product';
};

app.get('/api/stock-upload/template', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const products = await db.collection('products').find({
      name: { $regex: /_[pP]\s*$/ }
    }).toArray();
    
    const pCrops = products.map(p => String(p.name || '').trim());
    
    // Combine with default master crops (using Odoo _P template names) to guarantee list completeness
    const defaultMasterCrops = [
      'Wheat_P', 
      'Peas_P', 
      'Hybrid Tomato_P', 
      'Brown Chana_P', 
      'Okra Bhindi_P', 
      'Brinjal Normal [Baingan]/बैंगन_P'
    ];
    
    const uniqueCrops = Array.from(new Set([...pCrops, ...defaultMasterCrops]))
      .filter(Boolean)
      .sort();
    
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Stock Input');
    const wsList = wb.addWorksheet('CropsList');
    
    // Hide CropsList sheet to keep the template clean
    wsList.state = 'hidden';
    
    // Write crops to CropsList sheet for Excel validation reference
    uniqueCrops.forEach((crop, idx) => {
      wsList.getCell(`A${idx + 1}`).value = crop;
    });
    
    // Set headers
    ws.getCell('A1').value = 'Product';
    ws.getCell('B1').value = 'TFS/Stock';
    ws.getCell('C1').value = 'SYGR/Stock';
    ws.getCell('D1').value = 'SYGC/Stock';
    ws.getCell('E1').value = 'Uom';
    
    // Style headers
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEFEFEF' }
    };
    
    // Keep rows 2 to 200 blank, prefill B, C, D with 0 and UOM with 'Kg' for convenience
    for (let i = 2; i <= 200; i++) {
      ws.getCell(`B${i}`).value = 0;
      ws.getCell(`C${i}`).value = 0;
      ws.getCell(`D${i}`).value = 0;
      ws.getCell(`E${i}`).value = 'Kg';
    }
    
    // Set column widths
    ws.getColumn(1).width = 35;
    ws.getColumn(2).width = 15;
    ws.getColumn(3).width = 15;
    ws.getColumn(4).width = 15;
    ws.getColumn(5).width = 15;
    
    // Add data validations (dropdown lists)
    ws.dataValidations.add('A2:A200', {
      type: 'list',
      allowBlank: true,
      formulae: [`CropsList!$A$1:$A$${uniqueCrops.length}`],
      showErrorMessage: true,
      errorTitle: 'Invalid Crop Name',
      error: 'Please choose a crop name from the dropdown list.'
    });
    
    ws.dataValidations.add('E2:E200', {
      type: 'list',
      allowBlank: true,
      formulae: ['"Kg,L"']
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=daily_stock_template.xlsx');
    
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock-upload', async (req, res) => {
  try {
    const { date, base64File } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!base64File) return res.status(400).json({ error: 'Base64 Excel data is required' });
    
    const ExcelJS = require('exceljs');
    const buffer = Buffer.from(base64File, 'base64');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.getWorksheet('Stock Input') || wb.getWorksheet(1);
    
    const items = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      
      const productCell = row.getCell(1).value;
      const tfsCell = row.getCell(2).value;
      const sygrCell = row.getCell(3).value;
      const sygcCell = row.getCell(4).value;
      const uomCell = row.getCell(5).value;
      
      let product = '';
      if (productCell && typeof productCell === 'object') {
        product = productCell.richText ? productCell.richText.map(t => t.text).join('') : (productCell.text || '');
      } else {
        product = String(productCell || '').trim();
      }
      
      let tfs = parseFloat(tfsCell);
      if (isNaN(tfs)) tfs = 0;
      
      let sygr = parseFloat(sygrCell);
      if (isNaN(sygr)) sygr = 0;
      
      let sygc = parseFloat(sygcCell);
      if (isNaN(sygc)) sygc = 0;
      
      const uom = String(uomCell || 'Kg').trim();
      
      if (product) {
        items.push({
          product: cleanProductName(product),
          tfs,
          sygr,
          sygc,
          qty: tfs + sygr + sygc,
          uom
        });
      }
    });
    
    await db.collection('manual_stock_uploads').updateOne(
      { date },
      { 
        $set: { 
          date, 
          uploaded_at: new Date().toISOString(),
          items 
        } 
      },
      { upsert: true }
    );
    
    res.json({ message: 'Stock uploaded successfully', count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock-upload/history', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }
    
    const history = await db.collection('manual_stock_uploads').find(match).sort({ date: -1 }).toArray();
    
    const allCropsSet = new Set();
    history.forEach(upload => {
      upload.items.forEach(item => {
        allCropsSet.add(item.product);
      });
    });
    const cropsList = Array.from(allCropsSet).sort();
    
    res.json({ list: history, crops: cropsList });
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
