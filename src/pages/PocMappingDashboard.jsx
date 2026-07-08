import React, { useState, useEffect } from 'react';
import { Download, Upload, Search, UserCheck, Plus, Save, AlertCircle, Check } from 'lucide-react';

const PocMappingDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'unmapped'
  const [newPartner, setNewPartner] = useState('');
  const [newPoc, setNewPoc] = useState('');
  const [savedRow, setSavedRow] = useState(null); // tracking row which was saved

  // Temporary state for editing POCs in-table before saving
  const [editedPocs, setEditedPocs] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch mapped
      const resMapped = await fetch('/api/partner-pocs');
      const dataMapped = await resMapped.json();
      setMappings(dataMapped.list || []);

      // Fetch unmapped
      const resUnmapped = await fetch('/api/partner-pocs/unmapped');
      const dataUnmapped = await resUnmapped.json();
      setUnmapped(dataUnmapped.unmapped || []);

      // Reset editing states
      setEditedPocs({});
      setLoading(false);
    } catch (err) {
      console.error('Error fetching mappings:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePocChange = (partnerName, val) => {
    setEditedPocs(prev => ({
      ...prev,
      [partnerName]: val
    }));
  };

  const handleSaveRow = async (partnerName) => {
    const poc = editedPocs[partnerName] !== undefined ? editedPocs[partnerName] : '';
    try {
      setSyncing(true);
      const res = await fetch('/api/partner-pocs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_name: partnerName, poc })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Visual feedback
      setSavedRow(partnerName);
      setTimeout(() => setSavedRow(null), 2000);

      // Refresh data
      const resMapped = await fetch('/api/partner-pocs');
      const dataMapped = await resMapped.json();
      setMappings(dataMapped.list || []);

      const resUnmapped = await fetch('/api/partner-pocs/unmapped');
      const dataUnmapped = await resUnmapped.json();
      setUnmapped(dataUnmapped.unmapped || []);
    } catch (err) {
      console.error(err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddCustom = async (e) => {
    e.preventDefault();
    if (!newPartner.trim()) return;
    try {
      setSyncing(true);
      const res = await fetch('/api/partner-pocs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_name: newPartner.trim(), poc: newPoc.trim() })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setNewPartner('');
      setNewPoc('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert(`Failed to add: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadTemplate = () => {
    let csv = "Partner Name,POC\n";
    // Existing mappings
    mappings.forEach(m => {
      const name = m.partner_name.includes(',') ? `"${m.partner_name.replace(/"/g, '""')}"` : m.partner_name;
      const poc = m.poc.includes(',') ? `"${m.poc.replace(/"/g, '""')}"` : m.poc;
      csv += `${name},${poc}\n`;
    });
    // Unmapped partners
    unmapped.forEach(name => {
      const escapedName = name.includes(',') ? `"${name.replace(/"/g, '""')}"` : name;
      csv += `${escapedName},\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "partner_poc_mappings.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/);
      const bulkMappings = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (parts.length >= 2) {
          const partner_name = parts[0].replace(/^"|"$/g, '').trim();
          const poc = parts[1].replace(/^"|"$/g, '').trim();
          if (partner_name) {
            bulkMappings.push({ partner_name, poc });
          }
        }
      }
      
      if (bulkMappings.length === 0) {
        alert("No valid mapping rows found in CSV!");
        return;
      }
      
      try {
        setSyncing(true);
        const res = await fetch('/api/partner-pocs/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mappings: bulkMappings })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        alert(`Successfully imported ${bulkMappings.length} mappings!`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert(`Import failed: ${err.message}`);
      } finally {
        setSyncing(false);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // Filter items
  const filteredMappings = mappings.filter(item => {
    const query = searchQuery.toLowerCase();
    return item.partner_name.toLowerCase().includes(query) || (item.poc && item.poc.toLowerCase().includes(query));
  });

  const filteredUnmapped = unmapped.filter(name => 
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6" style={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {(loading || syncing) && (
        <div style={{
          position: 'absolute', top: -20, left: -20, right: -20, bottom: -20,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <span style={{ fontSize: '16px', fontWeight: 500, color: '#f8fafc' }}>
            {loading ? 'Loading Mappings...' : 'Saving Changes...'}
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>Ledger POC Mapping</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Map customer ledgers to specific Points of Contact (POCs) for collecting receivables.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleDownloadTemplate} 
            className="drp-trigger"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--glass-bg)', border: 'var(--glass-border)', color: 'var(--text-primary)', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Download size={16} />
            Download Mappings CSV
          </button>
          
          <label 
            className="drp-trigger"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--accent-primary)', color: '#ffffff', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Upload size={16} />
            Import CSV
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImport} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="card">
        <div className="card-header">
          <span className="card-title flex items-center gap-2"><Plus size={18} /> Add New Partner Mapping</span>
        </div>
        <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Partner/Customer Name</span>
            <input 
              type="text" 
              required
              placeholder="e.g. Ashok Kumar Jain HUF" 
              value={newPartner}
              onChange={(e) => setNewPartner(e.target.value)}
              style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>POC Name</span>
            <input 
              type="text" 
              placeholder="e.g. Saurabh" 
              value={newPoc}
              onChange={(e) => setNewPoc(e.target.value)}
              style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>
          <button 
            type="submit" 
            style={{ padding: '10px 24px', background: 'var(--glass-bg)', border: 'var(--glass-border)', color: 'var(--text-primary)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', height: '43px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Create
          </button>
        </form>
      </div>

      {/* Main mapping display */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          {/* Tab Selector */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setActiveTab('all')}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', background: activeTab === 'all' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              All Mappings ({mappings.length})
            </button>
            <button 
              onClick={() => setActiveTab('unmapped')}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', background: activeTab === 'unmapped' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'unmapped' ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              Unassigned ({unmapped.length})
              {unmapped.length > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '11px', fontWeight: 700 }}>!</span>}
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder={activeTab === 'all' ? "Search mapped partner or POC..." : "Search unmapped partner..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '240px', padding: '8px 12px 8px 30px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="data-table-container" style={{ marginTop: '16px', maxHeight: '500px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1 }}>
              <tr>
                <th style={{ textAlign: 'left' }}>Ledger/Partner Name</th>
                <th style={{ textAlign: 'left' }}>Assigned POC</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'all' ? (
                filteredMappings.map((row) => {
                  const currentValue = editedPocs[row.partner_name] !== undefined ? editedPocs[row.partner_name] : row.poc;
                  const isDirty = editedPocs[row.partner_name] !== undefined && editedPocs[row.partner_name] !== row.poc;
                  const isSaved = savedRow === row.partner_name;

                  return (
                    <tr key={row.partner_name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: 500 }}>{row.partner_name}</td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="Assign POC..."
                          value={currentValue}
                          onChange={(e) => handlePocChange(row.partner_name, e.target.value)}
                          style={{ padding: '6px 12px', width: '180px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleSaveRow(row.partner_name)}
                          disabled={!isDirty}
                          style={{
                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: isDirty ? 'pointer' : 'default',
                            background: isSaved ? 'rgba(16, 185, 129, 0.2)' : isDirty ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                            color: isSaved ? '#10b981' : isDirty ? '#ffffff' : 'var(--text-muted)',
                            display: 'inline-flex', alignItems: 'center', gap: '4px', float: 'right'
                          }}
                        >
                          {isSaved ? <Check size={14} /> : <Save size={14} />}
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                filteredUnmapped.map((name) => {
                  const currentValue = editedPocs[name] || '';
                  const isDirty = !!currentValue;
                  const isSaved = savedRow === name;

                  return (
                    <tr key={name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{name}</td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="Assign POC..."
                          value={currentValue}
                          onChange={(e) => handlePocChange(name, e.target.value)}
                          style={{ padding: '6px 12px', width: '180px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleSaveRow(name)}
                          disabled={!isDirty}
                          style={{
                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: isDirty ? 'pointer' : 'default',
                            background: isSaved ? 'rgba(16, 185, 129, 0.2)' : isDirty ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                            color: isSaved ? '#10b981' : isDirty ? '#ffffff' : 'var(--text-muted)',
                            display: 'inline-flex', alignItems: 'center', gap: '4px', float: 'right'
                          }}
                        >
                          {isSaved ? <Check size={14} /> : <Save size={14} />}
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              {((activeTab === 'all' && filteredMappings.length === 0) || (activeTab === 'unmapped' && filteredUnmapped.length === 0)) && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={24} />
                      <span>No mappings found matching your criteria.</span>
                    </div>
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

export default PocMappingDashboard;
