import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api } from '@/api';
import { useAuth } from '@/ctx/Auth';

export default function CheckoutScreen() {
  const { token } = useAuth();
  const [operator, setOperator] = React.useState<'mtn'|'airtel'>('mtn');
  const [amount, setAmount] = React.useState('2000');
  const [ref, setRef] = React.useState<string>('');

  async function checkout() {
    try {
      const res = await api('/billing/checkout', { method: 'POST', body: JSON.stringify({ operator, amount: Number(amount) }) }, token || undefined);
      setRef(res.reference);
      Alert.alert('Demande initiée', `Référence: ${res.reference}\nStatut: ${res.status}\nSuivez les instructions Momo/Airtel.`);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  return (
    <View style={styles.container}>
      <Card header="Paiement Mobile Money (placeholder)">
        <Text style={theme.typography.caption}>Opérateur</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: theme.spacing(1) }}>
          <Button variant={operator==='mtn'?'filled':'outline'} onPress={() => setOperator('mtn')}>MTN</Button>
          <Button variant={operator==='airtel'?'filled':'outline'} onPress={() => setOperator('airtel')}>Airtel CG</Button>
        </View>
        <Input label="Montant (XAF)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={checkout}>Initier paiement</Button>
        {ref ? <Text style={{ ...theme.typography.caption, marginTop: theme.spacing(2) }}>Référence: {ref}</Text> : null}
        <View style={{ height: theme.spacing(2) }} />
        <Text style={theme.typography.caption}>Une fois l’API opérateur branchée, ce flux appellera automatiquement le webhook et activera Premium.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
