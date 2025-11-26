'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type AuthContextType = {
  isAuthenticated: boolean | null;
  isLoading: boolean;
  checkAuth: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const tokens = localStorage.getItem('auth_tokens');
    const authStatus = localStorage.getItem('iaa_authenticated');
    const isAuth = !!(tokens && authStatus === 'true');
    
    setIsAuthenticated(isAuth);
    setIsLoading(false);
    return isAuth;
  };

  useEffect(() => {
    // Initial check
    checkAuth();

    // Listen for auth changes (in case of login/logout from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_tokens' || e.key === 'iaa_authenticated') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
