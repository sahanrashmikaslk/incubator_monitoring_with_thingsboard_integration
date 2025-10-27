import React, { createContext, useState, useContext, useEffect } from 'react';
import tbService from '../services/thingsboard.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Authenticate via ThingsBoard
      const tbResponse = await tbService.login(email, password);

      // Determine user role based on email or use default
      let role = 'doctor'; // Default role for ThingsBoard users
      if (email.includes('parent')) role = 'parent';
      else if (email.includes('admin')) role = 'admin';
      else if (email.includes('nurse')) role = 'nurse';

      const userData = {
        email,
        name: tbResponse.name || email.split('@')[0],
        role,
        token: tbResponse.token,
        refreshToken: tbResponse.refreshToken
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    tbService.logout();
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
