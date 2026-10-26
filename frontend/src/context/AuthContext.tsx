import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { AuthResponse, User, UserRole } from '../types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('trust_token') || localStorage.getItem('deposit360_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('trust_token') || localStorage.getItem('deposit360_token');
      if (savedToken) {
        try {
          const res = await api.get<User>('/auth/me');
          setUser(res.data);
        } catch (err) {
          localStorage.removeItem('trust_token');
          localStorage.removeItem('trust_user');
          localStorage.removeItem('deposit360_token');
          localStorage.removeItem('deposit360_user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password: pass });
      const authData = res.data;
      localStorage.setItem('trust_token', authData.access_token);
      localStorage.removeItem('deposit360_token');
      setToken(authData.access_token);
      
      const userObj: User = {
        id: authData.user_id,
        email: authData.email,
        full_name: authData.full_name,
        role: authData.role,
        institution_id: authData.institution_id,
        institution_name: authData.institution_name,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('trust_user', JSON.stringify(userObj));
      localStorage.removeItem('deposit360_user');
      setUser(userObj);
    } finally {
      setIsLoading(false);
    }
  };

  const quickDemoLogin = async (role: UserRole) => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      SCRUTINY_OFFICER: { email: 'officer@aicte.gov.in', pass: 'Officer@123' },
      APPROVING_AUTHORITY: { email: 'authority@aicte.gov.in', pass: 'Authority@123' },
      INSTITUTION_ADMIN: { email: 'inst.admin@ditm.ac.in', pass: 'Inst@123' },
    };
    const c = creds[role];
    await login(c.email, c.pass);
  };

  const logout = () => {
    localStorage.removeItem('trust_token');
    localStorage.removeItem('trust_user');
    localStorage.removeItem('deposit360_token');
    localStorage.removeItem('deposit360_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        quickDemoLogin,
        logout,
        isLoading,
        isAuthenticated: !!token && !!user,
      }}
    >
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
