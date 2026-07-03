const db=require('./db.cjs'); 
const res=db.prepare("SELECT SUM(amount_residual) as total FROM move_lines WHERE account_type='asset_receivable' AND parent_state != 'posted'").get(); 
console.log('Non-posted total:', res.total);
