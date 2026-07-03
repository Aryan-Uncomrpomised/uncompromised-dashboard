const db = require('./db.cjs'); 
const lines = db.prepare("SELECT * FROM move_lines WHERE account_type = 'asset_receivable' AND parent_state = 'posted'").all(); 
let total = 0; 
let n = 0; 
lines.forEach(l => { 
  if(l.account_id_code === 'Trade') return; 
  let b = l.amount_residual || 0; 
  total += b; 
  n++; 
}); 
console.log(total, n);
