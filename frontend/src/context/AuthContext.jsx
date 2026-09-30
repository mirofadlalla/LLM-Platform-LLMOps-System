/**
 * AuthContext.jsx
 *
 * Global authentication state.  Wrap the app with <AuthProvider> and use
 * useAuth() anywhere inside it.
 *
 * State the context holds:
 *   user      — { user_id, username } | null
 *   isLogged  — boolean
 *
 * Actions:
 *   login(credentials)  → calls POST /auth/login, persists JWT
 *   register(data)      → calls POST /auth/register, then auto-logs in
 *   logout()            → clears JWT + user, redirects to /login
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { authService, getStoredUser, clearJwt, clearStoredUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    setUser({ user_id: data.user_id, username: data.username });
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    await authService.register(userData);
    // Auto-login after registration
    const data = await authService.login({
      username: userData.username,
      password: userData.password,
    });
    setUser({ user_id: data.user_id, username: data.username });
    return data;
  }, []);

  const logout = useCallback(() => {
    clearJwt();
    clearStoredUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLogged: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
