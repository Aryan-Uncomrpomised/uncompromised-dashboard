const db=require('./db.cjs'); 
const lines=db.prepare("SELECT * FROM move_lines WHERE account_type = 'asset_receivable' LIMIT 5").all(); 
console.log(lines);

let asOfDate = new Date();

lines.forEach(line => {
  const dateStr = line.date_maturity || line.date;
  if (!dateStr) { console.log('No dateStr', line.id); return; }
  
  const dueDate = new Date(dateStr);
  if (new Date(line.date) > asOfDate) { console.log('Filtered out by date', line.id); return; }

  const balance = line.amount_residual || 0;
  if (balance === 0) { console.log('Zero balance', line.id); return; }

  console.log('Included', line.id, balance);
});
