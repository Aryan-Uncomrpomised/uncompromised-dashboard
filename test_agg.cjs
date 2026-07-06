const { connectDB } = require('./server/db.cjs');

async function test() {
  const db = await connectDB();
  console.time('agg');
  const r = await db.collection('move_lines').aggregate([
    {
      $match: {
        account_type: 'income',
        partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' }
      }
    },
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
  console.timeEnd('agg');
  console.log(r.length, 'orders');
  process.exit(0);
}
test();
