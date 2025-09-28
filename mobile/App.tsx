import React from 'react';
import { SafeAreaView } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import theme, { useLoadThemeFonts } from './src/theme';
import { AuthProvider } from './src/ctx/Auth';
import RootNavigator from './src/navigation/RootNavigator';
import { setupPushNavigation } from './src/push';
import { registerPremiumRequiredHandler } from './src/upsell';
import { api } from './src/api';
import { useAuth } from './src/ctx/Auth';

export default function App() {
  const fontsReady = useLoadThemeFonts();
  const { token } = useAuth();
  React.useEffect(() => { setupPushNavigation(); }, []);
  React.useEffect(() => {
    registerPremiumRequiredHandler(async () => {
      try { if (token) await api('/analytics/upsell', { method: 'POST', body: JSON.stringify({ event: 'premium_required' }) }, token); } catch {}
      // minimal UX: show system alert and navigate on confirm
      const { Alert } = await import('react-native');
      Alert.alert(
        'Fonctionnalité Premium',
        'Débloquez toutes les fonctionnalités pour 2000 XAF/mois.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Passer en Premium', onPress: async () => {
            try { if (token) await api('/analytics/upsell', { method: 'POST', body: JSON.stringify({ event: 'cta_clicked' }) }, token); } catch {}
            const { navigationRef } = await import('./src/navigation/RootNavigator');
            if (navigationRef.isReady()) navigationRef.navigate('CheckoutMobileMoney' as never);
          } },
        ]
      );
    });
  }, [token]);
  if (!fontsReady) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  return (
    <AuthProvider>
      <ExpoStatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
