import { NavLink } from 'react-router-dom';
import { DollarSign, Trash2, Sprout, CreditCard, Activity, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
        <Logo style={{ width: '64px', height: '64px', marginBottom: '12px' }} />
        <span style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)' }}>Uncompromised</span>
      </div>
      
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        <NavLink to="/operations" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Activity size={18} />
          Master Dashboard
        </NavLink>
        <NavLink to="/sales" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <DollarSign size={18} />
          Sales
        </NavLink>
        <NavLink to="/spoilage" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Trash2 size={18} />
          Spoilage
        </NavLink>
        <NavLink to="/produce" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Sprout size={18} />
          Produce
        </NavLink>
        <NavLink to="/receivables" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={18} />
          Receivables
        </NavLink>
      </nav>

      <div style={{ padding: '16px', marginTop: 'auto', borderTop: 'var(--glass-border)' }}>
        <button 
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s' }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
