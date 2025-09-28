import React from 'react';
import { View, Text, StyleSheet, Alert, FlatList, Pressable } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api, apiWithEtag } from '../api';
import { useAuth } from '../ctx/Auth';

export default function CategoriesScreen() {
  const { token } = useAuth();
  const [categories, setCategories] = React.useState<any[]>([]);
  const [newCat, setNewCat] = React.useState<any>({ name: '', type: 'expense', color: '', icon: '' });
  const [selected, setSelected] = React.useState<any | null>(null);
  const [etag, setEtag] = React.useState<string | undefined>();

  async function load() {
    try {
      const list = await api('/finance/categories', {}, token || undefined);
      setCategories(list || []);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  React.useEffect(() => { load(); }, []);

  async function create() {
    try {
      if (!newCat.name) return;
      await api('/finance/categories', { method: 'POST', body: JSON.stringify({ name: newCat.name, type: newCat.type, color: newCat.color || undefined, icon: newCat.icon || undefined }) }, token || undefined);
      setNewCat({ ...newCat, name: '' });
      await load();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function open(catId: string) {
    try {
      const { data, etag } = await apiWithEtag(`/finance/categories/${catId}`, {}, token || undefined);
      setSelected(data);
      setEtag(etag);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function saveSelected() {
    if (!selected) return;
    try {
      await api(`/finance/categories/${selected._id}`, { method: 'PATCH', headers: { 'If-Match': etag || '' }, body: JSON.stringify({ name: selected.name, type: selected.type, color: selected.color || undefined, icon: selected.icon || undefined }) }, token || undefined);
      Alert.alert('OK', 'Catégorie mise à jour');
      setSelected(null);
      await load();
    } catch (err: any) {
      if (String(err.message).toLowerCase().includes('precondition')) {
        const latest = await apiWithEtag(`/finance/categories/${selected._id}`, {}, token || undefined);
        Alert.alert('Conflit', 'La catégorie a changé. Que faire ?', [
          { text: 'Garder serveur', onPress: () => { setSelected(latest.data); setEtag(latest.etag); } },
          { text: 'Écraser', onPress: async () => {
            setEtag(latest.etag);
            try {
              await api(`/finance/categories/${selected._id}`, { method: 'PATCH', headers: { 'If-Match': latest.etag || '' }, body: JSON.stringify({ name: selected.name, type: selected.type, color: selected.color || undefined, icon: selected.icon || undefined }) }, token || undefined);
              Alert.alert('OK', 'Écrasé');
              setSelected(null);
              await load();
            } catch (e2: any) { Alert.alert('Erreur', e2.message); }
          } },
          { text: 'Annuler', style: 'cancel' },
        ]);
      } else { Alert.alert('Erreur', err.message); }
    }
  }

  async function removeSelected() {
    if (!selected) return;
    Alert.alert('Supprimer', 'Confirmer la suppression ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api(`/finance/categories/${selected._id}`, { method: 'DELETE', headers: { 'If-Match': etag || '' } }, token || undefined);
          Alert.alert('OK', 'Catégorie supprimée');
          setSelected(null);
          await load();
        } catch (err: any) {
          if (String(err.message).toLowerCase().includes('precondition')) {
            const latest = await apiWithEtag(`/finance/categories/${selected._id}`, {}, token || undefined);
            setEtag(latest.etag);
            try {
              await api(`/finance/categories/${selected._id}`, { method: 'DELETE', headers: { 'If-Match': latest.etag || '' } }, token || undefined);
              Alert.alert('OK', 'Catégorie supprimée');
              setSelected(null);
              await load();
            } catch (e2: any) { Alert.alert('Erreur', e2.message); }
          } else { Alert.alert('Erreur', err.message); }
        }
      }},
    ]);
  }

  return (
    <View style={styles.container}>
      <Card header="Créer une catégorie">
        <Input label="Nom" value={newCat.name} onChangeText={(v) => setNewCat({ ...newCat, name: v })} />
        <Input label="Type (expense|income|savings)" value={newCat.type} onChangeText={(v) => setNewCat({ ...newCat, type: v })} />
        <Input label="Couleur (#hex)" value={newCat.color} onChangeText={(v) => setNewCat({ ...newCat, color: v })} />
        <Input label="Icône" value={newCat.icon} onChangeText={(v) => setNewCat({ ...newCat, icon: v })} />
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={create}>Créer</Button>
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Catégories">
        <FlatList data={categories} keyExtractor={(i) => i._id} renderItem={({ item }) => (
          <Pressable onPress={() => (navigation as any).navigate('CategoryDetail', { id: item._id })}>
            <Text style={theme.typography.body}>• {item.name} ({item.type})</Text>
          </Pressable>
        )} />
      </Card>

      {selected && (
        <>
          <View style={{ height: theme.spacing(3) }} />
          <Card header="Éditer catégorie">
            <Input label="Nom" value={selected.name} onChangeText={(v) => setSelected({ ...selected, name: v })} />
            <Input label="Type" value={selected.type} onChangeText={(v) => setSelected({ ...selected, type: v })} />
            <Input label="Couleur" value={selected.color || ''} onChangeText={(v) => setSelected({ ...selected, color: v })} />
            <Input label="Icône" value={selected.icon || ''} onChangeText={(v) => setSelected({ ...selected, icon: v })} />
            <View style={{ height: theme.spacing(2) }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button onPress={saveSelected}>Enregistrer</Button>
              <Button variant="outline" tone="error" onPress={removeSelected}>Supprimer</Button>
            </View>
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
