import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Area } from 'recharts';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';
import { Sprout, DollarSign, Trash2, ShoppingCart, Calendar as CalendarIcon, Search, Activity, Package, Wallet } from 'lucide-react';
import { cleanProductName } from '../utils/formatters';
import { fetchWithCache } from '../utils/apiCache';

const OperationsDashboard = () => {
  const { filters, setFilters } = useFilters();
  const [data, setData] = useState({
    produce: [],
    spoilage: [],
    sales: [],
    inventory: []
  });
  const [loading, setLoading] = useState(true);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('All Farms');

  useEffect(() => {
    let salesLoaded = false;
    let produceLoaded = false;
    let spoilageLoaded = false;
    let inventoryLoaded = false;

    const checkComplete = () => {
      if (salesLoaded && produceLoaded && spoilageLoaded && inventoryLoaded) {
        setLoading(false);
      }
    };

    const start = filters.startDate || '';
    const end = filters.endDate || '';

    fetchWithCache(`/api/sales-lines?startDate=${start}&endDate=${end}`, (salesData) => {
      setData(prev => ({ ...prev, sales: [...(salesData.saleLines || []), ...(salesData.posLines || [])] }));
      salesLoaded = true;
      checkComplete();
    }, (err) => {
      console.error('Error fetching sales:', err);
      salesLoaded = true;
      checkComplete();
    });

    fetchWithCache(`/api/produce?startDate=${start}&endDate=${end}`, (produceData) => {
      setData(prev => ({ ...prev, produce: produceData.lines || [] }));
      produceLoaded = true;
      checkComplete();
    }, (err) => {
      console.error('Error fetching produce:', err);
      produceLoaded = true;
      checkComplete();
    });

    fetchWithCache(`/api/spoilage?startDate=${start}&endDate=${end}`, (spoilageData) => {
      setData(prev => ({ ...prev, spoilage: spoilageData.lines || [] }));
      spoilageLoaded = true;
      checkComplete();
    }, (err) => {
      console.error('Error fetching spoilage:', err);
      spoilageLoaded = true;
      checkComplete();
    });

    fetchWithCache('/api/inventory', (inventoryData) => {
      setData(prev => ({ ...prev, inventory: inventoryData || [] }));
      inventoryLoaded = true;
      checkComplete();
    }, (err) => {
      console.error('Error fetching inventory:', err);
      inventoryLoaded = true;
      checkComplete();
    });
  }, [filters.startDate, filters.endDate]);

  const processedData = useMemo(() => {
    let { produce, spoilage, sales, inventory } = data;

    // Extract unique farms before filtering
    const allFarms = new Set();
    produce.forEach(p => {
      if (p.farm) allFarms.add(p.farm);
    });
    const farmOptions = Array.from(allFarms).sort();

    // Apply Farm Filter to Produce
    if (selectedFarm && selectedFarm !== 'All Farms') {
      produce = produce.filter(p => p.farm === selectedFarm);
    }

    // Helper to shift dates by N days for margin mapping
    const addDays = (dateStr, days) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    // Apply Global Date Filter
    if (filters.startDate) {
      const shiftedStart = addDays(filters.startDate, 3); // 3-day margin
      produce = produce.filter(i => (i.date || '').split(' ')[0] >= filters.startDate);
      spoilage = spoilage.filter(i => (i.date || '').split(' ')[0] >= shiftedStart);
      sales = sales.filter(i => (i.date || '').split(' ')[0] >= shiftedStart);
    }
    if (filters.endDate) {
      const shiftedEnd = addDays(filters.endDate, 3); // 3-day margin
      produce = produce.filter(i => (i.date || '').split(' ')[0] <= filters.endDate);
      spoilage = spoilage.filter(i => (i.date || '').split(' ')[0] <= shiftedEnd);
      sales = sales.filter(i => (i.date || '').split(' ')[0] <= shiftedEnd);
    }

    // 1. Compute Master Matrix
    const cropMap = {};
    let totalHarvest = 0;
    let totalSpoilage = 0;
    let totalSales = 0;
    let totalRevenue = 0;
    let totalInventory = 0;
    let totalInventoryValue = 0;

    const getOrInitCrop = (name) => {
      if (!cropMap[name]) {
        cropMap[name] = { 
          product: name, 
          harvest: 0, 
          sales: 0, 
          spoilage: 0, 
          inventory: 0, 
          inventoryValue: 0, 
          revenue: 0 
        };
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

    (inventory || []).forEach(line => {
      if (!line.name) return;
      const qty = line.qty_available || 0;
      const cleanName = cleanProductName(line.name);
      const crop = getOrInitCrop(cleanName);
      crop.inventory += qty;
      totalInventory += qty;

      const unitPrice = line.standard_price > 0 ? line.standard_price : (line.list_price || 0);
      const val = qty * unitPrice;
      crop.inventoryValue += val;
      totalInventoryValue += val;
    });

    const matrixData = Object.values(cropMap)
      .map(crop => ({
        ...crop,
        yieldPercent: crop.harvest > 0 ? ((crop.sales / crop.harvest) * 100) : 0,
        unaccounted: crop.harvest - crop.sales - crop.spoilage - crop.inventory
      }))
      .filter(crop => 
        crop.harvest > 0 || 
        crop.sales > 0 || 
        crop.spoilage > 0 || 
        Math.abs(crop.inventory) > 0.001
      )
      .sort((a, b) => {
        if (b.harvest !== a.harvest) return b.harvest - a.harvest;
        return Math.abs(b.inventory) - Math.abs(a.inventory);
      });

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
      totalInventory,
      totalInventoryValue,
      farmOptions,
      overallYield: totalHarvest > 0 ? ((totalSales / totalHarvest) * 100) : 0,
      matrixData,
      timelineData
    };
  }, [data, filters, selectedFarm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const formatNumber = (num) => Number(num).toLocaleString('en-IN', { maximumFractionDigits: 1 });
  const formatCurrency = (num) => '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

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

  const totalHarvestedSum = filteredMatrix.reduce((sum, row) => sum + row.harvest, 0);
  const totalSalesSum = filteredMatrix.reduce((sum, row) => sum + row.sales, 0);
  const totalSpoilageSum = filteredMatrix.reduce((sum, row) => sum + row.spoilage, 0);
  const totalInventorySum = filteredMatrix.reduce((sum, row) => sum + row.inventory, 0);
  const totalInventoryValueSum = filteredMatrix.reduce((sum, row) => sum + row.inventoryValue, 0);
  const totalUnaccountedSum = filteredMatrix.reduce((sum, row) => sum + row.unaccounted, 0);
  const overallYieldSum = totalHarvestedSum > 0 ? ((totalSalesSum / totalHarvestedSum) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Master Operations</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>End-to-end crop lifecycle from Harvest to Sales to Spoilage & On-Hand Inventory.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', background: 'var(--glass-bg)', padding: '12px 20px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-4">
            <select 
              className="drp-trigger" 
              style={{ width: 'auto', appearance: 'auto', background: 'var(--bg-secondary)' }}
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
            >
              <option value="All Farms">All Farms</option>
              {processedData.farmOptions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <DateRangePicker value={dateValue} onChange={handleDateChange} />
          </div>
        </div>
      </div>

      {/* KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Sprout size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Harvested</p>
            <h3 className="stat-value" style={{ color: '#10b981', fontSize: '20px' }}>{formatNumber(processedData.totalHarvest)} <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>Kg</span></h3>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <ShoppingCart size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Sold</p>
            <h3 className="stat-value" style={{ color: '#3b82f6', fontSize: '20px' }}>{formatNumber(processedData.totalSales)} <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>Kg</span></h3>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Trash2 size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Total Spoiled</p>
            <h3 className="stat-value" style={{ color: '#ef4444', fontSize: '20px' }}>{formatNumber(processedData.totalSpoilage)} <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>Kg</span></h3>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Package size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Inventory On Hand</p>
            <h3 className="stat-value" style={{ color: '#8b5cf6', fontSize: '20px' }}>{formatNumber(processedData.totalInventory)} <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>Kg</span></h3>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Wallet size={22} />
          </div>
          <div className="stat-content">
            <p className="stat-title">Inventory Value</p>
            <h3 className="stat-value" style={{ color: '#f59e0b', fontSize: '20px' }}>{formatCurrency(processedData.totalInventoryValue)}</h3>
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
          <div>
            <span className="card-title">Crop Accountability Matrix</span>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Comprehensive detailed breakdown of every single crop including harvest, sales, spoilage, inventory on hand, and inventory value.</p>
          </div>
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
        <div className="data-table-container" style={{ marginTop: '16px', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '950px' }}>
            <thead>
              <tr>
                <th style={{textAlign: 'left'}}>Crop</th>
                <th style={{textAlign: 'right', color: '#10b981'}}>Harvest (Kg)</th>
                <th style={{textAlign: 'right', color: '#3b82f6'}}>Sales (Kg)</th>
                <th style={{textAlign: 'right', color: '#ef4444'}}>Spoilage (Kg)</th>
                <th style={{textAlign: 'right', color: '#8b5cf6'}}>Inventory (On Hand)</th>
                <th style={{textAlign: 'right', color: '#f59e0b'}}>Inventory Value (₹)</th>
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
                  <td style={{textAlign: 'right', fontWeight: 500, color: '#8b5cf6'}}>{formatNumber(row.inventory)}</td>
                  <td style={{textAlign: 'right', fontWeight: 600, color: '#f59e0b'}}>{formatCurrency(row.inventoryValue)}</td>
                  <td style={{textAlign: 'right', color: row.unaccounted < 0 ? '#ef4444' : 'var(--text-muted)'}}>
                    {row.unaccounted > 0 ? `+${formatNumber(row.unaccounted)}` : formatNumber(row.unaccounted)}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <span className="status-badge" style={{background: row.yieldPercent > 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: row.yieldPercent > 70 ? '#10b981' : '#ef4444'}}>
                      {formatNumber(row.yieldPercent)}%
                    </span>
                  </td>
                </tr>
              ))}
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{textAlign: 'center', padding: '32px', color: 'var(--text-muted)'}}>No data available.</td>
                </tr>
              ) : (
                <tr style={{ fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.03)', borderTop: '2px solid var(--border-color)' }}>
                  <td style={{ textAlign: 'left', padding: '12px 8px' }}>Total ({filteredMatrix.length} Crops)</td>
                  <td style={{ textAlign: 'right', color: '#10b981', padding: '12px 8px' }}>{formatNumber(totalHarvestedSum)}</td>
                  <td style={{ textAlign: 'right', color: '#3b82f6', padding: '12px 8px' }}>{formatNumber(totalSalesSum)}</td>
                  <td style={{ textAlign: 'right', color: '#ef4444', padding: '12px 8px' }}>{formatNumber(totalSpoilageSum)}</td>
                  <td style={{ textAlign: 'right', color: '#8b5cf6', padding: '12px 8px' }}>{formatNumber(totalInventorySum)}</td>
                  <td style={{ textAlign: 'right', color: '#f59e0b', padding: '12px 8px' }}>{formatCurrency(totalInventoryValueSum)}</td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', color: totalUnaccountedSum < 0 ? '#ef4444' : 'inherit' }}>
                    {totalUnaccountedSum > 0 ? `+${formatNumber(totalUnaccountedSum)}` : formatNumber(totalUnaccountedSum)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                    <span className="status-badge" style={{background: overallYieldSum > 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: overallYieldSum > 70 ? '#10b981' : '#ef4444'}}>
                      {formatNumber(overallYieldSum)}%
                    </span>
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
