import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';
import { Trash2, AlertTriangle, Package, Calendar as CalendarIcon } from 'lucide-react';

const COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6'];

const SpoilageDashboard = () => {
  const { filters, setFilters } = useFilters();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    fetch('/api/spoilage')
      .then(res => res.json())
      .then(data => {
        setRawData(data.lines || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching spoilage:', err);
        setLoading(false);
      });
  }, []);

  const processedData = useMemo(() => {
    let filtered = rawData;

    if (filters.startDate) {
      filtered = filtered.filter(item => {
        if (!item.date) return true;
        return item.date.split(' ')[0] >= filters.startDate;
      });
    }
    if (filters.endDate) {
      filtered = filtered.filter(item => {
        if (!item.date) return true;
        return item.date.split(' ')[0] <= filters.endDate;
      });
    }

    let totalSpoilage = 0;
    const dailyMap = {};
    const categoryMap = {};
    const cropMap = {};
    const availableCategories = new Set();
    
    // Sort raw data by date descending for the table
    const tableData = [];

    filtered.forEach(line => {
      const category = line.partner || 'Unknown';
      availableCategories.add(category);

      if (selectedCategory !== 'All Categories' && category !== selectedCategory) {
        return;
      }

      const qty = line.revised_qty || 0;
      if (qty === 0) return;

      totalSpoilage += qty;
      const date = line.date ? line.date.split(' ')[0] : 'Unknown';
      const product = line.product || 'Unknown Product';

      tableData.push({
        date,
        category,
        product,
        qty,
        value: line.value || 0
      });

      // Daily Aggregation
      if (!dailyMap[date]) dailyMap[date] = { date, qty: 0 };
      dailyMap[date].qty += qty;

      // Category Aggregation
      if (!categoryMap[category]) categoryMap[category] = 0;
      categoryMap[category] += qty;

      // Crop Aggregation
      let cleanProduct = product;
      if (cleanProduct.includes(']')) {
        cleanProduct = cleanProduct.split(']')[1].trim();
      }
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();
      
      if (!cropMap[cleanProduct]) cropMap[cleanProduct] = 0;
      cropMap[cleanProduct] += qty;
    });

    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    
    const categoryChartData = Object.keys(categoryMap)
      .map(k => ({ name: k, value: Number(categoryMap[k].toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    let highestCategory = 'None';
    if (categoryChartData.length > 0) {
      highestCategory = categoryChartData[0].name;
    }

    const topCrops = Object.keys(cropMap)
      .map(k => ({ name: k, value: cropMap[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalSpoilage,
      uniqueCrops: Object.keys(cropMap).length,
      highestCategory,
      dailyTrend,
      categoryChartData,
      topCrops,
      tableData: tableData.sort((a, b) => b.date.localeCompare(a.date)),
      categoryOptions: Array.from(availableCategories).sort()
    };
  }, [rawData, filters, selectedCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const formatNumber = (num) => Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const handleDateChange = (range) => {
    setFilters(prev => ({ ...prev, datePreset: 'custom', startDate: range.start, endDate: range.end, dateLabel: range.label }));
  };

  const dateValue = {
    start: filters.startDate || '2020-01-01',
    end: filters.endDate || new Date().toISOString().split('T')[0],
    label: filters.dateLabel || 'All Time'
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Spoilage Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Track spoilage, decay, and pilferage across all crops.</p>
        </div>
        
        {/* Local Filter Bar */}
        <div style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px 20px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-4">
            <select 
              className="drp-trigger" 
              style={{ width: 'auto', appearance: 'auto', background: 'var(--bg-secondary)' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All Categories">All Categories</option>
              {processedData.categoryOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <DateRangePicker value={dateValue} onChange={handleDateChange} />
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="dashboard-grid">
        <div className="card stat-card col-span-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Trash2 size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Spoilage (Kg)</p>
            <h3 className="stat-value" style={{ color: '#ef4444' }}>{formatNumber(processedData.totalSpoilage)}</h3>
          </div>
        </div>
        <div className="card stat-card col-span-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Package size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Crops Spoiled</p>
            <h3 className="stat-value">{processedData.uniqueCrops}</h3>
          </div>
        </div>
        <div className="card stat-card col-span-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Top Category</p>
            <h3 className="stat-value" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}>
              {processedData.highestCategory.replace('Spoilage ', '')}
            </h3>
          </div>
        </div>
      </div>

      {/* Top 5 Crops */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Top 5 Spoiled Crops (This Period)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', padding: '16px' }}>
          {processedData.topCrops.map((crop, idx) => (
            <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>#{idx + 1}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={crop.name}>{crop.name}</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '8px', color: 'var(--text-primary)' }}>{formatNumber(crop.value)} Kg</span>
            </div>
          ))}
          {processedData.topCrops.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0' }}>No spoilage recorded in this period.</div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-grid">
        <div className="card col-span-12 md:col-span-7">
          <div className="card-header">
            <span className="card-title flex items-center gap-2"><CalendarIcon size={18} /> Daily Spoilage Trend (Kg)</span>
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData.dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  formatter={(val) => [formatNumber(val) + ' Kg', 'Spoilage']}
                />
                <Line type="monotone" dataKey="qty" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card col-span-12 md:col-span-5">
          <div className="card-header">
            <span className="card-title">Spoilage Breakdown</span>
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            {processedData.categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name.replace('Spoilage ', '')} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {processedData.categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(value) => [`${value} Kg`, 'Spoilage']}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                No spoilage data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Detailed Spoilage Records</span>
        </div>
        <div className="data-table-container" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{textAlign: 'left'}}>Date</th>
                <th style={{textAlign: 'left'}}>Category</th>
                <th style={{textAlign: 'left'}}>Product</th>
                <th style={{textAlign: 'right'}}>Spoiled Qty (Kg)</th>
              </tr>
            </thead>
            <tbody>
              {processedData.tableData.slice(0, 50).map((row, idx) => (
                <tr key={idx}>
                  <td style={{color: 'var(--text-muted)'}}>{row.date}</td>
                  <td><span className="status-badge" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>{row.category}</span></td>
                  <td style={{fontWeight: 500}}>{row.product}</td>
                  <td style={{textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)'}}>{formatNumber(row.qty)}</td>
                </tr>
              ))}
              {processedData.tableData.length === 0 && (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '32px', color: 'var(--text-muted)'}}>No spoilage records found.</td>
                </tr>
              )}
            </tbody>
          </table>
          {processedData.tableData.length > 50 && (
            <div style={{textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '14px'}}>
              Showing latest 50 records of {processedData.tableData.length} total.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpoilageDashboard;
