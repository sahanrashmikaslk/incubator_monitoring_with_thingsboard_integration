import React, { createContext, useState, useContext, useEffect } from 'react';
import tbService from '../services/thingsboard.service';
import parentService from '../services/parent.service';

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

  const login = async (identifier, password) => {
    const demoUsers = {
      'doctor@demo.com': { name: 'Dr. Demo', role: 'doctor' },
      'nurse@demo.com': { name: 'Nurse Demo', role: 'nurse' },
      'admin@demo.com': { name: 'Admin Demo', role: 'admin' },
      'parent@demo.com': { name: 'Parent Demo', role: 'parent' }
    };

    const isPhoneLogin = identifier && !identifier.includes('@');

    if (isPhoneLogin) {
      if (!parentService.hasBackend) {
        throw new Error('Parent portal backend is not configured');
      }

      const response = await parentService.login(identifier, password);
      const userData = {
        phone: identifier,
        name: response.parent?.name || 'Parent',
        role: 'parent',
        token: response.token,
        babyId: response.parent?.babyId,
        backend: 'parent'
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }

    try {
      // Attempt ThingsBoard authentication first
      const tbResponse = await tbService.login(identifier, password);

      let role = 'doctor';
      if (identifier.includes('parent')) role = 'parent';
      else if (identifier.includes('admin')) role = 'admin';
      else if (identifier.includes('nurse')) role = 'nurse';

      const userData = {
        email: identifier,
        name: tbResponse.name || identifier.split('@')[0],
        role,
        token: tbResponse.token,
        refreshToken: tbResponse.refreshToken
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.warn('ThingsBoard login failed, attempting demo login fallback.', error?.message || error);

      const demoEntry = demoUsers[identifier?.toLowerCase()];
      if (demoEntry && password === 'role123') {
        const userData = {
          email: identifier,
          name: demoEntry.name,
          role: demoEntry.role,
          token: 'demo-token',
          refreshToken: null,
          isDemo: true
        };

        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      }

      throw error;
    }
  };

  const logout = () => {
    const shouldLogoutFromThingsboard = user?.role && user.role !== 'parent';
    setUser(null);
    localStorage.removeItem('user');
    if (shouldLogoutFromThingsboard) {
      tbService.logout();
    }
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
