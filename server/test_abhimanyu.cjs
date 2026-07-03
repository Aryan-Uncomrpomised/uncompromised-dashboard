const db=require('./db.cjs'); 
const lines=db.prepare("SELECT date_maturity, date, amount_residual FROM move_lines WHERE account_type='asset_receivable' AND parent_state='posted' AND partner_id_name='Abhimanyu Singh ji'").all(); 
console.log(lines);
