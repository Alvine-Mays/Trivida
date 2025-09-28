import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api, apiWithEtag } from '@/api';
import { useAuth } from '@/ctx/Auth';

export default function CategoryDetailScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const id = route.params?.id as string;
  const [form, setForm] = React.useState<any>({ name: '', type: 'expense', color: '', icon: '' });
  const [etag, setEtag] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      setLoading(true);
      const { data, etag } = await apiWithEtag(`/finance/categories/${id}`, {}, token || undefined);
      setForm({ name: data.name, type: data.type, color: data.color || '', icon: data.icon || '' });
      setEtag(etag);
    } catch (e: any) { Alert.alert('Erreur', e.message); } finally { setLoading(false); }
  }

  async function save() {
    try {
      setLoading(true);
      try {
        await api(`/finance/categories/${id}`, { method: 'PATCH', headers: { 'If-Match': etag || '' }, body: JSON.stringify({ name: form.name, type: form.type, color: form.color || undefined, icon: form.icon || undefined }) }, token || undefined);
        Alert.alert('OK', 'Catégorie mise à jour');
        navigation.goBack();
      } catch (err: any) {
        if (String(err.message).toLowerCase().includes('precondition')) {
          const latest = await apiWithEtag(`/finance/categories/${id}`, {}, token || undefined);
          Alert.alert('Conflit', 'La catégorie a changé. Que faire ?', [
            { text: 'Garder serveur', onPress: () => { setForm({ name: latest.data.name, type: latest.data.type, color: latest.data.color || '', icon: latest.data.icon || '' }); setEtag(latest.etag); } },
            { text: 'Écraser', onPress: async () => { setEtag(latest.etag); try { await api(`/finance/categories/${id}`, { method: 'PATCH', headers: { 'If-Match': latest.etag || '' }, body: JSON.stringify(form) }, token || undefined); Alert.alert('OK', 'Écrasé'); navigation.goBack(); } catch (e2: any) { Alert.alert('Erreur', e2.message); } } },
            { text: 'Annuler', style: 'cancel' },
          ]);
        } else { throw err; }
      }
    } catch (e: any) { Alert.alert('Erreur', e.message); } finally { setLoading(false); }
  }

  async function remove() {
    try {
      // Check usage: fetch 1 transaction by this category
      const used = await api(`/finance/transactions?limit=1&categoryId=${encodeURIComponent(id)}`, {}, token || undefined);
      if ((used.items || []).length > 0) {
        Alert.alert('Impossible', 'Cette catégorie est utilisée par des transactions. Supprimez ou réassignez ces transactions avant de continuer.');
        return;
      }
      Alert.alert('Supprimer', 'Confirmer la suppression ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await api(`/finance/categories/${id}`, { method: 'DELETE', headers: { 'If-Match': etag || '' } }, token || undefined);
            Alert.alert('OK', 'Catégorie supprimée');
            navigation.goBack();
          } catch (err: any) {
            if (String(err.message).toLowerCase().includes('precondition')) {
              const latest = await apiWithEtag(`/finance/categories/${id}`, {}, token || undefined);
              setEtag(latest.etag);
              try {
                await api(`/finance/categories/${id}`, { method: 'DELETE', headers: { 'If-Match': latest.etag || '' } }, token || undefined);
                Alert.alert('OK', 'Catégorie supprimée');
                navigation.goBack();
              } catch (e2: any) { Alert.alert('Erreur', e2.message); }
            } else { Alert.alert('Erreur', err.message); }
          }
        }},
      ]);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  return (
    <View style={styles.container}>
      <Card header="Catégorie">
        <Input label="Nom" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <Input label="Type (expense|income|savings)" value={form.type} onChangeText={(v) => setForm({ ...form, type: v })} />
        <Input label="Couleur (#hex)" value={form.color} onChangeText={(v) => setForm({ ...form, color: v })} />
        <Input label="Icône" value={form.icon} onChangeText={(v) => setForm({ ...form, icon: v })} />
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
