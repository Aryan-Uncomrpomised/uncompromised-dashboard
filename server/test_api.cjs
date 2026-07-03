const http = require('http');

http.get('http://localhost:3001/api/sales', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const pos = json.posOrders || [];
    const web = json.saleOrders || [];

    let totalPos = 0;
    let totalWeb = 0;

    const start = new Date('2026-04-01T00:00:00');
    const end = new Date('2026-07-03T23:59:59');

    pos.forEach(order => {
      const orderDate = new Date(order.date_order);
      if (orderDate >= start && orderDate <= end) {
        totalPos += order.amount_total;
      }
    });

    web.forEach(order => {
      const orderDate = new Date(order.date_order);
      if (orderDate >= start && orderDate <= end) {
        totalWeb += order.amount_total;
      }
    });

    console.log('POS:', totalPos);
    console.log('Web:', totalWeb);
    console.log('Total:', totalPos + totalWeb);
  });
});
