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
    
    // Clear old pre-seeded users database to wipe out default admin/admin & operator/operator
    const parsed = JSON.parse(localStorage.getItem('uncompromised_users') || '[]');
    const hasDefaultUsers = parsed.some(
      u => (u.username === 'admin' && u.password === 'admin') || 
           (u.username === 'operator' && u.password === 'operator')
    );
    if (hasDefaultUsers || !localStorage.getItem('uncompromised_users')) {
      localStorage.setItem('uncompromised_users', JSON.stringify([]));
      // Reset active sessions
      localStorage.removeItem('uncompromised_auth');
      localStorage.removeItem('uncompromised_user');
      setIsAuthenticated(false);
      setUser(null);
    }
    
    setLoading(false);
  }, []);

  const login = (username, password) => {
    let parsedUsers = [];
    try {
      parsedUsers = JSON.parse(localStorage.getItem('uncompromised_users')) || [];
    } catch(e) {}
    
    const userExists = parsedUsers.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    
    if (userExists) {
      localStorage.setItem('uncompromised_auth', 'true');
      localStorage.setItem('uncompromised_user', JSON.stringify(userExists));
      setIsAuthenticated(true);
      setUser(userExists);
      return { success: true, user: userExists };
    }
    return { success: false, error: 'Invalid username or password' };
  };

  const register = (username, password, role = 'admin') => {
    let parsedUsers = [];
    try {
      parsedUsers = JSON.parse(localStorage.getItem('uncompromised_users')) || [];
    } catch(e) {
      parsedUsers = [];
    }
    
    if (parsedUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }
    
    const newUser = { username, password, role };
    parsedUsers.push(newUser);
    localStorage.setItem('uncompromised_users', JSON.stringify(parsedUsers));
    
    // Auto-login after successful registration
    localStorage.setItem('uncompromised_auth', 'true');
    localStorage.setItem('uncompromised_user', JSON.stringify(newUser));
    setIsAuthenticated(true);
    setUser(newUser);
    return { success: true, user: newUser };
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
