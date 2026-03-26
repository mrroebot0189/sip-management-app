import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { authApi } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signupAdmin: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/** Read from whichever store currently holds the token. */
const readStorage = (): { token: string | null; user: User | null } => {
  for (const store of [localStorage, sessionStorage]) {
    const token = store.getItem(TOKEN_KEY);
    const userStr = store.getItem(USER_KEY);
    if (token && userStr) {
      try {
        return { token, user: JSON.parse(userStr) as User };
      } catch {
        store.removeItem(TOKEN_KEY);
        store.removeItem(USER_KEY);
      }
    }
  }
  return { token: null, user: null };
};

const clearStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { token, user } = readStorage();
    if (token && user) {
      setState({ user, token, isAuthenticated: true });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    const res = await authApi.login(email, password);
    const { user, token } = res.data.data as { user: User; token: string };

    // Use localStorage when "keep me signed in" is checked so the session
    // survives browser restarts; otherwise use sessionStorage so it clears
    // automatically when the tab is closed.
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));

    setState({ user, token, isAuthenticated: true });
  };

  const signupAdmin = async (email: string, password: string, rememberMe = false) => {
    const res = await authApi.adminSignup(email, password);
    const { user, token } = res.data.data as { user: User; token: string };

    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));

    setState({ user, token, isAuthenticated: true });
  };

  const logout = () => {
    clearStorage();
    setState({ user: null, token: null, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, signupAdmin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
