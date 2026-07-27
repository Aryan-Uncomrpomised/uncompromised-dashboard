import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin'); // 'admin' or 'operator'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, register, logout } = useAuth();
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isLogin) {
      const result = await login(username, password);
      if (result.success) {
        // Enforce role selection match
        if (result.user?.role !== role) {
          setError(`Invalid credentials. This account is not registered as an ${role === 'admin' ? 'Admin' : 'Operator'}.`);
          logout(); // Clear session
          return;
        }
        
        if (result.user?.role === 'operator') {
          navigate('/daily-stock');
        } else {
          navigate('/operations');
        }
      } else {
        setError(result.error || 'Invalid username or password');
      }
    } else {
      const result = await register(username, password, role);
      if (result.success) {
        if (role === 'operator') {
          navigate('/daily-stock');
        } else {
          navigate('/operations');
        }
      } else {
        setError(result.error || 'Error creating account');
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      
      <button 
        onClick={toggleTheme} 
        style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="card glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <Logo style={{ width: '96px', height: '96px', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Uncompromised</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px', textAlign: 'center' }}>
            {isLogin ? `Sign in to access the ${role === 'admin' ? 'Admin' : 'Operator'} panel` : `Create a new ${role === 'admin' ? 'Admin' : 'Operator'} account`}
          </p>
        </div>

        {/* Tab Selection Section */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
          <button 
            type="button"
            onClick={() => { setRole('admin'); setError(''); }}
            style={{ flex: 1, padding: '8px 16px', borderRadius: '8px', border: 'none', background: role === 'admin' ? 'var(--accent-primary)' : 'transparent', color: role === 'admin' ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px' }}
          >
            Admin
          </button>
          <button 
            type="button"
            onClick={() => { setRole('operator'); setError(''); }}
            style={{ flex: 1, padding: '8px 16px', borderRadius: '8px', border: 'none', background: role === 'operator' ? 'var(--accent-primary)' : 'transparent', color: role === 'operator' ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px' }}
          >
            Operator
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '12px', fontSize: '13px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', lineHeight: 1.4 }}>
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="username" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Username</label>
            <input 
              id="username"
              name="username"
              type="text" 
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: 'var(--glass-border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
              placeholder={`Enter ${role} username`}
              required
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                id="password"
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
                style={{ position: 'absolute', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', fontWeight: 600, padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', marginTop: '8px', transition: 'background 0.2s', fontSize: '14px' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
          >
            {isLogin ? `Sign In as ${role === 'admin' ? 'Admin' : 'Operator'}` : `Register as ${role === 'admin' ? 'Admin' : 'Operator'}`}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {isLogin ? 'Create one' : 'Log in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
