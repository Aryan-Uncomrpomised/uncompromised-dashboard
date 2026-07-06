const { connectDB, client } = require('./server/db.cjs');

async function createIndexes() {
  try {
    const db = await connectDB();
    console.log('Creating indexes...');
    
    await db.collection('move_lines').createIndex({ account_type: 1 });
    await db.collection('move_lines').createIndex({ partner_id_name: 1 });
    await db.collection('move_lines').createIndex({ parent_state: 1 });
    await db.collection('move_lines').createIndex({ date: -1 });
    await db.collection('move_lines').createIndex({ account_type: 1, parent_state: 1, account_id_code: 1 });
    
    console.log('Indexes created successfully!');
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    if (client) await client.close();
  }
}

createIndexes();
