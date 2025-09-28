import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function SubscriptionScreen() {
  const { token } = useAuth();
  const [user, setUser] = React.useState<any>(null);

  async function load() {
    try {
      const res = await api('/auth/me', {}, token || undefined);
      setUser(res.user || res);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  React.useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <Card header="Abonnement & Points">
        {user && (
          <>
            <Text style={theme.typography.body}>Plan: {user.plan || 'trial'}</Text>
            {user.trialEndsAt && <Text style={theme.typography.body}>Fin d’essai: {String(user.trialEndsAt).slice(0,10)}</Text>}
            {user.premiumUntil && <Text style={theme.typography.body}>Premium jusqu’au: {String(user.premiumUntil).slice(0,10)}</Text>}
            <Text style={theme.typography.subtitle}>Points: {user.points || 0}</Text>
            <View style={{ height: theme.spacing(2) }} />
            <Text style={theme.typography.body}>Premium: 2000 XAF / mois</Text>
          </>
        )}
        <View style={{ height: theme.spacing(2) }} />
        <Text style={theme.typography.caption}>Mobile Money: MTN MoMo CG, Airtel Money CG.</Text>
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={() => Alert.alert('Premium', 'Ouvrir l’écran de paiement Mobile Money maintenant ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Oui', onPress: () => (require('@/navigation/RootNavigator') as any).navigationRef.navigate('CheckoutMobileMoney') },
        ])}>Passer en Premium</Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
