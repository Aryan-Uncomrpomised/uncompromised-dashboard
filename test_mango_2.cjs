const { connectDB, client } = require('./server/db.cjs');

async function test() {
  try {
    const db = await connectDB();
    const bills = await db.collection('vendor_bills')
      .find({ id: { $in: [192722, 192764, 192768, 192808] } })
      .toArray();
      
    console.log(bills.map(b => b.qty_purchased + ' farm: ' + b.farm + ' partner: ' + b.partner_id_name));
  } catch(e) {
    console.error(e);
  } finally {
    if (client) await client.close();
  }
}
test();
