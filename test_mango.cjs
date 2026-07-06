const { connectDB, client } = require('./server/db.cjs');

async function test() {
  try {
    const db = await connectDB();
    const bills = await db.collection('vendor_bills')
      .find({ product_name: /Raw Mango/i })
      .toArray();
      
    console.log(bills.map(b => ({
      id: b.id, 
      ref: b.ref, 
      product: b.product_name, 
      qty: b.qty_purchased, 
      account: b.account_id_name,
      date: b.date
    })));
  } catch(e) {
    console.error(e);
  } finally {
    if (client) await client.close();
  }
}
test();
