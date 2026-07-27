import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for auth state
    const authState = localStorage.getItem('uncompromised_auth');
    const storedUser = localStorage.getItem('uncompromised_user');
    if (authState === 'true' && storedUser) {
      setIsAuthenticated(true);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.success && data.user) {
        localStorage.setItem('uncompromised_auth', 'true');
        localStorage.setItem('uncompromised_user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (username, password, role = 'admin') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.success && data.user) {
        localStorage.setItem('uncompromised_auth', 'true');
        localStorage.setItem('uncompromised_user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('uncompromised_auth');
    localStorage.removeItem('uncompromised_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
