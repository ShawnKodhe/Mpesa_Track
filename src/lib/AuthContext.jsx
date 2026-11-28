import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, signOut } from '@/lib/auth';
import { clearAppLock, isAppLocked } from '@/lib/pinLock';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      // A PIN-locked device keeps its Supabase session, so gate it here.
      if (isAppLocked()) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return null;
      }
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setAuthError(null);
      return currentUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message || 'Authentication required' });
      return null;
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void checkUserAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      // Defer the profile lookup so it never runs inside the auth callback.
      setTimeout(() => { if (active) void checkUserAuth(); }, 0);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [checkUserAuth]);

  const completePinUnlock = useCallback(async () => {
    clearAppLock();
    await checkUserAuth();
  }, [checkUserAuth]);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const navigateToLogin = useCallback((returnTo = window.location.pathname + window.location.search) => {
    const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
    if (authPages.includes(window.location.pathname)) return;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      completePinUnlock,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
