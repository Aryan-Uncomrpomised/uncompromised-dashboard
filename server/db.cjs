require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable in .env');
}

const client = new MongoClient(uri);

let dbConnection = null;

async function connectDB() {
  if (dbConnection) return dbConnection;
  
  try {
    await client.connect();
    // Use the default db defined in URI, or fallback to 'odoo_cache'
    dbConnection = client.db('odoo_cache');
    console.log('Connected to MongoDB');
    
    // Optional: Create indexes here
    await dbConnection.collection('move_lines').createIndex({ id: 1 }, { unique: true });
    await dbConnection.collection('move_lines').createIndex({ account_type: 1 });
    await dbConnection.collection('products').createIndex({ id: 1 }, { unique: true });
    await dbConnection.collection('partners').createIndex({ id: 1 }, { unique: true });
    await dbConnection.collection('vendor_bills').createIndex({ id: 1 }, { unique: true });
    
    return dbConnection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

module.exports = { connectDB, client };
