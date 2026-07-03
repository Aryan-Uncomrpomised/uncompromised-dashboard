const db=require('./db.cjs'); 
const lines=db.prepare("SELECT date_maturity, date, amount_residual FROM move_lines WHERE account_type='asset_receivable' AND parent_state='posted' AND partner_id_name='Abhimanyu Singh ji'").all(); 

const asOfDate = new Date('2026-07-03T23:59:59.999Z');
let buckets = { b1_30: 0, b31_60: 0, b61_90: 0, b91_120: 0, older: 0, notDue: 0 };
let total = 0;

lines.forEach(line => {
  const dateStr = line.date_maturity || line.date;
  if (!dateStr) return;
  const dueDate = new Date(dateStr);
  if (new Date(line.date) > asOfDate) return;

  const balance = line.amount_residual || 0;
  if (balance === 0) return;
  total += balance;

  const diffTime = asOfDate - dueDate;
  const daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysPastDue <= 0) buckets.notDue += balance;
  else if (daysPastDue <= 30) buckets.b1_30 += balance;
  else if (daysPastDue <= 60) buckets.b31_60 += balance;
  else if (daysPastDue <= 90) buckets.b61_90 += balance;
  else if (daysPastDue <= 120) buckets.b91_120 += balance;
  else buckets.older += balance;
});

console.log('My logic:', buckets);
console.log('Total:', total);
