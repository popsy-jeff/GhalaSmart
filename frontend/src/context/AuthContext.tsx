import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Farmer, UserLogin, UserRegister } from '../types';
import { fetchCurrentUser, loginMember, registerMember } from '../api';

interface AuthContextType {
  user: Farmer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: UserLogin) => Promise<void>;
  register: (data: UserRegister) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Farmer | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ghalasmart_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('ghalasmart_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
      setToken(savedToken);
    } catch (err) {
      console.warn('Failed to restore session:', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem('ghalasmart_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: UserLogin) => {
    setIsLoading(true);
    try {
      const data = await loginMember(credentials);
      setUser(data.user);
      setToken(data.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: UserRegister) => {
    setIsLoading(true);
    try {
      const res = await registerMember(data);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ghalasmart_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
