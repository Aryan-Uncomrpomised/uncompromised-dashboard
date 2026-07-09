const { connectDB, client } = require('./server/db.cjs');

async function test() {
  try {
    const db = await connectDB();
    const uniqueFarms = await db.collection('vendor_bills').distinct('farm');
    console.log('Unique farms in DB:', uniqueFarms);
  } catch(e) {
    console.error(e);
  } finally {
    if (client) await client.close();
  }
}
test();
