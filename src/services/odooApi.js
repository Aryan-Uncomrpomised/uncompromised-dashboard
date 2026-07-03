const ODOO_URL = 'https://simplability.odoo.com';
const DB = 'simplability';
const USERNAME = 'finance@uncompromised.in';
const API_KEY = '4f8f0054a044ee9d2d4c0f6c1f7f6eff59f753df';

class OdooAPI {
  constructor() {
    this.sessionId = null;
    this.uid = null;
  }

  async authenticate() {
    try {
      const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            db: DB,
            login: USERNAME,
            password: API_KEY,
          },
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.data.message || 'Authentication failed');
      }
      this.sessionId = data.result.session_id;
      this.uid = data.result.uid;
      return true;
    } catch (error) {
      console.error('Odoo Auth Error:', error);
      return false;
    }
  }

  async callKw(model, method, args, kwargs = {}) {
    if (!this.sessionId) {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Could not authenticate with Odoo');
    }
    
    try {
      const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Openerp-Session-Id': this.sessionId
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: model,
            method: method,
            args: args,
            kwargs: kwargs
          }
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.data.message);
      return data.result;
    } catch (error) {
      console.error(`Odoo API Error [${model}.${method}]:`, error);
      throw error;
    }
  }

  async getSalesOrders() {
    // Fetching website/standard sales
    return this.callKw('sale.order', 'search_read', [[]], {
      fields: ['name', 'date_order', 'amount_total', 'state'],
      limit: 100
    });
  }

  async getPOSOrders() {
    // Fetching POS sales
    return this.callKw('pos.order', 'search_read', [[]], {
      fields: ['name', 'date_order', 'amount_total', 'state'],
      limit: 100
    });
  }
}

export const odooService = new OdooAPI();
