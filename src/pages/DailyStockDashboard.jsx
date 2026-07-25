import React, { useState, useEffect, useMemo } from 'react';
import { useFilters } from '../context/FilterContext';
import DateRangePicker from '../components/DateRangePicker';
import { Upload, Download, Calendar, Mail, FileText, CheckCircle, AlertTriangle, ShieldCheck, Clock, Settings, Package, Search } from 'lucide-react';
import { cleanProductName } from '../utils/formatters';

const DailyStockDashboard = () => {
  const { filters, setFilters } = useFilters();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'settings'
  const [loading, setLoading] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  const [cropsList, setCropsList] = useState([]);
  
  // Date range filters for history log
  const [historySearch, setHistorySearch] = useState('');
  
  // CSV Upload States
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().slice(0, 10));
  const [csvFile, setCsvFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', message: '' }
  const [uploading, setUploading] = useState(false);

  // Configuration States
  const [config, setConfig] = useState({
    recipient_email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: false
  });
  const [configStatus, setConfigStatus] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);

  // Generate Date Strings for Comparison
  const getOffsetDateString = (offsetDays) => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const targetDate = new Date(Date.now() - tzOffset - (offsetDays * 86400000));
    return targetDate.toISOString().slice(0, 10);
  };

  const todayDate = getOffsetDateString(0);
  const yesterdayDate = getOffsetDateString(1);
  const dbyDate = getOffsetDateString(2);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const start = filters.startDate || '';
      const end = filters.endDate || '';
      const res = await fetch(`/api/stock-upload/history?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      setHistoryList(data.list || []);
      setCropsList(data.crops || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching history:', err);
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/stock-upload/config');
      const data = await res.json();
      setConfig({
        recipient_email: data.recipient_email || '',
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || 587,
        smtp_user: data.smtp_user || '',
        smtp_pass: '*****', // Mask password
        smtp_secure: !!data.smtp_secure
      });
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleDownloadTemplate = () => {
    window.open('/api/stock-upload/template', '_blank');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!csvText) {
      setUploadStatus({ type: 'error', message: 'Please select a valid CSV file first.' });
      return;
    }
    try {
      setUploading(true);
      setUploadStatus(null);
      const res = await fetch('/api/stock-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: uploadDate, csvText })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setUploadStatus({ type: 'success', message: `Successfully uploaded daily stock for ${uploadDate}! (${data.count} items recorded)` });
      setCsvFile(null);
      setCsvText('');
      fetchHistory();
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message || 'Failed to upload CSV template.' });
    } finally {
      setUploading(false);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      setConfigStatus(null);
      const res = await fetch('/api/stock-upload/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConfigStatus({ type: 'success', message: 'Notification settings saved successfully!' });
      fetchConfig();
    } catch (err) {
      setConfigStatus({ type: 'error', message: err.message || 'Failed to save configuration.' });
    }
  };

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      setConfigStatus(null);
      const res = await fetch('/api/stock-upload/test-email', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConfigStatus({ type: 'success', message: `Test email successfully sent to ${config.recipient_email}!` });
    } catch (err) {
      setConfigStatus({ type: 'error', message: `SMTP Test failed: ${err.message}` });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleDateChange = (range) => {
    setFilters(prev => ({
      ...prev,
      datePreset: 'custom',
      startDate: range.start,
      endDate: range.end,
      dateLabel: range.label
    }));
  };

  const dateValue = {
    start: filters.startDate || '2020-01-01',
    end: filters.endDate || new Date().toISOString().split('T')[0],
    label: filters.dateLabel || 'All Time'
  };

  // Compile Comparative Grid (Today, Yesterday, Day Before Yesterday)
  const comparisonGrid = useMemo(() => {
    return cropsList.map(crop => {
      const todayDoc = historyList.find(h => h.date === todayDate);
      const yesterdayDoc = historyList.find(h => h.date === yesterdayDate);
      const dbyDoc = historyList.find(h => h.date === dbyDate);

      const todayVal = todayDoc?.items.find(i => i.product === crop)?.qty;
      const yesterdayVal = yesterdayDoc?.items.find(i => i.product === crop)?.qty;
      const dbyVal = dbyDoc?.items.find(i => i.product === crop)?.qty;

      return {
        product: cleanProductName(crop),
        rawName: crop,
        today: todayVal !== undefined ? Number(todayVal).toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '-',
        yesterday: yesterdayVal !== undefined ? Number(yesterdayVal).toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '-',
        dby: dbyVal !== undefined ? Number(dbyVal).toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '-'
      };
    });
  }, [cropsList, historyList, todayDate, yesterdayDate, dbyDate]);

  // Filtered History list
  const filteredHistory = useMemo(() => {
    return historyList.filter(row => {
      const query = historySearch.toLowerCase();
      return row.date.includes(query) || row.items.some(i => i.product.toLowerCase().includes(query));
    });
  }, [historyList, historySearch]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Daily Stock Manager</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Upload daily stock counts, view comparisons, and configure late alerts.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="tabs-container" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <button className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
              <FileText size={15} style={{ marginRight: '6px' }} /> Upload & Comparison
            </button>
            <button className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
              <Settings size={15} style={{ marginRight: '6px' }} /> Notification Settings
            </button>
          </div>
          <DateRangePicker value={dateValue} onChange={handleDateChange} />
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Upload Panel */}
          <div className="card space-y-4" style={{ height: 'fit-content' }}>
            <div className="card-header">
              <span className="card-title flex items-center gap-2">
                <Upload size={18} color="var(--accent-primary)" /> Daily Stock Upload
              </span>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              1. Download the template CSV with active crops. <br />
              2. Enter the quantity available. <br />
              3. Select the date and upload the CSV sheet.
            </p>

            <button 
              onClick={handleDownloadTemplate}
              className="drp-trigger"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 18px', width: '100%', background: 'var(--glass-bg)', border: 'var(--glass-border)', color: 'var(--text-primary)', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Download size={16} /> Download CSV Template
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Upload Stock Date</span>
                <input 
                  type="date" 
                  required
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Choose CSV File</span>
                <input 
                  type="file" 
                  accept=".csv"
                  required
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px dashed var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
                />
              </div>

              {uploadStatus && (
                <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: uploadStatus.type === 'success' ? '#10b981' : '#ef4444' }}>
                  {uploadStatus.type === 'success' ? <CheckCircle size={16} style={{ flexShrink: 0 }} /> : <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={uploading || !csvFile}
                style={{ width: '100%', padding: '10px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: csvFile ? 'pointer' : 'not-allowed', opacity: csvFile ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {uploading ? 'Uploading...' : 'Submit Daily Stock'}
              </button>
            </form>
          </div>

          {/* Card 2: 3-Day Stock Comparison Grid */}
          <div className="card col-span-2 space-y-4">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title flex items-center gap-2">
                <Clock size={18} color="var(--color-warning)" /> 3-Day Stock Comparison
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '20px' }}>
                Refreshed live
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Compare stock levels between today, yesterday, and the day before yesterday to verify entries and check depletion trends.
            </p>

            <div className="data-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Crop</th>
                    <th style={{ textAlign: 'right' }}>Day Before Yesterday ({dbyDate})</th>
                    <th style={{ textAlign: 'right' }}>Yesterday ({yesterdayDate})</th>
                    <th style={{ textAlign: 'right' }}>Today ({todayDate})</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonGrid.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: 600 }}>{row.product}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{row.dby}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{row.yesterday}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>{row.today}</td>
                    </tr>
                  ))}
                  {comparisonGrid.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No historical manual stock data uploaded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2: Comprehensive Log File History */}
          <div className="card col-span-3 space-y-4" style={{ gridColumn: 'span 3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title flex items-center gap-2">
                <FileText size={18} color="var(--color-success)" /> Uploaded History Log
              </span>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{ padding: '6px 12px 6px 30px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', width: '200px' }}
                />
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Upload Date</th>
                    <th style={{ textAlign: 'left' }}>Uploaded At</th>
                    <th style={{ textAlign: 'right' }}>Total Crops Logged</th>
                    <th style={{ textAlign: 'left', paddingLeft: '40px' }}>Items Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.date}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(row.uploaded_at).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.items.length}</td>
                      <td style={{ color: 'var(--text-secondary)', paddingLeft: '40px', fontSize: '12px' }}>
                        {row.items.slice(0, 4).map(i => `${cleanProductName(i.product)}: ${Number(i.qty).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Kg`).join(', ')}
                        {row.items.length > 4 ? ` ... and ${row.items.length - 4} more` : ''}
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No historical logs match your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Settings Panel */
        <div className="card space-y-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header">
            <span className="card-title flex items-center gap-2">
              <Mail size={18} color="var(--accent-primary)" /> SMTP Notification Settings
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure SMTP credentials to automatically send email notifications if the daily stock template is not uploaded by 8:00 PM local time.
          </p>

          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Recipient Email Address</span>
                <input 
                  type="email" 
                  required
                  placeholder="admin@beyondzerofarms.com" 
                  value={config.recipient_email}
                  onChange={(e) => setConfig({ ...config, recipient_email: e.target.value })}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>SMTP Outgoing Server Host</span>
                <input 
                  type="text" 
                  required
                  placeholder="smtp.gmail.com" 
                  value={config.smtp_host}
                  onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>SMTP Port</span>
                <input 
                  type="number" 
                  required
                  placeholder="587" 
                  value={config.smtp_port}
                  onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 587 })}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>SMTP Username (User Email)</span>
                <input 
                  type="text" 
                  placeholder="alerts@beyondzerofarms.com" 
                  value={config.smtp_user}
                  onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>SMTP Password</span>
                <input 
                  type="password" 
                  placeholder="••••••••••••••" 
                  value={config.smtp_pass}
                  onChange={(e) => setConfig({ ...config, smtp_pass: e.target.value })}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="smtp_secure"
                checked={config.smtp_secure}
                onChange={(e) => setConfig({ ...config, smtp_secure: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="smtp_secure" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Use Secure Connection (SSL/TLS - Port 465)
              </label>
            </div>

            {configStatus && (
              <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: configStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: configStatus.type === 'success' ? '#10b981' : '#ef4444' }}>
                {configStatus.type === 'success' ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
                <span>{configStatus.message}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', paddingTop: '16px' }}>
              <button 
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail || !config.smtp_user}
                style={{ padding: '10px 20px', background: 'var(--glass-bg)', border: 'var(--glass-border)', color: 'var(--text-primary)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: config.smtp_user ? 'pointer' : 'not-allowed', opacity: config.smtp_user ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {testingEmail ? 'Sending Test...' : 'Send Test Email'}
              </button>
              
              <button 
                type="submit" 
                style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Save Notification Config
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DailyStockDashboard;
