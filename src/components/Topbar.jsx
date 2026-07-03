import { Sun, Moon, Filter } from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { useState, useEffect } from 'react';

const Topbar = () => {
  const { setFilters } = useFilters();
  const [theme, setTheme] = useState(() => localStorage.getItem('uncompromised_theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('uncompromised_theme', theme);
  }, [theme]);

  const resetFilters = () => {
    setFilters({ datePreset: 'custom', startDate: '2020-01-01', endDate: new Date().toISOString().split('T')[0], dateLabel: 'All Time', category: 'all', city: 'all', customer: 'all' });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* We can put a dynamic title here if we want, or leave it empty */}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button 
          onClick={toggleTheme} 
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button 
          onClick={resetFilters} 
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}
        >
          <Filter size={14} />
          Reset Filters
        </button>
      </div>
    </header>
  );
};

export default Topbar;
