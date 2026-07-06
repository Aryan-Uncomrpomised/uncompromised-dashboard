const { connectDB, client } = require('./server/db.cjs');

async function test() {
  try {
    const db = await connectDB();
    console.time('grouping');
    const grouped = await db.collection('move_lines').aggregate([
      {
        $match: {
          account_type: 'income',
          $or: [
            { partner_id_name: null },
            { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
          ]
        }
      },
      {
        $group: {
          _id: {
            date: '$date',
            product_id: '$product_id_id',
            product_name: '$product_id_name',
            partner_id: '$partner_id_id',
            partner_name: '$partner_id_name',
            account_code: '$account_id_code',
            ref: '$ref',
            move_name: '$move_name'
          },
          quantity: { $sum: '$quantity' },
          credit: { $sum: '$credit' },
          debit: { $sum: '$debit' }
        }
      }
    ]).toArray();
    console.timeEnd('grouping');
    console.log('Grouped lines count:', grouped.length);
  } catch (e) {
    console.error(e);
  } finally {
    if (client) await client.close();
  }
}
test();
