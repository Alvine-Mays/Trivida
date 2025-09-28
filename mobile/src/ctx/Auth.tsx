import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync, ensureLocalTrialReminders } from '../push';
import { api } from '../api';

export type AuthContextType = {
  token: string | null;
  setToken: (t: string | null) => void;
};

export const AuthContext = React.createContext<AuthContextType>({ token: null, setToken: () => {} });

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = React.useState<string | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem('token').then((t) => { if (t) setTokenState(t); });
  }, []);

  React.useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const expoToken = await registerForPushNotificationsAsync();
        if (!expoToken) {
          try {
            const me = await api('/auth/me', {}, token || undefined);
            const user = me.user || me?.user;
            if (user?.trialEndsAt) await ensureLocalTrialReminders(user.trialEndsAt, user.locale || 'fr');
          } catch {}
          return;
        }
        await fetch(`${API_BASE}/users/push-tokens`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ token: expoToken }) });
      } catch {}
    })();
  }, [token]);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) AsyncStorage.setItem('token', t); else AsyncStorage.removeItem('token');
  };

  return <AuthContext.Provider value={{ token, setToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return React.useContext(AuthContext); }
