import React, { useState, useEffect, useMemo } from 'react';

import { IndianRupee, Clock, AlertTriangle, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const ReceivablesDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState([]);

  useEffect(() => {
    fetch('/api/receivables')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setRawData(data.lines || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch receivables data');
        setLoading(false);
      });
  }, []);

  const [asOfFilter, setAsOfFilter] = useState(new Date().toISOString().split('T')[0]);

  const asOfDate = new Date(asOfFilter);
  asOfDate.setHours(23, 59, 59, 999);

  const agedData = useMemo(() => {
    let totalOutstanding = 0;
    let notDue = 0;
    let bucket1_30 = 0;
    let bucket31_60 = 0;
    let bucket61_90 = 0;
    let bucket91_120 = 0;
    let older = 0;
    
    const customerMap = {};

    rawData.forEach(line => {
      // Odoo standard: use date_maturity, fallback to date
      const dateStr = line.date_maturity || line.date;
      if (!dateStr) return;
      
      const dueDate = new Date(dateStr);
      // If invoice is created AFTER the "asOfDate", we ignore it for a historical view
      if (new Date(line.date) > asOfDate) return;

      const balance = line.amount_residual || 0;
      if (balance === 0) return;

      // Customer info
      const partnerId = line.partner_id ? line.partner_id[0] : 'unknown';
      const partnerName = line.partner_id ? line.partner_id[1] : 'Unknown Customer';

      if (partnerName === 'Beyond Zero Farms LLP - Others MSME') return; // Filter out

      if (!customerMap[partnerId]) {
        const tags = line.partner_tags || '';
        const isVFresh = tags.includes('V-Fresh');
        const poc = isVFresh ? 'Prerna' : '-';
        customerMap[partnerId] = { id: partnerId, name: partnerName, poc: poc, tags: tags, total: 0, notDue: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91_120: 0, older: 0 };
      }

      totalOutstanding += balance;
      customerMap[partnerId].total += balance;

      // Calculate days past due
      const diffTime = asOfDate - dueDate;
      const daysPastDue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysPastDue <= 0) {
        notDue += balance;
        customerMap[partnerId].notDue += balance;
      } else if (daysPastDue <= 30) {
        bucket1_30 += balance;
        customerMap[partnerId].b1_30 += balance;
      } else if (daysPastDue <= 60) {
        bucket31_60 += balance;
        customerMap[partnerId].b31_60 += balance;
      } else if (daysPastDue <= 90) {
        bucket61_90 += balance;
        customerMap[partnerId].b61_90 += balance;
      } else if (daysPastDue <= 120) {
        bucket91_120 += balance;
        customerMap[partnerId].b91_120 += balance;
      } else {
        older += balance;
        customerMap[partnerId].older += balance;
      }
    });

    const customers = Object.values(customerMap)
      .filter(c => Math.abs(c.total) > 0.01 || Math.abs(c.notDue) > 0.01 || Math.abs(c.b1_30) > 0.01 || Math.abs(c.b31_60) > 0.01 || Math.abs(c.b61_90) > 0.01 || Math.abs(c.b91_120) > 0.01 || Math.abs(c.older) > 0.01)
      .sort((a, b) => b.total - a.total);
      
    const overdue = bucket1_30 + bucket31_60 + bucket61_90 + bucket91_120 + older;

    return {
      totalOutstanding,
      notDue,
      bucket1_30,
      bucket31_60,
      bucket61_90,
      bucket91_120,
      older,
      overdue,
      customers
    };
  }, [rawData, asOfDate]);

  const formatCurrency = (val) => {
    if (Math.abs(val) < 0.01) return '0.00';
    return val.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  const chartData = [
    { name: 'Not Due', value: agedData.notDue, color: 'var(--color-success)' },
    { name: '1-30 Days', value: agedData.bucket1_30, color: 'var(--color-warning)' },
    { name: '31-60 Days', value: agedData.bucket31_60, color: '#f59e0b' },
    { name: '61-90 Days', value: agedData.bucket61_90, color: '#ea580c' },
    { name: '91-120 Days', value: agedData.bucket91_120, color: '#dc2626' },
    { name: 'Older', value: agedData.older, color: '#991b1b' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '80vh' }}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {loading && (
        <div style={{
          position: 'absolute', top: -24, left: -24, right: -24, bottom: -24,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
           <div style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
           <span style={{ fontSize: '16px', fontWeight: 500, color: '#f8fafc', letterSpacing: '0.5px' }}>Syncing Aged Receivables...</span>
        </div>
      )}

      {error && <div style={{ padding: '24px', color: 'red' }}>{error}</div>}

      <div className="flex-between mb-6" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Aged Receivables <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>As of {asOfDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Real-time aging report from Odoo Invoices.</p>
        </div>

        {/* Local Filter */}
        <div style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px 20px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="filter-group">
            <label className="filter-label">As Of Date</label>
            <div className="filter-input-wrapper">
              <input 
                type="date" 
                className="filter-select" 
                value={asOfFilter} 
                onChange={(e) => setAsOfFilter(e.target.value)}
                style={{ padding: '0 8px' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* KPI 1: Total Outstanding */}
        <div className="col-span-3 card">
          <div className="card-header">
            <span className="card-title">Total Outstanding</span>
            <IndianRupee size={18} color="var(--accent-primary)" />
          </div>
          <div className="metric-value">{formatCurrency(agedData.totalOutstanding)}</div>
          <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>Total open balance</div>
        </div>

        {/* KPI 2: Total Overdue */}
        <div className="col-span-3 card">
          <div className="card-header">
            <span className="card-title">Total Overdue</span>
            <AlertTriangle size={18} color="var(--color-danger)" />
          </div>
          <div className="metric-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(agedData.overdue)}</div>
          <div className="metric-trend" style={{ color: 'var(--color-danger)' }}>
            {agedData.totalOutstanding > 0 ? Math.round((agedData.overdue / agedData.totalOutstanding) * 100) : 0}% of outstanding
          </div>
        </div>

        {/* KPI 3: Not Due */}
        <div className="col-span-3 card">
          <div className="card-header">
            <span className="card-title">Not Due</span>
            <Clock size={18} color="var(--color-success)" />
          </div>
          <div className="metric-value">{formatCurrency(agedData.notDue)}</div>
          <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>Current balance</div>
        </div>

        {/* KPI 4: Customers in Debt */}
        <div className="col-span-3 card">
          <div className="card-header">
            <span className="card-title">Customers in Debt</span>
            <Users size={18} color="var(--accent-secondary)" />
          </div>
          <div className="metric-value">{agedData.customers.length}</div>
          <div className="metric-trend" style={{ color: 'var(--text-muted)' }}>With open balances</div>
        </div>

        {/* Chart: Aging Buckets */}
        <div className="col-span-12 card mt-6">
          <div className="card-header">
            <span className="card-title">Receivables Aging</span>
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} tickFormatter={(val) => '₹' + (val / 1000).toFixed(0) + 'k'} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(value) => [formatCurrency(value), 'Amount']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table: Customer Breakdown */}
        <div className="col-span-12 card mt-6">
          <div className="card-header">
            <span className="card-title">Aged Receivable by Customer</span>
          </div>
          <div className="data-table-container" style={{ marginTop: '16px', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{textAlign: 'left'}}>Customer Name</th>
                  <th style={{textAlign: 'left'}}>POC</th>
                  <th style={{textAlign: 'right'}}>Not Due</th>
                  <th style={{textAlign: 'right'}}>1-30 Days</th>
                  <th style={{textAlign: 'right'}}>31-60 Days</th>
                  <th style={{textAlign: 'right'}}>61-90 Days</th>
                  <th style={{textAlign: 'right'}}>91-120 Days</th>
                  <th style={{textAlign: 'right'}}>Older</th>
                  <th style={{textAlign: 'right'}}>Total Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <td>Total</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: agedData.notDue < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(agedData.notDue)}</td>
                  <td style={{ textAlign: 'right', color: agedData.bucket1_30 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(agedData.bucket1_30)}</td>
                  <td style={{ textAlign: 'right', color: agedData.bucket31_60 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(agedData.bucket31_60)}</td>
                  <td style={{ textAlign: 'right', color: agedData.bucket61_90 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(agedData.bucket61_90)}</td>
                  <td style={{ textAlign: 'right', color: agedData.bucket91_120 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(agedData.bucket91_120)}</td>
                  <td style={{ textAlign: 'right', color: agedData.older < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(agedData.older)}</td>
                  <td style={{ textAlign: 'right', color: agedData.totalOutstanding < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(agedData.totalOutstanding)}</td>
                </tr>
                {agedData.customers.map((cust) => (
                  <tr key={cust.id}>
                    <td style={{ fontWeight: 500 }}>{cust.name}</td>
                    <td>{cust.poc === 'Prerna' ? <span className="status-badge" style={{background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '2px 8px', borderRadius: '12px', fontSize: '12px'}}>{cust.poc}</span> : <span style={{color: 'var(--text-muted)'}}>{cust.poc}</span>}</td>
                    <td style={{ textAlign: 'right', color: cust.notDue < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(cust.notDue)}</td>
                    <td style={{ textAlign: 'right', color: cust.b1_30 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(cust.b1_30)}</td>
                    <td style={{ textAlign: 'right', color: cust.b31_60 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(cust.b31_60)}</td>
                    <td style={{ textAlign: 'right', color: cust.b61_90 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(cust.b61_90)}</td>
                    <td style={{ textAlign: 'right', color: cust.b91_120 < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(cust.b91_120)}</td>
                    <td style={{ textAlign: 'right', color: cust.older < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(cust.older)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: cust.total < 0 ? 'var(--color-danger)' : 'inherit' }}>{formatCurrency(cust.total)}</td>
                  </tr>
                ))}
                {agedData.customers.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No outstanding receivables found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivablesDashboard;
