import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ComposedChart } from 'recharts';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';
import { Tractor, Sprout, Calendar as CalendarIcon, Package, Search } from 'lucide-react';
import { cleanProductName } from '../utils/formatters';
import { fetchWithCache } from '../utils/apiCache';

const ProduceDashboard = () => {
  const { filters, setFilters } = useFilters();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarm, setSelectedFarm] = useState('All Farms');
  const [selectedCrop, setSelectedCrop] = useState('All Crops');
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    const start = filters.startDate || '';
    const end = filters.endDate || '';
    fetchWithCache(`/api/produce?startDate=${start}&endDate=${end}`, (data) => {
      setRawData(data.lines || []);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching produce:', err);
      setLoading(false);
    });
  }, [filters.startDate, filters.endDate]);

  const processedData = useMemo(() => {
    let filtered = rawData;

    // Extract options before filtering
    const allFarms = new Set();
    const allCrops = new Set();
    rawData.forEach(line => {
      let farmName = line.farm || '(Blank)';
      if (farmName.includes('/')) {
        const parts = farmName.split('/');
        farmName = parts.length > 1 ? parts[1].trim() : farmName;
      }
      if (farmName !== '(Blank)' && farmName !== 'Unknown Farm') {
        allFarms.add(farmName);
      }
      allCrops.add(cleanProductName(line.product_new || line.product_name));
    });

    if (filters.startDate) {
      filtered = filtered.filter(item => item.date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(item => item.date <= filters.endDate);
    }

    let totalHarvest = 0;
    const dailyMap = {};
    const farmMap = {};
    const productsSet = new Set();
    const availableFarms = new Set();

    filtered.forEach(line => {
      // Parse Farm / Plot
      let farmName = line.farm || '(Blank)';
      let plotName = 'N/A';
      
      if (farmName.includes('/')) {
        const parts = farmName.split('/');
        if (parts.length >= 3) {
          plotName = parts[0];
          farmName = parts.slice(1).join('/'); // UF 24005/Chandrangan
        }
      }
      
      // Clean up farm name to only show the human readable name
      if (farmName.includes('/')) {
        const parts = farmName.split('/');
        farmName = parts.length > 1 ? parts[1].trim() : farmName;
      }
      
      if (farmName !== '(Blank)' && farmName !== 'Unknown Farm') {
        availableFarms.add(farmName);
      }

      if (selectedFarm !== 'All Farms' && farmName !== selectedFarm) {
        return;
      }
      
      const cropName = cleanProductName(line.product_new || line.product_name);
      if (selectedCrop !== 'All Crops' && cropName !== selectedCrop) {
        return;
      }

      const qty = line.qty_purchased || 0;
      if (qty === 0) return;

      totalHarvest += qty;
      productsSet.add(cropName);

      // Daily Aggregation
      const date = line.date;
      if (!dailyMap[date]) dailyMap[date] = { date, qty: 0 };
      dailyMap[date].qty += qty;

      // Farm/Plot Aggregation
      const farmKey = `${farmName}|${plotName}|${cropName}`;
      if (!farmMap[farmKey]) {
        farmMap[farmKey] = {
          farm: farmName,
          plot: plotName,
          product: cropName,
          qty: 0,
          entries: 0
        };
      }
      farmMap[farmKey].qty += qty;
      farmMap[farmKey].entries += 1;
    });

    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const farmBreakdown = Object.values(farmMap).sort((a, b) => b.qty - a.qty);

    // Group for Bar Chart
    const chartFarmMap = {};
    farmBreakdown.forEach(item => {
      if (item.farm === '(Blank)' || item.farm === 'Unknown Farm') return;
      if (!chartFarmMap[item.farm]) chartFarmMap[item.farm] = 0;
      chartFarmMap[item.farm] += item.qty;
    });
    const FARM_AREAS_SQFT = {
      'Bloom': 4186,
      'Badi': 23816,
      'Khadija': 126699,
      'Thoor': 29920,
      'Gattani': 23054,
      'Jaisa': 0,
      'Chandrangan': 191542,
      'Pratapnagar': 0,
      'Sarai(Dabok)': 817371
    };

    const start = new Date(filters.startDate || '2020-01-01');
    const end = new Date(filters.endDate || new Date().toISOString().split('T')[0]);
    const months = Math.max(1, (end - start) / (1000 * 60 * 60 * 24 * 30.44));

    const farmChartData = Object.keys(chartFarmMap).map(k => {
      const volume = chartFarmMap[k];
      const area = FARM_AREAS_SQFT[k] || 1;
      const psfm = area > 1 ? (volume / area) / months : 0;
      return { 
        name: k, 
        value: volume,
        psfm: Number(psfm.toFixed(3))
      };
    }).sort((a, b) => b.value - a.value).slice(0, 10);

    const cropMap = {};
    farmBreakdown.forEach(item => {
      if (!cropMap[item.product]) cropMap[item.product] = 0;
      cropMap[item.product] += item.qty;
    });
    
    // Sort and get top 5 crops
    const topCrops = Object.keys(cropMap)
      .map(k => ({ name: k, value: cropMap[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalHarvest,
      uniqueFarms: new Set(farmBreakdown.map(f => f.farm)).size,
      uniqueProducts: productsSet.size,
      dailyTrend,
      farmBreakdown,
      farmChartData,
      topCrops,
      farmOptions: Array.from(allFarms).sort(),
      cropOptions: Array.from(allCrops).sort()
    };
  }, [rawData, filters, selectedFarm, selectedCrop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const formatNumber = (num) => num.toLocaleString('en-IN', { maximumFractionDigits: 2 });

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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Produce Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Farm-wise and plot-wise daily harvests based on Vendor Bills.</p>
        </div>
        
        {/* Local Filter Bar */}
        <div style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px 20px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-4">
            <select 
              className="drp-trigger" 
              style={{ width: 'auto', appearance: 'auto', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
            >
              <option value="All Farms">All Farms</option>
              {processedData.farmOptions.map(f => (
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
              {processedData.cropOptions.map(c => (
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
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Sprout size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Harvest (Kg)</p>
            <h3 className="stat-value" style={{ color: '#10b981' }}>{formatNumber(processedData.totalHarvest)}</h3>
          </div>
        </div>
        <div className="card stat-card col-span-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Tractor size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Active Farms</p>
            <h3 className="stat-value">{processedData.uniqueFarms}</h3>
          </div>
        </div>
        <div className="card stat-card col-span-4">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Package size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Products Harvested</p>
            <h3 className="stat-value">{processedData.uniqueProducts}</h3>
          </div>
        </div>
      </div>

      {/* Top 5 Crops */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Top 5 Crops Harvested (This Period)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', padding: '16px' }}>
          {processedData.topCrops.map((crop, idx) => (
            <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>#{idx + 1}</span>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={crop.name}>{crop.name}</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '8px', color: 'var(--text-primary)' }}>{formatNumber(crop.value)} Kg</span>
            </div>
          ))}
          {processedData.topCrops.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0' }}>No crops harvested in this period.</div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-grid">
        <div className="card col-span-6">
          <div className="card-header">
            <span className="card-title flex items-center gap-2"><CalendarIcon size={18} /> Daily Harvest Trend (Kg)</span>
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData.dailyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  formatter={(val) => [formatNumber(val) + ' Kg', 'Harvest']}
                />
                <Line type="monotone" dataKey="qty" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card col-span-6">
          <div className="card-header">
            <span className="card-title">Top Farms by Volume</span>
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedData.farmChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{fill: '#f59e0b'}} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  formatter={(val, name) => {
                    if (name === 'value') return [formatNumber(val) + ' Kg', 'Volume'];
                    if (name === 'psfm') return [val + ' Kg/sqft/mo', 'PSFM'];
                    return [val, name];
                  }}
                />
                <Bar yAxisId="left" dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="psfm" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Farm & Plot Breakdown</span>
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
                <th style={{textAlign: 'left'}}>Farm</th>
                <th style={{textAlign: 'center'}}>Plot</th>
                <th style={{textAlign: 'left'}}>Product</th>
                <th style={{textAlign: 'right'}}>Total Harvest (Kg)</th>
                <th style={{textAlign: 'right'}}>Entries</th>
              </tr>
            </thead>
            <tbody>
              {processedData.farmBreakdown.filter(row => !tableSearch || row.product.toLowerCase().includes(tableSearch.toLowerCase())).map((row, idx) => (
                <tr key={idx}>
                  <td style={{fontWeight: 500}}>{row.farm}</td>
                  <td style={{textAlign: 'center'}}><span className="status-badge" style={{background: 'rgba(59,130,246,0.1)', color: '#3b82f6'}}>{row.plot}</span></td>
                  <td>{row.product}</td>
                  <td style={{textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)'}}>{formatNumber(row.qty)}</td>
                  <td style={{textAlign: 'right', color: 'var(--text-muted)'}}>{row.entries}</td>
                </tr>
              ))}
              {processedData.farmBreakdown.filter(row => !tableSearch || row.product.toLowerCase().includes(tableSearch.toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No produce records found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ProduceDashboard;
