import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const OperationsDashboard = () => {
  const { filters } = useFilters();
  const [data, setData] = useState({
    farmYield: [],
    spoilage: [],
    salesLines: [],
    posLines: [],
    productMap: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salesRes, produceRes] = await Promise.all([
          fetch('/api/sales-lines'),
          fetch('/api/produce')
        ]);
        
        if (!salesRes.ok) throw new Error('Failed to fetch sales lines');
        if (!produceRes.ok) throw new Error('Failed to fetch produce bills');
        
        const salesData = await salesRes.json();
        const produceData = await produceRes.json();
        
        setData({
          farmYield: produceData.lines || [],
          spoilage: [],  // To be populated from Odoo (Spoilage)
          salesLines: salesData.saleLines || [],
          posLines: salesData.posLines || [],
          productMap: salesData.productMap || {}
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading master operations data...</div>;

  const productStats = {};
  
  data.posLines.forEach(line => {
    const productId = line.product_id ? line.product_id[0] : null;
    if (!productId) return;
    
    // Check filters
    if (filters.datePreset !== 'all' && filters.datePreset !== 'custom') {
      // Basic filter logic (would need robust order date mapping if we had full order details here)
      // For now, assuming API returns pre-filtered or we show all time if we don't have line dates.
    }
    
    if (!productStats[productId]) {
      productStats[productId] = {
        id: productId,
        name: line.product_id[1],
        soldQty: 0,
        revenue: 0,
        farmQty: 0,
        spoiledQty: 0
      };
    }
    
    productStats[productId].soldQty += (line.qty || 0);
    productStats[productId].revenue += (line.price_subtotal_incl || line.price_subtotal || 0);
  });

  data.farmYield.forEach(line => {
    const productId = line.product_id;
    if (!productId) return;
    
    // Check filters
    if (filters.datePreset !== 'all' && filters.datePreset !== 'custom') {
      if (filters.startDate && line.date < filters.startDate) return;
      if (filters.endDate && line.date > filters.endDate) return;
    }
    
    if (!productStats[productId]) {
      productStats[productId] = {
        id: productId,
        name: line.product_name, // fallback
        soldQty: 0,
        revenue: 0,
        farmQty: 0,
        spoiledQty: 0
      };
    }
    
    productStats[productId].farmQty += (line.qty_purchased || 0);
  });

  const masterTableData = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

  const totalFarmKg = masterTableData.reduce((sum, p) => sum + p.farmQty, 0);
  const totalSoldKg = masterTableData.reduce((sum, p) => sum + p.soldQty, 0);
  const totalSpoiledKg = 600; // Hardcoded from Spoilage Dashboard for now until API is built
  const totalRevenue = masterTableData.reduce((sum, p) => sum + p.revenue, 0);
  
  const spoilageRate = totalFarmKg > 0 ? ((totalSpoiledKg / totalFarmKg) * 100).toFixed(1) : 0;

  const handleDateChange = (range) => {
    setFilters(prev => ({ ...prev, datePreset: 'custom', startDate: range.start, endDate: range.end, dateLabel: range.label }));
  };

  const dateValue = {
    start: filters.startDate || '2020-01-01',
    end: filters.endDate || new Date().toISOString().split('T')[0],
    label: filters.dateLabel || 'All Time'
  };

  return (
    <div className="p-6 fade-in">
      <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Operations Master Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Lifecycle tracking from Farm Yield to Sales and Spoilage.</p>
        </div>
        
        {/* Local Filter Bar */}
        <div style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px 20px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <DateRangePicker value={dateValue} onChange={handleDateChange} />
          </div>
        </div>
      </div>

      <div className="dashboard-grid mb-8">
        <div className="col-span-4 card" style={{ borderTop: '4px solid #10b981' }}>
          <div className="card-header">
            <span className="card-title">1. Farm Inbound (Yield)</span>
          </div>
          <div className="metric-value">{totalFarmKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>KG</span></div>
          <div style={{ marginTop: '8px', color: '#10b981', fontSize: '14px', fontWeight: 500 }}>
            Syncing from Produce
          </div>
        </div>

        <div className="col-span-4 card" style={{ borderTop: '4px solid #3b82f6' }}>
          <div className="card-header">
            <span className="card-title">2. Total Sales (Outbound)</span>
          </div>
          <div className="metric-value">{totalSoldKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>KG</span></div>
          <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Revenue: <span style={{ color: '#3b82f6', fontWeight: 600 }}>₹{Math.round(totalRevenue).toLocaleString()}</span>
          </div>
        </div>

        <div className="col-span-4 card" style={{ borderTop: '4px solid #ef4444' }}>
          <div className="card-header">
            <span className="card-title">3. Total Spoilage (Waste)</span>
          </div>
          <div className="metric-value">{totalSpoiledKg.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>KG</span></div>
          <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '14px', fontWeight: 500 }}>
            Spoilage Rate: {spoilageRate}%
          </div>
        </div>
      </div>

      <div className="card col-span-12">
        <div className="card-header">
          <span className="card-title">Lifecycle Master Table (By Product)</span>
        </div>
        <div className="data-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <tr>
                <th>Rank</th>
                <th>Product Name</th>
                <th style={{ textAlign: 'right' }}>Farm Yield (KG)</th>
                <th style={{ textAlign: 'right' }}>Sold Qty (KG)</th>
                <th style={{ textAlign: 'right' }}>Spoiled Qty (KG)</th>
                <th style={{ textAlign: 'right' }}>Spoilage %</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {masterTableData.length > 0 ? masterTableData.map((prod, idx) => (
                <tr key={prod.id}>
                  <td>#{idx + 1}</td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{prod.name}</td>
                  <td style={{ textAlign: 'right', color: '#10b981' }}>{prod.farmQty > 0 ? prod.farmQty.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'right' }}>{prod.soldQty > 0 ? prod.soldQty.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</td>
                  <td style={{ textAlign: 'right', color: '#ef4444' }}>{prod.spoiledQty > 0 ? prod.spoiledQty.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {prod.farmQty > 0 ? ((prod.spoiledQty / prod.farmQty) * 100).toFixed(1) + '%' : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#3b82f6' }}>
                    ₹{Math.round(prod.revenue).toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No product data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboard;
