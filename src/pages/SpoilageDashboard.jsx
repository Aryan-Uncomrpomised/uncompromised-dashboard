import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';
import { Trash2, AlertTriangle, Package, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';

const COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899', '#14b8a6'];

const SpoilageDashboard = () => {
  const { filters, setFilters } = useFilters();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Page-Level Filter
  const [globalCategory, setGlobalCategory] = useState('All Categories');
  const [selectedFarm, setSelectedFarm] = useState('All Farms');
  const [selectedCrop, setSelectedCrop] = useState('All Crops');

  // Visual-Level Filters
  const [topCropsCategory, setTopCropsCategory] = useState('All Categories');
  const [trendCrop, setTrendCrop] = useState('All Crops');
  const [pieCrop, setPieCrop] = useState('All Crops');
  const [tableSearch, setTableSearch] = useState('');
  const [pivotSearch, setPivotSearch] = useState('');

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

  // 1. Base Filtered Data (applies to EVERYTHING on the page)
  const baseData = useMemo(() => {
    let filtered = rawData;

    // First extract all available options from the raw data before filtering
    const allFarms = new Set();
    const allCrops = new Set();
    const allCategories = new Set();
    rawData.forEach(line => {
      if (line.farm) allFarms.add(line.farm);
      let cleanProduct = line.product || 'Unknown Product';
      if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();
      allCrops.add(cleanProduct);
      allCategories.add(line.partner || 'Unknown');
    });

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

    if (globalCategory !== 'All Categories') {
      filtered = filtered.filter(item => (item.partner || 'Unknown') === globalCategory);
    }
    
    if (selectedFarm !== 'All Farms') {
      filtered = filtered.filter(item => item.farm === selectedFarm);
    }
    
    if (selectedCrop !== 'All Crops') {
      filtered = filtered.filter(item => {
        let cleanProduct = item.product || 'Unknown Product';
        if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
        cleanProduct = cleanProduct.replace(/_P$/, '').trim();
        return cleanProduct === selectedCrop;
      });
    }

    return {
      lines: filtered,
      categoryOptions: Array.from(allCategories).sort(),
      cropOptions: Array.from(allCrops).sort(),
      farmOptions: Array.from(allFarms).sort()
    };
  }, [rawData, filters, globalCategory, selectedFarm, selectedCrop]);

  // 2. Top Stats
  const topStats = useMemo(() => {
    let totalSpoilage = 0;
    const cropMap = new Set();
    const categoryMap = {};

    baseData.lines.forEach(line => {
      const qty = line.revised_qty || 0;
      totalSpoilage += qty;
      
      let cleanProduct = line.product || 'Unknown Product';
      if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();
      cropMap.add(cleanProduct);

      const category = line.partner || 'Unknown';
      categoryMap[category] = (categoryMap[category] || 0) + qty;
    });

    let highestCategory = 'None';
    let maxQty = -1;
    for (const [cat, qty] of Object.entries(categoryMap)) {
      if (qty > maxQty) {
        maxQty = qty;
        highestCategory = cat;
      }
    }

    return { totalSpoilage, uniqueCrops: cropMap.size, highestCategory };
  }, [baseData]);

  // 3. Top 5 Crops (filtered by topCropsCategory)
  const topCropsData = useMemo(() => {
    const cropMap = {};
    baseData.lines.forEach(line => {
      const category = line.partner || 'Unknown';
      if (topCropsCategory !== 'All Categories' && category !== topCropsCategory) return;
      
      const qty = line.revised_qty || 0;
      let cleanProduct = line.product || 'Unknown Product';
      if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();
      
      cropMap[cleanProduct] = (cropMap[cleanProduct] || 0) + qty;
    });

    return Object.keys(cropMap)
      .map(k => ({ name: k, value: cropMap[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [baseData, topCropsCategory]);

  // 4. Daily Trend (filtered by trendCrop)
  const trendData = useMemo(() => {
    const dailyMap = {};
    baseData.lines.forEach(line => {
      let cleanProduct = line.product || 'Unknown Product';
      if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();
      
      if (trendCrop !== 'All Crops' && cleanProduct !== trendCrop) return;

      const date = line.date ? line.date.split(' ')[0] : 'Unknown';
      const qty = line.revised_qty || 0;
      if (!dailyMap[date]) dailyMap[date] = { date, qty: 0 };
      dailyMap[date].qty += qty;
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [baseData, trendCrop]);

  // 5. Pie Chart (filtered by pieCrop)
  const pieData = useMemo(() => {
    const categoryMap = {};
    baseData.lines.forEach(line => {
      let cleanProduct = line.product || 'Unknown Product';
      if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();
      
      if (pieCrop !== 'All Crops' && cleanProduct !== pieCrop) return;

      const category = line.partner || 'Unknown';
      const qty = line.revised_qty || 0;
      categoryMap[category] = (categoryMap[category] || 0) + qty;
    });

    return Object.keys(categoryMap)
      .filter(k => categoryMap[k] > 0)
      .map(k => ({ name: k, value: Number(categoryMap[k].toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [baseData, pieCrop]);

  // 6. Pivot Table (Crop x Category Matrix)
  const pivotTableData = useMemo(() => {
    const pivotMap = {};
    baseData.lines.forEach(line => {
      let cleanProduct = line.product || 'Unknown Product';
      if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();

      if (pivotSearch && !cleanProduct.toLowerCase().includes(pivotSearch.toLowerCase())) return;

      const category = line.partner || 'Unknown';
      const qty = line.revised_qty || 0;

      if (!pivotMap[cleanProduct]) {
        pivotMap[cleanProduct] = { product: cleanProduct, total: 0 };
      }
      if (!pivotMap[cleanProduct][category]) {
        pivotMap[cleanProduct][category] = 0;
      }
      pivotMap[cleanProduct][category] += qty;
      pivotMap[cleanProduct].total += qty;
    });

    return Object.values(pivotMap).sort((a, b) => b.total - a.total);
  }, [baseData, pivotSearch]);

  // 7. Detailed Records Table
  const tableData = useMemo(() => {
    const data = [];
    baseData.lines.forEach(line => {
      const date = line.date ? line.date.split(' ')[0] : 'Unknown';
      const category = line.partner || 'Unknown';
      const product = line.product || 'Unknown Product';
      let cleanProduct = product;
      if (cleanProduct.includes(']')) cleanProduct = cleanProduct.split(']')[1].trim();
      cleanProduct = cleanProduct.replace(/_P$/, '').trim();

      if (tableSearch && !cleanProduct.toLowerCase().includes(tableSearch.toLowerCase())) return;

      data.push({ date, category, product: cleanProduct, qty: line.revised_qty || 0, farm: line.farm || '-' });
    });
    return data.sort((a, b) => b.date.localeCompare(a.date));
  }, [baseData, tableSearch]);


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
      {/* Header & Global Filters */}
      <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Spoilage Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Track spoilage, decay, and pilferage across all crops.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px 20px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Filter size={14}/> Page Filter:</span>
            <select 
              className="drp-trigger" 
              style={{ width: 'auto', appearance: 'auto', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              value={globalCategory}
              onChange={(e) => setGlobalCategory(e.target.value)}
            >
              <option value="All Categories">All Categories</option>
              {baseData.categoryOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select 
              className="drp-trigger" 
              style={{ width: 'auto', appearance: 'auto', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
            >
              <option value="All Farms">All Farms</option>
              {baseData.farmOptions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select 
              className="drp-trigger" 
              style={{ width: '150px', appearance: 'auto', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
            >
              <option value="All Crops">All Crops</option>
              {baseData.cropOptions.map(c => (
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
            <h3 className="stat-value" style={{ color: '#ef4444' }}>{formatNumber(topStats.totalSpoilage)}</h3>
          </div>
        </div>
        <div className="card stat-card col-span-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Package size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Crops Spoiled</p>
            <h3 className="stat-value">{topStats.uniqueCrops}</h3>
          </div>
        </div>
        <div className="card stat-card col-span-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Top Category</p>
            <h3 className="stat-value" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}>
              {topStats.highestCategory.replace('Spoilage ', '')}
            </h3>
          </div>
        </div>
      </div>

      {/* Top 5 Crops */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Top 5 Spoiled Crops</span>
          <select 
            style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }}
            value={topCropsCategory}
            onChange={(e) => setTopCropsCategory(e.target.value)}
          >
            <option value="All Categories">All Categories</option>
            {baseData.categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', padding: '16px' }}>
          {topCropsData.map((crop, idx) => (
            <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>#{idx + 1}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={crop.name}>{crop.name}</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '8px', color: 'var(--text-primary)' }}>{formatNumber(crop.value)} Kg</span>
            </div>
          ))}
          {topCropsData.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0' }}>No spoilage recorded in this period.</div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-grid">
        <div className="card col-span-12 md:col-span-7">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title flex items-center gap-2"><CalendarIcon size={18} /> Daily Spoilage Trend (Kg)</span>
            <select 
              style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', maxWidth: '150px' }}
              value={trendCrop}
              onChange={(e) => setTrendCrop(e.target.value)}
            >
              <option value="All Crops">All Crops</option>
              {baseData.cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Spoilage Breakdown</span>
            <select 
              style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', maxWidth: '120px' }}
              value={pieCrop}
              onChange={(e) => setPieCrop(e.target.value)}
            >
              <option value="All Crops">All Crops</option>
              {baseData.cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
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
                    {pieData.map((entry, index) => (
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

      {/* Pivot Matrix Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Spoilage Matrix: Crop by Category</span>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search Crop..." 
              value={pivotSearch}
              onChange={(e) => setPivotSearch(e.target.value)}
              style={{ padding: '6px 12px 6px 30px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>
        <div className="data-table-container" style={{ marginTop: '16px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{textAlign: 'left'}}>Crop</th>
                {baseData.categoryOptions.map(cat => (
                  <th key={cat} style={{textAlign: 'right'}}>{cat.replace('Spoilage ', '')}</th>
                ))}
                <th style={{textAlign: 'right'}}>Total Spoilage</th>
              </tr>
            </thead>
            <tbody>
              {pivotTableData.map((row, idx) => (
                <tr key={idx}>
                  <td style={{fontWeight: 500}}>{row.product}</td>
                  {baseData.categoryOptions.map(cat => (
                    <td key={cat} style={{textAlign: 'right', color: 'var(--text-muted)'}}>
                      {row[cat] ? formatNumber(row[cat]) : '-'}
                    </td>
                  ))}
                  <td style={{textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)'}}>{formatNumber(row.total)}</td>
                </tr>
              ))}
              {pivotTableData.length === 0 && (
                <tr>
                  <td colSpan={baseData.categoryOptions.length + 2} style={{textAlign: 'center', padding: '32px', color: 'var(--text-muted)'}}>No crops found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Data Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Detailed Spoilage Records</span>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search Crop..." 
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              style={{ padding: '6px 12px 6px 30px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
          </div>
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
              {tableData.slice(0, 50).map((row, idx) => (
                <tr key={idx}>
                  <td style={{color: 'var(--text-muted)'}}>{row.date}</td>
                  <td><span className="status-badge" style={{background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>{row.category}</span></td>
                  <td style={{fontWeight: 500}}>{row.product}</td>
                  <td style={{textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)'}}>{formatNumber(row.qty)}</td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '32px', color: 'var(--text-muted)'}}>No spoilage records found.</td>
                </tr>
              )}
            </tbody>
          </table>
          {tableData.length > 50 && (
            <div style={{textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '14px'}}>
              Showing latest 50 records of {tableData.length} total.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpoilageDashboard;
