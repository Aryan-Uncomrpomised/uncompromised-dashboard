import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Sun, Moon, Eye, EyeOff, Leaf, UserPlus, LogIn } from 'lucide-react';

const FarmLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => localStorage.getItem('uncompromised_theme') || 'dark');

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('uncompromised_theme', theme);
  }, [theme]);

  const switchMode = (toLogin) => {
    setIsLogin(toLogin);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (isLogin) {
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
    } else {
      // Register with farm_team role
      const result = await register(username, password, 'farm_team');
      setLoading(false);
      if (result.success) {
        setSuccess('Account created! You are now signed in.');
        setTimeout(() => navigate('/spoilage'), 800);
      } else {
        setError(result.error || 'Error creating account');
      }
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: 'var(--glass-border)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-primary)',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '-120px', left: '-120px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(5,150,105,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Theme toggle */}
      <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Back to Admin */}
      <Link to="/login" style={{ position: 'absolute', top: '24px', left: '24px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        ← Admin Login
      </Link>

      <div className="card glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '36px 36px' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <Logo style={{ width: '80px', height: '80px', marginBottom: '12px' }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '999px', padding: '4px 14px', marginBottom: '10px' }}>
            <Leaf size={13} color="#10b981" />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', letterSpacing: '0.05em' }}>FARM TEAM PORTAL</span>
          </div>
          <h1 style={{ fontSize: '21px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {isLogin ? 'Farm Team Sign In' : 'Create Farm Team Account'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '5px', fontSize: '13px', textAlign: 'center' }}>
            {isLogin ? 'Access Spoilage & Produce dashboards' : 'Register a new farm team member'}
          </p>
        </div>

        {/* Sign In / Register toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)', gap: '4px' }}>
          <button type="button" onClick={() => switchMode(true)}
            style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: 'none', background: isLogin ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'transparent', color: isLogin ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <LogIn size={14} /> Sign In
          </button>
          <button type="button" onClick={() => switchMode(false)}
            style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: 'none', background: !isLogin ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'transparent', color: !isLogin ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <UserPlus size={14} /> Create Account
          </button>
        </div>

        {/* Access badges (sign in mode) */}
        {isLogin && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
            {['🌿 Spoilage', '🌱 Produce'].map(label => (
              <span key={label} style={{ fontSize: '12px', fontWeight: 500, padding: '4px 12px', borderRadius: '999px', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)', color: '#10b981' }}>{label}</span>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Error */}
          {error && (
            <div style={{ padding: '11px 14px', fontSize: '13px', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', lineHeight: 1.4 }}>
              {error}
            </div>
          )}
          {/* Success */}
          {success && (
            <div style={{ padding: '11px 14px', fontSize: '13px', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', lineHeight: 1.4 }}>
              ✅ {success}
            </div>
          )}

          {/* Username */}
          <div>
            <label htmlFor="farm-username" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '7px' }}>Username</label>
            <input
              id="farm-username" name="username" type="text" autoComplete="username"
              value={username} onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              placeholder={isLogin ? 'Enter your farm team username' : 'Choose a username'}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="farm-password" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '7px' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="farm-password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, padding: '12px 48px 12px 16px' }}
                placeholder={isLogin ? 'Enter password' : 'Choose a password (min 6 chars)'}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (register only) */}
          {!isLogin && (
            <div>
              <label htmlFor="farm-confirm" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '7px' }}>Confirm Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="farm-confirm" name="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    ...inputStyle, padding: '12px 48px 12px 16px',
                    border: confirmPassword && password !== confirmPassword
                      ? '1px solid rgba(239,68,68,0.6)'
                      : confirmPassword && password === confirmPassword
                        ? '1px solid rgba(16,185,129,0.5)'
                        : 'var(--glass-border)'
                  }}
                  placeholder="Re-enter password"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', margin: '4px 0 0' }}>Passwords don't match</p>
              )}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#374151' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: 'white', fontWeight: 700,
              padding: '13px 16px', borderRadius: '12px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px', fontSize: '14px', letterSpacing: '0.02em',
              transition: 'opacity 0.2s',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(5,150,105,0.35)'
            }}>
            {loading
              ? (isLogin ? 'Signing in...' : 'Creating account...')
              : (isLogin ? '🌿 Sign In to Farm Portal' : '🌱 Create Farm Team Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FarmLogin;
