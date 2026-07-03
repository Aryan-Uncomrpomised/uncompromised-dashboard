const db = require('./db.cjs'); 
const lines = db.prepare("SELECT account_id_code, SUM(amount_residual) as total FROM move_lines WHERE account_type='asset_receivable' AND parent_state='posted' GROUP BY account_id_code").all(); 
console.log(lines);
