import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Area } from 'recharts';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';
import { Sprout, DollarSign, Trash2, ShoppingCart, Calendar as CalendarIcon, Search, Activity } from 'lucide-react';

const OperationsDashboard = () => {
  const { filters, setFilters } = useFilters();
  const [data, setData] = useState({
    produce: [],
    spoilage: [],
    sales: []
  });
  const [loading, setLoading] = useState(true);
  const [matrixSearch, setMatrixSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salesRes, produceRes, spoilageRes] = await Promise.all([
          fetch('/api/sales-lines'),
          fetch('/api/produce'),
          fetch('/api/spoilage')
        ]);
        
        if (!salesRes.ok || !produceRes.ok || !spoilageRes.ok) throw new Error('API Error');
        
        const salesData = await salesRes.json();
        const produceData = await produceRes.json();
        const spoilageData = await spoilageRes.json();
        
        setData({
          produce: produceData.lines || [],
          spoilage: spoilageData.lines || [],
          sales: [...(salesData.saleLines || []), ...(salesData.posLines || [])]
        });
      } catch (err) {
        console.error('Error fetching master data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cleanProductName = (rawName) => {
    if (!rawName) return 'Unknown';
    let clean = rawName;
    if (clean.includes(']')) clean = clean.split(']')[1].trim();
    clean = clean.replace(/_P$/, '').trim();
    return clean;
  };

  const processedData = useMemo(() => {
    let { produce, spoilage, sales } = data;

    // Apply Global Date Filter
    if (filters.startDate) {
      produce = produce.filter(i => (i.date || '').split(' ')[0] >= filters.startDate);
      spoilage = spoilage.filter(i => (i.date || '').split(' ')[0] >= filters.startDate);
      sales = sales.filter(i => (i.date || '').split(' ')[0] >= filters.startDate);
    }
    if (filters.endDate) {
      produce = produce.filter(i => (i.date || '').split(' ')[0] <= filters.endDate);
      spoilage = spoilage.filter(i => (i.date || '').split(' ')[0] <= filters.endDate);
      sales = sales.filter(i => (i.date || '').split(' ')[0] <= filters.endDate);
    }

    // 1. Compute Master Matrix
    const cropMap = {};
    let totalHarvest = 0;
    let totalSpoilage = 0;
    let totalSales = 0;
    let totalRevenue = 0;

    const getOrInitCrop = (name) => {
      if (!cropMap[name]) {
        cropMap[name] = { product: name, harvest: 0, sales: 0, spoilage: 0, revenue: 0 };
      }
      return cropMap[name];
    };

    produce.forEach(line => {
      const qty = line.qty_purchased || 0;
      if (qty <= 0) return;
      const crop = getOrInitCrop(cleanProductName(line.product_new || line.product_name));
      crop.harvest += qty;
      totalHarvest += qty;
    });

    spoilage.forEach(line => {
      const qty = line.revised_qty || 0;
      if (qty <= 0) return;
      const crop = getOrInitCrop(cleanProductName(line.product));
      crop.spoilage += qty;
      totalSpoilage += qty;
    });

    sales.forEach(line => {
      const qty = line.qty || 0;
      const rev = line.price_subtotal_incl || 0;
      if (qty <= 0 && rev <= 0) return;
      const crop = getOrInitCrop(cleanProductName(line.product_id ? line.product_id[1] : null));
      crop.sales += qty;
      crop.revenue += rev;
      totalSales += qty;
      totalRevenue += rev;
    });

    const matrixData = Object.values(cropMap)
      .map(crop => ({
        ...crop,
        yieldPercent: crop.harvest > 0 ? ((crop.sales / crop.harvest) * 100) : 0,
        unaccounted: crop.harvest - crop.sales - crop.spoilage
      }))
      .filter(crop => crop.harvest > 0)
      .sort((a, b) => b.harvest - a.harvest);

    // 2. Compute Timeline Data
    const dailyMap = {};
    const getOrInitDay = (d) => {
      if (!dailyMap[d]) dailyMap[d] = { date: d, harvest: 0, sales: 0, spoilage: 0 };
      return dailyMap[d];
    };

    produce.forEach(line => {
      if (!line.date) return;
      getOrInitDay(line.date.split(' ')[0]).harvest += (line.qty_purchased || 0);
    });
    spoilage.forEach(line => {
      if (!line.date) return;
      getOrInitDay(line.date.split(' ')[0]).spoilage += (line.revised_qty || 0);
    });
    sales.forEach(line => {
      if (!line.date) return;
      getOrInitDay(line.date.split(' ')[0]).sales += (line.qty || 0);
    });

    const timelineData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalHarvest,
      totalSpoilage,
      totalSales,
      totalRevenue,
      overallYield: totalHarvest > 0 ? ((totalSales / totalHarvest) * 100) : 0,
      matrixData,
      timelineData
    };
  }, [data, filters]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const formatNumber = (num) => Number(num).toLocaleString('en-IN', { maximumFractionDigits: 1 });
  const formatCurrency = (num) => '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const handleDateChange = (range) => {
    setFilters(prev => ({ ...prev, datePreset: 'custom', startDate: range.start, endDate: range.end, dateLabel: range.label }));
  };

  const dateValue = {
    start: filters.startDate || '2020-01-01',
    end: filters.endDate || new Date().toISOString().split('T')[0],
    label: filters.dateLabel || 'All Time'
  };

  const filteredMatrix = processedData.matrixData.filter(row => 
    !matrixSearch || row.product.toLowerCase().includes(matrixSearch.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Master Operations</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>End-to-end crop lifecycle from Harvest to Sales to Spoilage.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px 20px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-4">
            <DateRangePicker value={dateValue} onChange={handleDateChange} />
          </div>
        </div>
      </div>

      {/* KPI Banner */}
      <div className="dashboard-grid">
        <div className="card stat-card col-span-3">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Sprout size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Harvested</p>
            <h3 className="stat-value" style={{ color: '#10b981' }}>{formatNumber(processedData.totalHarvest)} <span style={{fontSize: '14px', color: 'var(--text-muted)'}}>Kg</span></h3>
          </div>
        </div>
        <div className="card stat-card col-span-3">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Sold</p>
            <h3 className="stat-value" style={{ color: '#3b82f6' }}>{formatNumber(processedData.totalSales)} <span style={{fontSize: '14px', color: 'var(--text-muted)'}}>Kg</span></h3>
          </div>
        </div>
        <div className="card stat-card col-span-3">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Trash2 size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Spoiled</p>
            <h3 className="stat-value" style={{ color: '#ef4444' }}>{formatNumber(processedData.totalSpoilage)} <span style={{fontSize: '14px', color: 'var(--text-muted)'}}>Kg</span></h3>
          </div>
        </div>
        <div className="card stat-card col-span-3">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Revenue</p>
            <h3 className="stat-value" style={{ color: '#f59e0b' }}>{formatCurrency(processedData.totalRevenue)}</h3>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title flex items-center gap-2"><Activity size={18} /> Operations Timeline (Kg)</span>
        </div>
        <div style={{ height: '350px', marginTop: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
              <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                formatter={(val, name) => [formatNumber(val) + ' Kg', name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Legend verticalAlign="bottom" height={36}/>
              <Area type="monotone" dataKey="harvest" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth={2} name="Harvest" />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={false} name="Sales" />
              <Line type="monotone" dataKey="spoilage" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Spoilage" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Master Matrix */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Crop Accountability Matrix</span>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search Crop..." 
              value={matrixSearch}
              onChange={(e) => setMatrixSearch(e.target.value)}
              style={{ padding: '6px 12px 6px 30px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>
        <div className="data-table-container" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{textAlign: 'left'}}>Crop</th>
                <th style={{textAlign: 'right', color: '#10b981'}}>Harvest (Kg)</th>
                <th style={{textAlign: 'right', color: '#3b82f6'}}>Sales (Kg)</th>
                <th style={{textAlign: 'right', color: '#ef4444'}}>Spoilage (Kg)</th>
                <th style={{textAlign: 'right', color: '#f59e0b'}}>Revenue</th>
                <th style={{textAlign: 'right'}}>Unaccounted (Kg)</th>
                <th style={{textAlign: 'right'}}>Yield Conversion</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((row, idx) => (
                <tr key={idx}>
                  <td style={{fontWeight: 600, color: 'var(--text-primary)'}}>{row.product}</td>
                  <td style={{textAlign: 'right', fontWeight: 500, color: '#10b981'}}>{formatNumber(row.harvest)}</td>
                  <td style={{textAlign: 'right', fontWeight: 500, color: '#3b82f6'}}>{formatNumber(row.sales)}</td>
                  <td style={{textAlign: 'right', fontWeight: 500, color: '#ef4444'}}>{formatNumber(row.spoilage)}</td>
                  <td style={{textAlign: 'right', color: '#f59e0b'}}>{formatCurrency(row.revenue)}</td>
                  <td style={{textAlign: 'right', color: 'var(--text-muted)'}}>
                    {row.unaccounted > 0 ? `+${formatNumber(row.unaccounted)}` : formatNumber(row.unaccounted)}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <span className="status-badge" style={{background: row.yieldPercent > 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: row.yieldPercent > 70 ? '#10b981' : '#ef4444'}}>
                      {formatNumber(row.yieldPercent)}%
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMatrix.length === 0 && (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', padding: '32px', color: 'var(--text-muted)'}}>No data available.</td>
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
