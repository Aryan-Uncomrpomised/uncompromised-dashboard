const { connectDB, client } = require('./server/db.cjs');

const FARM_AREAS_SQFT = {
  'Bloom': 4186,
  'Badi': 23816,
  'Khadija': 126699,
  'Thoor': 29920,
  'Gattani': 23054,
  'Jaisa': 0,
  'Chandrangan': 191542,
  'Pratapnagar': 0,
  'Sarai(Dabok)': 817371
};

async function test() {
  try {
    const db = await connectDB();
    const startDate = '2026-06-09';
    const endDate = '2026-07-08';

    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    const rawData = await db.collection('vendor_bills').find(match).toArray();
    console.log('Total raw produce lines:', rawData.length);

    const chartFarmMap = {};
    rawData.forEach(line => {
      let farmName = line.farm || '(Blank)';
      if (farmName.includes('/')) {
        const parts = farmName.split('/');
        farmName = parts.length > 1 ? parts[1].trim() : farmName;
      }
      if (farmName === '(Blank)' || farmName === 'Unknown Farm') return;
      if (!chartFarmMap[farmName]) chartFarmMap[farmName] = 0;
      chartFarmMap[farmName] += line.qty_purchased || 0;
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.max(1, (end - start) / (1000 * 60 * 60 * 24 * 30.44));

    const farmChartData = Object.keys(chartFarmMap).map(k => {
      const volume = chartFarmMap[k];
      const area = FARM_AREAS_SQFT[k] || 1;
      const psfm = area > 1 ? ((volume / area) * 1000) / months : 0;
      return { 
        name: k, 
        value: volume,
        psfm: Number(psfm.toFixed(3))
      };
    }).sort((a, b) => b.value - a.value);

    console.log(farmChartData);
  } catch (e) {
    console.error(e);
  } finally {
    if (client) await client.close();
  }
}
test();
