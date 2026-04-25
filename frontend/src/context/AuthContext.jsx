import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);
  const [authMethod, setAuthMethod] = useState(null);

  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then(r => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthResponse = (res) => {
    const { token: t, refreshToken: rt, user: u, authMethod: m } = res.data;
    localStorage.setItem('token', t);
    if (rt) localStorage.setItem('refreshToken', rt);
    setToken(t);
    setRefreshToken(rt);
    setUser(u);
    setAuthMethod(m);
    return res.data;
  };

  const register = (data) => authApi.register(data).then(handleAuthResponse);
  const loginJwt = (u, p) => authApi.loginJwt(u, p).then(handleAuthResponse);
  const loginBasic = (u, p) => authApi.loginBasic(u, p).then(handleAuthResponse);
  const loginApiKey = (k) => authApi.loginApiKey(k).then(handleAuthResponse);
  const loginOAuth = (provider, t) => authApi.loginOAuth(provider, t).then(handleAuthResponse);

  const logout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setAuthMethod(null);
    }
  };

  const generateApiKey = async () => {
    const res = await authApi.generateApiKey();
    setUser(u => ({ ...u, apiKey: res.data.apiKey }));
    return res.data.apiKey;
  };

  return (
    <AuthContext.Provider value={{
      user, token, refreshToken, authMethod, loading,
      register, loginJwt, loginBasic, loginApiKey, loginOAuth,
      logout, generateApiKey
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
