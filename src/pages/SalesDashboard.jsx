import { useState, useEffect } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { cleanProductName } from '../utils/formatters';
import { TrendingUp, DollarSign, ShoppingCart, Activity, Server, Users, ChevronDown } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0284c7', '#db2777', '#14b8a6'];

const isFreshItem = (categoryName, productName = '') => {
  const c = (categoryName || '').toLowerCase();
  const p = (productName || '').toLowerCase();
  if (c.includes('frozen') || p.includes('frozen') || c.includes('dried') || p.includes('dried')) return false;
  if (c.includes('powder') || p.includes('powder') || c.includes('oil') || p.includes('oil')) return false;
  if (c.includes('pickle') || p.includes('pickle') || c.includes('jam') || p.includes('jam') || c.includes('chutney') || p.includes('chutney') || c.includes('sauce') || p.includes('sauce')) return false;
  if (c.includes('flour') || p.includes('atta') || c.includes('dal') || c.includes('seed') || c.includes('pulse')) return false;
  if (c.includes('fruit') || c.includes('veg') || c.includes('leaf') || c.includes('green') || c.includes('herb') || c.includes('produce')) return true;
  if (c.includes('fresh') || p.includes('fresh') || p.includes('raw mango') || p.includes('raw banana')) return true;
  const freshList = ['apple', 'banana', 'guava', 'papaya', 'mango', 'grapes', 'kiwi', 'strawberry', 'tomato', 'onion', 'potato', 'brinjal', 'bhindi', 'capsicum', 'cabbage', 'cauliflower', 'spinach', 'methi', 'coriander', 'curry leaves', 'basil', 'lemongrass', 'oregano', 'mint', 'drumstick', 'turai', 'karela', 'tinda', 'pumpkin', 'mushroom', 'corn', 'peanut'];
  if (freshList.some(item => p.includes(item))) return true;
  return false;
};

const getFreshCategory = (productName, categoryName) => {
  if (!productName) return categoryName || 'Fresh Produce';
  const p = productName.toLowerCase();
  
  if (p.includes('apple') || p.includes('banana') || p.includes('guava') || p.includes('papaya') || p.includes('mango') || p.includes('grapes') || p.includes('kiwi') || p.includes('strawberry') || p.includes('fruit')) return 'Fruits';
  if (p.includes('spinach') || p.includes('methi') || p.includes('coriander') || p.includes('curry leaves') || p.includes('basil') || p.includes('leaf')) return 'Leafy Greens';
  if (p.includes('lemongrass') || p.includes('oregano') || p.includes('mint') || p.includes('herb')) return 'Fresh Herbs';
  if (p.includes('tomato') || p.includes('onion') || p.includes('potato') || p.includes('brinjal') || p.includes('bhindi') || p.includes('capsicum') || p.includes('cabbage') || p.includes('cauliflower') || p.includes('veg')) return 'Vegetables';
  
  return 'Other Fresh Produce';
};

const isConnectedProduct = (categoryName, productName = '') => {
  if (!categoryName && !productName) return false;
  const lowerCat = (categoryName || '').toLowerCase();
  const lowerProd = (productName || '').toLowerCase();
  // Expanded logic for experiences and learning based on actual Odoo categories
  return lowerCat.includes('experience') || lowerCat.includes('learning') || lowerCat.includes('lear') || lowerCat.includes('service') || lowerCat.includes('event') || lowerCat.includes('gather') || lowerProd.includes('experience') || lowerProd.includes('learning');
};

const getProcessedCategory = (productName, fallbackCategory) => {
  if (!productName) {
    if (fallbackCategory && fallbackCategory.toLowerCase() === 'all') return 'Other';
    return fallbackCategory || 'Other';
  }
  
  const p = productName.toLowerCase();
  
  if (p.includes('pickle')) return 'Pickles';
  if (p.includes('atta') || p.includes('flour')) return 'Flour';
  if ((p.includes('haldi') && !p.includes('pickle')) || p.includes('spice')) return 'Spices';
  if (p.includes('powder') || p.includes('chia') || p.includes('flax') || p.includes('sesame') || p.includes('oregano') || p.includes('celery') || p.includes('dry') || p.includes('hibiscus')) return 'Super Foods';
  if (p.includes('dal') || p.includes('chana') || p.includes('gram')) return 'Pulses';
  if (p.includes('peanut')) return 'Oilseeds';
  if ((p.includes('wheat') && !p.includes('atta')) || p.includes('jau') || p.includes('bajra') || p.includes('besan') || p.includes('jawar') || p.includes('oats') || p.includes('daliya') || p.includes('bay leaf')) return 'Grains';
  
  const finalCategory = fallbackCategory || 'Other';
  if (finalCategory.toLowerCase() === 'all' || finalCategory.toLowerCase().startsWith('all /')) return 'Other';
  
  return finalCategory;
};

const getMappedFilterCategory = (categoryName, productName) => {
  if (isConnectedProduct(categoryName, productName)) return 'Connected (Experiences)';
  if (isFreshItem(categoryName, productName)) return 'Fresh Produce';
  return getProcessedCategory(productName, categoryName);
};

const SalesDashboard = () => {
  const { filters, setFilters, filterOptions, setFilterOptions } = useFilters();
  const [masterTab, setMasterTab] = useState('produce'); // 'produce' or 'connected'
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pos', 'website'
  const [connectedTab, setConnectedTab] = useState('all'); // 'all', 'learning', 'experiences'
  const [loading, setLoading] = useState(true);
  
  const [rawData, setRawData] = useState({
    saleOrders: [], posOrders: [], saleLines: [], posLines: [], productMap: {}, partnerMap: {}
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/sales-lines').then(r => r.json())
    ]).then(([sales, lines]) => {
      if (sales.error || lines.error) throw new Error(sales.error || lines.error);
      
      setRawData({
        saleOrders: sales.saleOrders || [],
        posOrders: sales.posOrders || [],
        partnerMap: sales.partnerMap || {},
        saleLines: lines.saleLines || [],
        posLines: lines.posLines || [],
        productMap: lines.productMap || {}
      });

      const uniqueCities = new Set();
      const uniqueCustomers = new Set();
      
      const specificCategories = ['Fresh Produce', 'Grains', 'Pulses', 'Pickles', 'Super Foods', 'Oilseeds', 'Spices', 'Flour', 'Connected (Experiences)'];

      Object.values(sales.partnerMap || {}).forEach(p => {
        if (p.city) uniqueCities.add(p.city);
        if (p.name) uniqueCustomers.add(p.name);
      });

      setFilterOptions({
        cities: Array.from(uniqueCities).sort(),
        customers: Array.from(uniqueCustomers).sort(),
        categories: specificCategories
      });

      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Failed to fetch data from Odoo Proxy');
      setLoading(false);
    });
  }, [setFilterOptions]);

  // Early return removed to show skeleton UI during load
  if (error) return <div style={{ padding: '24px', color: 'red' }}>{error}</div>;

  // -- FILTERING LOGIC (GLOBAL FILTERS) --
  const filterOrder = (order) => {
    if (!order) return false;
    
    const orderDate = new Date(order.date_order);
    
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0,0,0,0);
      if (orderDate < start) return false;
    }
    
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23,59,59,999);
      if (orderDate > end) return false;
    }

    if (order.partner_id) {
      const partner = rawData.partnerMap[order.partner_id[0]];
      if (filters.customer !== 'all' && partner?.name !== filters.customer) return false;
      if (filters.city !== 'all' && partner?.city !== filters.city) return false;
    } else if (filters.customer !== 'all' || filters.city !== 'all') {
      return false; 
    }
    return true;
  };

  const filteredSaleOrders = rawData.saleOrders.filter(filterOrder);
  const filteredPosOrders = rawData.posOrders.filter(filterOrder);

  const filterLine = (line, validOrderIds) => {
    if (!validOrderIds.has(line.order_id[0])) return false;
    
    // Determine the type of line based on GL Account
    const isProduce = line.account_code === '200110';
    const isExperiences = line.account_code === '200120';
    const isLearning = line.account_code === '200121';
    const isConn = isExperiences || isLearning;

    // Filter by Master Tab
    if (masterTab === 'produce' && !isProduce) return false;
    if (masterTab === 'connected') {
      if (!isConn) return false;
      if (connectedTab === 'experiences' && !isExperiences) return false;
      if (connectedTab === 'learning' && !isLearning) return false;
    }

    // Apply category filter for produce
    if (filters.category !== 'all' && isProduce) {
      const productInfo = rawData.productMap[line.product_id ? line.product_id[0] : null];
      const catName = productInfo?.category || '';
      const prodName = productInfo?.name || '';
      const mappedFilterCat = getMappedFilterCategory(catName, prodName);
      if (mappedFilterCat !== filters.category) return false;
    }
    
    return true;
  };

  const validSaleOrderIds = new Set(filteredSaleOrders.map(o => o.id));
  const validPosOrderIds = new Set(filteredPosOrders.map(o => o.id));

  const filteredSaleLines = rawData.saleLines.filter(l => filterLine(l, validSaleOrderIds));
  const filteredPosLines = rawData.posLines.filter(l => filterLine(l, validPosOrderIds));

  // Determine active dataset based on sub-tab
  let activeOrders = [];
  let activeLines = [];
  
  const finalSaleOrderIds = new Set(filteredSaleLines.map(l => l.order_id[0]));
  const finalPosOrderIds = new Set(filteredPosLines.map(l => l.order_id[0]));
  const finalSaleOrders = filteredSaleOrders.filter(o => finalSaleOrderIds.has(o.id));
  const finalPosOrders = filteredPosOrders.filter(o => finalPosOrderIds.has(o.id));

  // Ensure Connected Tab pulls both channels but ignores the Website/POS sub-tab (since services can be sold anywhere)
  if (masterTab === 'connected') {
     activeOrders = [...finalSaleOrders, ...finalPosOrders];
     activeLines = [...filteredSaleLines, ...filteredPosLines];
  } else {
    if (activeTab === 'website') {
       activeOrders = finalSaleOrders;
       activeLines = filteredSaleLines;
    } else if (activeTab === 'pos') {
       activeOrders = finalPosOrders;
       activeLines = filteredPosLines;
    } else {
       activeOrders = [...finalSaleOrders, ...finalPosOrders];
       activeLines = [...filteredSaleLines, ...filteredPosLines];
    }
  }
  const getRevenue = (line) => {
    return line.price_subtotal_incl || line.price_subtotal || 0;
  };

  // Global Calculations for Unified Dashboard View
  const globalWebSales = finalSaleOrders.reduce((sum, order) => sum + (order.amount_total || 0), 0);
  const globalPosSales = finalPosOrders.reduce((sum, order) => sum + (order.amount_total || 0), 0);
  const globalTotalSales = globalWebSales + globalPosSales;

  let globalPosFresh = 0;
  let globalPosProcessed = 0;
  let globalPosConnected = 0;
  
  filteredPosLines.forEach(line => {
    const isExperiences = line.account_code === '200120';
    const isLearning = line.account_code === '200121';
    const isConn = isExperiences || isLearning;
    
    const productId = line.product_id ? line.product_id[0] : null;
    const productInfo = rawData.productMap[productId];
    const categoryName = productInfo ? productInfo.category : 'Uncategorized';
    const revenue = getRevenue(line);
    
    if (isConn) globalPosConnected += revenue;
    else if (isFreshItem(categoryName, productInfo?.name)) globalPosFresh += revenue;
    else globalPosProcessed += revenue;
  });

  // -- COMPONENT CALCULATIONS --
  const totalSales = activeLines.reduce((sum, line) => sum + getRevenue(line), 0);
  const totalOrders = activeOrders.length;
  const grossProfit = totalSales * 0.25; 
  const aov = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  let freshRevenue = 0;
  let processedRevenue = 0;
  let connectedRevenue = 0;
  let learningRevenue = 0;
  let experiencesRevenue = 0;
  
  const processedCategoriesMap = {};
  const freshCategoriesMap = {};
  const productRevenueMap = {};

  activeLines.forEach(line => {
    const productId = line.product_id ? line.product_id[0] : null;
    const productName = cleanProductName(line.product_id ? line.product_id[1] : 'Unknown');
    const revenue = getRevenue(line);
    const productInfo = rawData.productMap[productId];
    const categoryName = productInfo ? productInfo.category : 'Uncategorized';
    
    const isExperiences = line.account_code === '200120';
    const isLearning = line.account_code === '200121';
    const isConn = isExperiences || isLearning;
    const isFr = isFreshItem(categoryName, productName);
    
    if (isConn) {
      connectedRevenue += revenue;
      if (isLearning) learningRevenue += revenue;
      if (isExperiences) experiencesRevenue += revenue;
      // Use the service name as the category for the breakdown chart
      processedCategoriesMap[productName] = (processedCategoriesMap[productName] || 0) + revenue;
    } else if (isFr) {
      freshRevenue += revenue;
      const frCat = getFreshCategory(productName, categoryName);
      freshCategoriesMap[frCat] = (freshCategoriesMap[frCat] || 0) + revenue;
    } else {
      processedRevenue += revenue;
      const pCat = getProcessedCategory(productName, categoryName);
      processedCategoriesMap[pCat] = (processedCategoriesMap[pCat] || 0) + revenue;
    }

    productRevenueMap[productName] = (productRevenueMap[productName] || 0) + revenue;
  });

  const freshVsProcessedData = [
    { name: 'Fresh', value: Math.round(freshRevenue) },
    { name: 'Processed', value: Math.round(processedRevenue) }
  ].filter(i => i.value > 0);

  const processedCategoryData = Object.keys(processedCategoriesMap).map(key => ({
    name: key,
    value: Math.round(processedCategoriesMap[key])
  })).sort((a,b) => b.value - a.value);

  const freshCategoryData = Object.keys(freshCategoriesMap).map(key => ({
    name: key,
    value: Math.round(freshCategoriesMap[key])
  })).sort((a,b) => b.value - a.value);

  const topProductsData = Object.keys(productRevenueMap).map(key => ({
    name: key,
    revenue: Math.round(productRevenueMap[key])
  })).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

  const customerMap = {};
  activeOrders.forEach(order => {
    if (order.partner_id) {
      const id = order.partner_id[0];
      const name = order.partner_id[1];
      if (!customerMap[id]) customerMap[id] = { id, name, orders: 0, revenue: 0 };
      customerMap[id].orders += 1;
      customerMap[id].revenue += (order.amount_total || 0);
    }
  });

  const allCustomers = Object.values(customerMap).sort((a, b) => b.revenue - a.revenue);
  const uniqueCustomers = allCustomers.length;
  const newCustomers = allCustomers.filter(c => c.orders === 1).length;
  const repeatCustomers = allCustomers.filter(c => c.orders > 1 && c.orders <= 3).length;
  const loyalCustomers = allCustomers.filter(c => c.orders > 3).length;
  const topCustomers = allCustomers.slice(0, 10);

  const customerSegments = [
    { name: 'One-Time Buyers', value: newCustomers },
    { name: 'Repeat (2-3 orders)', value: repeatCustomers },
    { name: 'Loyal (4+ orders)', value: loyalCustomers }
  ].filter(i => i.value > 0);

  const orderTimestampMap = {};
  rawData.saleOrders.concat(rawData.posOrders).forEach(o => {
    orderTimestampMap[o.id] = new Date(o.date_order).getTime();
  });

  const trendMap = {};
  activeLines.forEach(line => {
    const ts = orderTimestampMap[line.order_id[0]];
    if (!ts) return;
    
    const dateObj = new Date(ts);
    dateObj.setHours(0,0,0,0);
    const dayTs = dateObj.getTime();
    
    if (!trendMap[dayTs]) {
       trendMap[dayTs] = { 
         date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
         timestamp: dayTs,
         fresh: 0, 
         processed: 0, 
         learning: 0,
         experiences: 0,
         revenue: 0 
       };
    }
    
    const revenue = line.price_subtotal_incl || line.price_subtotal || 0;
    trendMap[dayTs].revenue += revenue;
    
    const productId = line.product_id ? line.product_id[0] : null;
    const productInfo = rawData.productMap[productId];
    const categoryName = productInfo ? productInfo.category : 'Uncategorized';
    
    if (line.account_code === '200120') {
      trendMap[dayTs].experiences += revenue;
    } else if (line.account_code === '200121') {
      trendMap[dayTs].learning += revenue;
    } else {
      if (isFreshItem(categoryName, productInfo?.name)) trendMap[dayTs].fresh += revenue;
      else trendMap[dayTs].processed += revenue;
    }
  });

  const trendData = Object.values(trendMap).map(d => ({
    ...d,
    revenue: Math.round(d.revenue),
    fresh: Math.round(d.fresh),
    processed: Math.round(d.processed),
    learning: Math.round(d.learning),
    experiences: Math.round(d.experiences)
  })).sort((a,b) => a.timestamp - b.timestamp);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (range) => {
    setFilters(prev => ({ ...prev, datePreset: 'custom', startDate: range.start, endDate: range.end, dateLabel: range.label }));
  };

  const dateValue = {
    start: filters.startDate || '2020-01-01',
    end: filters.endDate || new Date().toISOString().split('T')[0],
    label: filters.dateLabel || 'All Time'
  };

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
           <span style={{ fontSize: '16px', fontWeight: 500, color: '#f8fafc', letterSpacing: '0.5px' }}>Syncing Live General Ledger...</span>
        </div>
      )}
      
      <div>
      {/* Local Filter Bar */}
      <div style={{ display: 'flex', gap: '24px', background: 'var(--glass-bg)', padding: '16px 24px', borderRadius: '16px', border: 'var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <DateRangePicker value={dateValue} onChange={handleDateChange} />
        </div>

        <div className="filter-group">
          <label className="filter-label">Category</label>
          <div className="filter-input-wrapper">
            <select className="filter-select" value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}>
              <option value="all">All Categories</option>
              {filterOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} color="var(--text-muted)" />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">City</label>
          <div className="filter-input-wrapper">
            <select className="filter-select" value={filters.city} onChange={e => handleFilterChange('city', e.target.value)}>
              <option value="all">All Cities</option>
              {filterOptions.cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} color="var(--text-muted)" />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Customer</label>
          <div className="filter-input-wrapper">
            <select className="filter-select" value={filters.customer} onChange={e => handleFilterChange('customer', e.target.value)}>
              <option value="all">All Customers</option>
              {filterOptions.customers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} color="var(--text-muted)" />
          </div>
        </div>
      </div>

      <div className="flex-between mb-6" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Master Toggle */}
          <div className="tabs-container" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <button className={`tab-button ${masterTab === 'produce' ? 'active' : ''}`} onClick={() => setMasterTab('produce')}>Produce Sales</button>
            <button className={`tab-button ${masterTab === 'connected' ? 'active' : ''}`} onClick={() => setMasterTab('connected')}>Connected (Experiences & Learning)</button>
          </div>

          {/* Sub Toggle (Produce) */}
          {masterTab === 'produce' && (
            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="tabs-container" style={{ marginBottom: 0, borderBottom: 'none', borderLeft: '2px solid var(--border-color)', paddingLeft: '20px' }}>
                <button className={`tab-button ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Channels</button>
                <button className={`tab-button ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>POS</button>
                <button className={`tab-button ${activeTab === 'website' ? 'active' : ''}`} onClick={() => setActiveTab('website')}>Website</button>
              </div>
            </div>
          )}
          
          {/* Sub Toggle (Connected) */}
          {masterTab === 'connected' && (
            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="tabs-container" style={{ marginBottom: 0, borderBottom: 'none', borderLeft: '2px solid var(--border-color)', paddingLeft: '20px' }}>
                <button className={`tab-button ${connectedTab === 'all' ? 'active' : ''}`} onClick={() => setConnectedTab('all')}>All</button>
                <button className={`tab-button ${connectedTab === 'learning' ? 'active' : ''}`} onClick={() => setConnectedTab('learning')}>Learning</button>
                <button className={`tab-button ${connectedTab === 'experiences' ? 'active' : ''}`} onClick={() => setConnectedTab('experiences')}>Experiences</button>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Server size={14} /> Real Data Active 
          <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Connected</span>
        </div>
      </div>

      {/* --- SECTION 1: EXECUTIVE KPIs --- */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>{masterTab === 'connected' ? 'Connected Sales Metrics' : 'Produce Sales Summary'}</h2>
      <div className="dashboard-grid">
        <div className={(masterTab === 'produce' && activeTab === 'all') ? 'col-span-4 card' : 'col-span-3 card'}>
          <div className="card-header">
            <span className="card-title">
              {masterTab === 'connected' 
                 ? (connectedTab === 'learning' ? 'Total Learning' : connectedTab === 'experiences' ? 'Total Experiences' : 'Total Connected')
                 : (activeTab === 'pos' ? 'Total POS Sales' : activeTab === 'website' ? 'Total Website Sales' : 'Total Sales')}
            </span>
            <DollarSign size={18} color="var(--accent-primary)" />
          </div>
          <div className="metric-value">₹{totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          {masterTab === 'produce' && activeTab === 'pos' ? (
             <div className="metric-trend" style={{marginTop: '12px', gap: '16px', fontSize: '12px'}}>
                <span style={{color: '#10b981'}}>Fresh: ₹{globalPosFresh.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                <span style={{color: '#f59e0b'}}>Processed: ₹{globalPosProcessed.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
             </div>
          ) : masterTab === 'connected' && connectedTab === 'all' ? (
             <div className="metric-trend" style={{marginTop: '12px', gap: '16px', fontSize: '12px'}}>
                <span style={{color: '#3b82f6'}}>Learning: ₹{learningRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                <span style={{color: '#8b5cf6'}}>Experiences: ₹{experiencesRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
             </div>
          ) : (
             <div className="metric-trend trend-up"><TrendingUp size={14} /> Live Data</div>
          )}
        </div>
        
        {masterTab === 'produce' && activeTab === 'all' && (
          <>
            <div className="col-span-4 card">
              <div className="card-header">
                <span className="card-title">POS Sales</span>
                <DollarSign size={18} color="#059669" />
              </div>
              <div className="metric-value">₹{globalPosSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <div className="metric-trend" style={{marginTop: '12px', gap: '16px', fontSize: '12px'}}>
                <span style={{color: '#10b981'}}>Fresh: ₹{globalPosFresh.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                <span style={{color: '#f59e0b'}}>Processed: ₹{globalPosProcessed.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
            </div>
            <div className="col-span-4 card">
              <div className="card-header">
                <span className="card-title">Website Sales</span>
                <DollarSign size={18} color="#3b82f6" />
              </div>
              <div className="metric-value">₹{globalWebSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
          </>
        )}

        <div className={(masterTab === 'produce' && activeTab === 'all') ? 'col-span-4 card mt-4' : 'col-span-3 card'}>
          <div className="card-header">
            <span className="card-title">Total Orders</span>
            <ShoppingCart size={18} color="var(--color-success)" />
          </div>
          <div className="metric-value">{totalOrders}</div>
        </div>
        
        <div className={(masterTab === 'produce' && activeTab === 'all') ? 'col-span-4 card mt-4' : 'col-span-3 card'}>
          <div className="card-header">
            <span className="card-title">Avg Order Value</span>
            <Activity size={18} color="var(--color-warning)" />
          </div>
          <div className="metric-value">₹{aov.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
        </div>
        
        <div className={(masterTab === 'produce' && activeTab === 'all') ? 'col-span-4 card mt-4' : 'col-span-3 card'}>
          <div className="card-header">
            <span className="card-title">Total Customers</span>
            <Users size={18} color="var(--color-purple)" />
          </div>
          <div className="metric-value">{uniqueCustomers}</div>
        </div>
      </div>

      <div className="dashboard-grid mt-6">
        <div className="col-span-12 card">
          <div className="card-header">
            <span className="card-title">Sales Trend</span>
            <Activity size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ height: '300px', marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {masterTab === 'produce' ? (
                  <>
                    <Bar dataKey="fresh" name="Fresh Produce" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="processed" name="Processed" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="learning" name="Learning" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="experiences" name="Experiences" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </>
                )}
                <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="var(--accent-primary)" strokeWidth={3} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECTION 2: PRODUCT ANALYSIS --- */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>{masterTab === 'connected' ? 'Service Analysis' : 'Product & Category Analysis'}</h2>
      <div className="dashboard-grid">
         {activeTab !== 'website' && masterTab === 'produce' && (
           <div className="col-span-4 card">
             <div className="card-header">
               <span className="card-title">Fresh vs Processed (Revenue)</span>
             </div>
             <div style={{ height: '300px' }}>
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={freshVsProcessedData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                     <Cell fill="#059669" name="Fresh" />
                     <Cell fill="#d97706" name="Processed" />
                   </Pie>
                   <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }} />
                   <Legend />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>
         )}
         <div className={`col-span-${activeTab === 'website' || masterTab === 'connected' ? '12' : '8'} card`}>
           <div className="card-header">
             <span className="card-title">{masterTab === 'connected' ? 'Connected Service Breakdown' : 'Processed Categories Breakdown'}</span>
           </div>
           <div style={{ height: '300px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={processedCategoryData.slice(0, 12)} layout="vertical" margin={{ left: 40, right: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                 <XAxis type="number" stroke="var(--text-muted)" />
                 <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={110} tick={{fontSize: 11}} interval={0} />
                 <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }} />
                 <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} name="Revenue (₹)">
                   {processedCategoryData.slice(0, 12).map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
       </div>


      <div className="dashboard-grid mt-6">
        <div className="col-span-12 card">
          <div className="card-header">
            <span className="card-title">{masterTab === 'connected' ? 'Top Services by Revenue' : 'Top 10 Products by Revenue'}</span>
          </div>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{fontSize: 11}} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SECTION 3: CUSTOMER ANALYSIS --- */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>Customer Analysis</h2>
      <div className="dashboard-grid">
        <div className="col-span-4 card">
          <div className="card-header">
            <span className="card-title">Customer Purchase Frequency</span>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={customerSegments} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                  <Cell fill="#2563eb" name="New" />
                  <Cell fill="#059669" name="Repeat" />
                  <Cell fill="#7c3aed" name="Loyal" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-8 card">
          <div className="card-header">
            <span className="card-title">Top Customers by Revenue</span>
          </div>
          <div className="data-table-container" style={{ height: '300px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer Name</th>
                  <th>Orders</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length > 0 ? topCustomers.map((customer, idx) => (
                  <tr key={customer.id}>
                    <td>#{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{customer.name}</td>
                    <td>{customer.orders}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>₹{customer.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                )) : <tr><td colSpan="4" style={{textAlign: 'center'}}>No customer data matched the filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default SalesDashboard;
