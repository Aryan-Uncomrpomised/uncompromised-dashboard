const Database = require('better-sqlite3');
const path = require('path');

const isVercel = !!process.env.VERCEL;
const dbPath = path.join(__dirname, 'odoo_cache.db');
const db = new Database(dbPath, { readonly: isVercel });

// Enable WAL mode for better concurrent performance (skip on Vercel since it's read-only)
if (!isVercel) {
  db.pragma('journal_mode = WAL');
}

// Initialize schema
const initDB = () => {
  // Move Lines Table (for sales, pos, and receivables)
  db.exec(`
    CREATE TABLE IF NOT EXISTS move_lines (
      id INTEGER PRIMARY KEY,
      name TEXT,
      ref TEXT,
      move_id_id INTEGER,
      move_id_name TEXT,
      move_name TEXT,
      product_id_id INTEGER,
      product_id_name TEXT,
      quantity REAL,
      price_unit REAL,
      debit REAL,
      credit REAL,
      amount_residual REAL,
      date TEXT,
      date_maturity TEXT,
      partner_id_id INTEGER,
      partner_id_name TEXT,
      account_id_id INTEGER,
      account_id_code TEXT,
      reconciled INTEGER,
      parent_state TEXT,
      account_type TEXT
    );
  `);

  // Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT,
      categ_id_id INTEGER,
      categ_id_name TEXT,
      qty_available REAL,
      virtual_available REAL,
      type TEXT
    );
  `);

  // Partners Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY,
      name TEXT,
      city TEXT
    );
  `);

  // Vendor Bills (Purchases) Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vendor_bills (
      id INTEGER PRIMARY KEY,
      ref TEXT,
      date TEXT,
      partner_id INTEGER,
      partner_name TEXT,
      product_id INTEGER,
      product_name TEXT,
      product_new TEXT,
      account_id INTEGER,
      account_name TEXT,
      quantity REAL,
      uom_name TEXT,
      price_unit REAL,
      discount REAL,
      amount_total REAL,
      analytic_code TEXT,
      farm TEXT,
      qty_purchased REAL,
      parent_state TEXT
    );
  `);
};

initDB();

module.exports = db;
