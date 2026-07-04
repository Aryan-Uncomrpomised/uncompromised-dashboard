import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Sun, Moon } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      const result = login(username, password);
      if (result.success) {
        navigate('/operations');
      } else {
        setError(result.error || 'Invalid username or password');
      }
    } else {
      const result = register(username, password);
      if (result.success) {
        navigate('/operations');
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <Logo style={{ width: '96px', height: '96px', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Uncompromised</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {isLogin ? 'Sign in to access your dashboard' : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {error && (
            <div style={{ padding: '12px', fontSize: '14px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="username" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Username</label>
            <input 
              id="username"
              name="username"
              type="text" 
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: 'var(--glass-border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', outline: 'none' }}
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Password</label>
            <input 
              id="password"
              name="password"
              type="password" 
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: 'var(--glass-border)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', outline: 'none' }}
              placeholder="Enter password"
              required
            />
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', fontWeight: 600, padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', marginTop: '8px', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
          >
            {isLogin ? 'Sign In' : 'Create Account'}
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
