import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function AddTransactionScreen({ navigation, route }: any) {
  const { token } = useAuth();
  const businessId = route.params?.businessId as string | undefined;
  const [categories, setCategories] = React.useState<any[]>([]);
  const [catName, setCatName] = React.useState('Divers');
  const [amount, setAmount] = React.useState('');
  const [currency, setCurrency] = React.useState('XAF');

  async function loadCats() {
    try {
      const res = await api('/finance/categories', {}, token || undefined);
      const list = res || [];
      setCategories(businessId ? list.filter((c: any) => String(c.businessId) === businessId) : list);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }
  React.useEffect(() => { loadCats(); }, []);

  async function save() {
    try {
      if (!amount) return;
      let cat = categories.find((c) => c.name === catName);
      if (!cat) {
        cat = await api('/finance/categories', { method: 'POST', body: JSON.stringify({ name: catName, type: 'expense', businessId }) }, token || undefined);
      }
      await api('/finance/transactions', { method: 'POST', body: JSON.stringify({ categoryId: cat._id, amountMinor: Number(amount), currency, date: new Date().toISOString() }) }, token || undefined);
      Alert.alert('OK', 'Transaction ajoutée');
      navigation.goBack();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  return (
    <View style={styles.container}>
      <Card header="Nouvelle transaction">
        <Input label="Catégorie (nom)" value={catName} onChangeText={setCatName} />
        <Input label="Montant (minor)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <Input label="Devise" value={currency} onChangeText={setCurrency} />
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={save}>Enregistrer</Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
