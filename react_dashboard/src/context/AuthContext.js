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
      // Check for demo accounts first (for backward compatibility)
      const demoUsers = {
        'parent@demo.com': { role: 'parent', name: 'Parent User', email: 'parent@demo.com' },
        'doctor@demo.com': { role: 'doctor', name: 'Dr. Smith', email: 'doctor@demo.com' },
        'nurse@demo.com': { role: 'nurse', name: 'Nurse Johnson', email: 'nurse@demo.com' },
        'admin@demo.com': { role: 'admin', name: 'Admin', email: 'admin@demo.com' }
      };

      const demoUser = demoUsers[email];
      
      if (demoUser && password === 'role123') {
        // Demo mode login
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const userData = {
          ...demoUser,
          token: 'demo-token-' + Date.now(),
          isDemo: true
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        return userData;
      } else {
        // Real ThingsBoard authentication
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
          refreshToken: tbResponse.refreshToken,
          isDemo: false
        };
        
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        
        return userData;
      }
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
