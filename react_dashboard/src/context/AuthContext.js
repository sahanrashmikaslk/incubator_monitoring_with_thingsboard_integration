import React, { createContext, useState, useContext, useEffect } from 'react';
import tbService from '../services/thingsboard.service';
import parentService from '../services/parent.service';
import adminBackendService from '../services/admin-backend.service';

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
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed?.backend === 'admin' && parsed?.token) {
          adminBackendService.setToken(parsed.token);
        }
      } catch (err) {
        console.warn('Failed to restore saved user session', err);
        localStorage.removeItem('user');
        adminBackendService.clearToken();
      }
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    const demoUsers = {
      'doctor@demo.com': { name: 'Dr. Demo', role: 'doctor' },
      'nurse@demo.com': { name: 'Nurse Demo', role: 'nurse' },
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

    // Check if this is an admin login attempt (try admin backend first for admin users)
    if (identifier && identifier.includes('@')) {
      try {
        console.log('Attempting admin backend login for:', identifier);
        const adminResponse = await adminBackendService.login(identifier, password);
        
        console.log('Admin backend response:', adminResponse);
        
        if (adminResponse && adminResponse.admin) {
          const userData = {
            email: adminResponse.admin.email,
            name: adminResponse.admin.name,
            role: 'admin',
            token: adminResponse.token,
            backend: 'admin',
            adminId: adminResponse.admin.id
          };

          console.log('Admin login successful, user data:', userData);
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          adminBackendService.setToken(adminResponse.token);
          return userData;
        }
      } catch (adminError) {
        // Not an admin user or wrong credentials, continue to other login methods
        console.log('Admin backend login failed:', adminError.message);
        console.log('Trying other login methods...');
      }
    }

    try {
      // Attempt ThingsBoard authentication
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
    if (user?.backend === 'admin') {
      adminBackendService.clearToken();
    }
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
