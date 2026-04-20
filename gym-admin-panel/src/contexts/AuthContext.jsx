import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getToken,
  setToken,
  removeToken,
  getAdminData,
  setAdminData,
} from '../utils/auth';

// Single source of truth for the logged-in admin. Pages should read role and
// permissions from here instead of hitting localStorage on every render.

const AuthContext = createContext({
  admin: null,
  isAuthenticated: false,
  isSuperAdmin: false,
  hasPermission: () => false,
  login: () => {},
  logout: () => {},
  refresh: () => {},
});

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => (getToken() ? getAdminData() : null));

  // Keep memory + localStorage in sync across tabs and hard reloads.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'gym_pro_admin_token' || e.key === 'gym_pro_admin_data') {
        setAdmin(getToken() ? getAdminData() : null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(({ token, admin: adminData }) => {
    setToken(token);
    setAdminData(adminData);
    setAdmin(adminData);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setAdmin(null);
  }, []);

  const refresh = useCallback(() => {
    setAdmin(getToken() ? getAdminData() : null);
  }, []);

  const value = useMemo(() => {
    const isSuper = admin?.role === 'super_admin';
    return {
      admin,
      isAuthenticated: !!admin,
      isSuperAdmin: isSuper,
      hasPermission: (perm) => isSuper || !!admin?.permissions?.[perm],
      login,
      logout,
      refresh,
    };
  }, [admin, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
