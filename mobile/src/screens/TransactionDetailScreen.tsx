import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api, apiWithEtag } from '../api';
import { useAuth } from '../ctx/Auth';

export default function TransactionDetailScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const id = route.params?.id as string;
  const [form, setForm] = React.useState<any>({ categoryId: '', amountMinor: 0, currency: 'XAF', date: new Date().toISOString(), note: '' });
  const [etag, setEtag] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      setLoading(true);
      const { data, etag } = await apiWithEtag(`/finance/transactions/${id}`, {}, token || undefined);
      setForm({ ...data, date: data.date });
      setEtag(etag);
    } catch (e: any) { Alert.alert('Erreur', e.message); } finally { setLoading(false); }
  }

  async function save() {
    try {
      setLoading(true);
      try {
        await api(`/finance/transactions/${id}`, { method: 'PATCH', headers: { 'If-Match': etag || '' }, body: JSON.stringify({ categoryId: form.categoryId, amountMinor: Number(form.amountMinor), currency: form.currency, date: form.date, note: form.note }) }, token || undefined);
        Alert.alert('OK', 'Transaction mise à jour');
        navigation.goBack();
      } catch (err: any) {
        if (String(err.message).toLowerCase().includes('precondition')) {
          const latest = await apiWithEtag(`/finance/transactions/${id}`, {}, token || undefined);
          Alert.alert('Conflit', 'La transaction a changé. Que faire ?', [
            { text: 'Garder serveur', onPress: () => { setForm(latest.data); setEtag(latest.etag); } },
            { text: 'Écraser', onPress: async () => { setEtag(latest.etag); try { await api(`/finance/transactions/${id}`, { method: 'PATCH', headers: { 'If-Match': latest.etag || '' }, body: JSON.stringify({ categoryId: form.categoryId, amountMinor: Number(form.amountMinor), currency: form.currency, date: form.date, note: form.note }) }, token || undefined); Alert.alert('OK', 'Écrasé'); navigation.goBack(); } catch (e2: any) { Alert.alert('Erreur', e2.message); } } },
            { text: 'Annuler', style: 'cancel' },
          ]);
        } else { throw err; }
      }
    } catch (e: any) { Alert.alert('Erreur', e.message); } finally { setLoading(false); }
  }

  async function remove() {
    try {
      Alert.alert('Supprimer', 'Confirmer la suppression ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await api(`/finance/transactions/${id}`, { method: 'DELETE', headers: { 'If-Match': etag || '' } }, token || undefined);
            Alert.alert('OK', 'Transaction supprimée');
            navigation.goBack();
          } catch (err: any) {
            if (String(err.message).toLowerCase().includes('precondition')) {
              const latest = await apiWithEtag(`/finance/transactions/${id}`, {}, token || undefined);
              setEtag(latest.etag);
              try {
                await api(`/finance/transactions/${id}`, { method: 'DELETE', headers: { 'If-Match': latest.etag || '' } }, token || undefined);
                Alert.alert('OK', 'Transaction supprimée');
                navigation.goBack();
              } catch (e2: any) { Alert.alert('Erreur', e2.message); }
            } else { Alert.alert('Erreur', err.message); }
          }
        } }
      ]);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  return (
    <View style={styles.container}>
      <Card header="Transaction">
        <Input label="Catégorie (ID)" value={String(form.categoryId)} onChangeText={(v) => setForm({ ...form, categoryId: v })} />
        <Input label="Montant (minor)" keyboardType="numeric" value={String(form.amountMinor)} onChangeText={(v) => setForm({ ...form, amountMinor: Number(v) || 0 })} />
        <Input label="Devise" value={form.currency} onChangeText={(v) => setForm({ ...form, currency: v })} />
        <Input label="Date ISO" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} />
        <Input label="Note" value={form.note || ''} onChangeText={(v) => setForm({ ...form, note: v })} />
        <View style={{ height: theme.spacing(2) }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button onPress={save} loading={loading}>Enregistrer</Button>
          <Button variant="outline" tone="error" onPress={remove}>Supprimer</Button>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
