const { connectDB, client } = require('./server/db.cjs');

async function test() {
  try {
    const db = await connectDB();
    console.log('Testing route query speeds...');

    // Route 1: Sales
    console.time('sales');
    const sales = await db.collection('move_lines').aggregate([
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
    console.timeEnd('sales');
    console.log(`Sales returned ${sales.length} records`);

    // Route 2: Sales Lines
    console.time('sales-lines');
    const lines = await db.collection('move_lines').find({
      account_type: 'income',
      $or: [
        { partner_id_name: null },
        { partner_id_name: { $ne: 'Beyond Zero Farms LLP - Others MSME' } }
      ]
    }).project({
      move_id_id: 1, move_id_name: 1,
      product_id_id: 1, product_id_name: 1,
      quantity: 1, credit: 1, debit: 1,
      price_unit: 1, account_id_code: 1,
      date: 1, ref: 1, move_name: 1, _id: 0
    }).toArray();
    console.timeEnd('sales-lines');
    console.log(`Sales-lines returned ${lines.length} records`);

    // Route 3: Spoilage
    console.time('spoilage');
    const spoilage = await db.collection('move_lines').find({
      account_type: 'income',
      parent_state: 'posted',
      partner_id_name: { $in: ['Beyond Zero Farms LLP MSME', 'Spoilage  Pilferage', 'Spoilage Decay', 'Spoilage Sorting'] }
    }).sort({ date: -1 }).toArray();
    console.timeEnd('spoilage');
    console.log(`Spoilage returned ${spoilage.length} records`);

    // Route 4: Produce
    console.time('produce');
    const produce = await db.collection('vendor_bills').find({}).sort({ date: -1 }).toArray();
    console.timeEnd('produce');
    console.log(`Produce returned ${produce.length} records`);

    // Route 5: Receivables
    console.time('receivables');
    const receivables = await db.collection('move_lines').find({
      account_type: 'asset_receivable',
      reconciled: 0,
      amount_residual: { $ne: 0 },
      parent_state: 'posted'
    }).toArray();
    console.timeEnd('receivables');
    console.log(`Receivables returned ${receivables.length} records`);

  } catch (error) {
    console.error(error);
  } finally {
    if (client) await client.close();
  }
}

test();
