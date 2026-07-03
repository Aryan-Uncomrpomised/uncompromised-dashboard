import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for auth state
    const authState = localStorage.getItem('uncompromised_auth');
    if (authState === 'true') {
      setIsAuthenticated(true);
    }
    
    // Initialize users array if empty
    if (!localStorage.getItem('uncompromised_users')) {
      localStorage.setItem('uncompromised_users', JSON.stringify([{username: 'admin', password: 'admin'}]));
    }
    
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const users = JSON.stringify(localStorage.getItem('uncompromised_users') || '[]');
    let parsedUsers = [];
    try {
      parsedUsers = JSON.parse(localStorage.getItem('uncompromised_users'));
    } catch(e) {}
    
    const userExists = parsedUsers.find(u => u.username === username && u.password === password);
    
    if (userExists) {
      localStorage.setItem('uncompromised_auth', 'true');
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'Invalid username or password' };
  };

  const register = (username, password) => {
    let parsedUsers = [];
    try {
      parsedUsers = JSON.parse(localStorage.getItem('uncompromised_users')) || [];
    } catch(e) {
      parsedUsers = [];
    }
    
    if (parsedUsers.find(u => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }
    
    parsedUsers.push({ username, password });
    localStorage.setItem('uncompromised_users', JSON.stringify(parsedUsers));
    
    // Auto-login after successful registration
    localStorage.setItem('uncompromised_auth', 'true');
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('uncompromised_auth');
    setIsAuthenticated(false);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
