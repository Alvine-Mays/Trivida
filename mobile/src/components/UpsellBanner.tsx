import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import theme from '@/theme';
import { api } from '@/api';
import { useAuth } from '@/ctx/Auth';
import { useNavigation } from '@react-navigation/native';

export default function UpsellBanner({ screen }: { screen?: string }) {
  const { token } = useAuth();
  const nav = useNavigation<any>();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api('/auth/me', {}, token || undefined);
        const u = me.user || me;
        const now = new Date();
        const isPremium = (u.trialEndsAt && new Date(u.trialEndsAt) > now) || (u.premiumUntil && new Date(u.premiumUntil) > now) || u.plan === 'premium';
        if (mounted) setVisible(!isPremium);
      } catch { if (mounted) setVisible(false); }
    })();
    return () => { mounted = false; };
  }, [token]);

  if (!visible) return null;

  return (
    <View style={{ backgroundColor: '#1e2a3a', borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <Text style={{ color: theme.colors.text, fontWeight: '600', marginBottom: 4 }}>Fonctionnalité Premium</Text>
      <Text style={{ color: theme.colors.muted, marginBottom: 8 }}>Débloquez toutes les fonctionnalités pour 2000 XAF/mois.</Text>
      <TouchableOpacity onPress={async () => {
        try { await api('/analytics/upsell', { method: 'POST', body: JSON.stringify({ event: 'cta_clicked', screen }) }, token || undefined); } catch {}
        nav.navigate('CheckoutMobileMoney');
      }} style={{ alignSelf: 'flex-start', backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Passer en Premium</Text>
      </TouchableOpacity>
    </View>
  );
}
