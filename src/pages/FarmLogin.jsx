import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Sun, Moon, Eye, EyeOff, Leaf } from 'lucide-react';

const FarmLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => localStorage.getItem('uncompromised_theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('uncompromised_theme', theme);
  }, [theme]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      if (result.user?.role !== 'farm_team') {
        setError('This portal is for Farm Team accounts only. Please use the main login.');
        logout();
        return;
      }
      navigate('/spoilage');
    } else {
      setError(result.error || 'Invalid username or password');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Green nature-themed background blobs */}
      <div style={{
        position: 'absolute', top: '-120px', left: '-120px',
        width: '400px', height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(5,150,105,0.18) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', right: '-100px',
        width: '350px', height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Link to main login */}
      <Link to="/login" style={{
        position: 'absolute', top: '24px', left: '24px',
        fontSize: '13px', color: 'var(--text-muted)',
        textDecoration: 'none',
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        transition: 'color 0.2s'
      }}>
        ← Admin Login
      </Link>

      <div className="card glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px 36px' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <Logo style={{ width: '88px', height: '88px', marginBottom: '14px' }} />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(5,150,105,0.12)',
            border: '1px solid rgba(5,150,105,0.3)',
            borderRadius: '999px',
            padding: '4px 14px',
            marginBottom: '12px'
          }}>
            <Leaf size={14} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', letterSpacing: '0.04em' }}>FARM TEAM PORTAL</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Farm Team Sign In</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px', textAlign: 'center' }}>
            Access Spoilage & Produce dashboards
          </p>
        </div>

        {/* Access badges */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
          {['🌿 Spoilage', '🌱 Produce'].map(label => (
            <span key={label} style={{
              fontSize: '12px', fontWeight: 500,
              padding: '4px 12px', borderRadius: '999px',
              background: 'rgba(5,150,105,0.1)',
              border: '1px solid rgba(5,150,105,0.25)',
              color: '#10b981'
            }}>{label}</span>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '12px', fontSize: '13px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="farm-username" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Username</label>
            <input
              id="farm-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: 'var(--glass-border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
              placeholder="Enter your farm team username"
              required
            />
          </div>

          <div>
            <label htmlFor="farm-password" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="farm-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-secondary)', border: 'var(--glass-border)', borderRadius: '12px', padding: '12px 48px 12px 16px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#374151' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: 'white',
              fontWeight: 700,
              padding: '13px 16px',
              borderRadius: '12px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              fontSize: '14px',
              letterSpacing: '0.02em',
              transition: 'opacity 0.2s',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(5,150,105,0.35)'
            }}
          >
            {loading ? 'Signing in...' : '🌿 Sign In to Farm Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FarmLogin;
