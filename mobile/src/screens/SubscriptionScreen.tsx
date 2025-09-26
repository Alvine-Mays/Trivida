import React from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { api } from '@/api';
import { useAuth } from '@/ctx/Auth';

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
          </>
        )}
        <View style={{ height: theme.spacing(2) }} />
        <Text style={theme.typography.caption}>Premium ≈ 2 000 CFA / mois. Support Mobile Money: MTN, Orange.</Text>
        <Text style={theme.typography.caption}>Contactez le support pour activer votre abonnement Mobile Money.</Text>
        <View style={{ height: theme.spacing(2) }} />
        <Button variant="outline" onPress={() => Linking.openURL('mailto:support@trivida.example.com?subject=Trivida Premium Mobile Money')}>Demander l’activation</Button>
        <View style={{ height: theme.spacing(2) }} />
        <Text style={theme.typography.caption}>Astuce: utilisez 50 points pour débloquer un export ou un rapport détaillé ponctuel (ajoutez &usePoints=1 à l’URL d’export).</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
