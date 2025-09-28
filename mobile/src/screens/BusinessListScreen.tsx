import React from 'react';
import { View, Text, StyleSheet, Alert, FlatList, Pressable } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function BusinessListScreen({ navigation }: any) {
  const { token } = useAuth();
  const [items, setItems] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({ name: '', description: '', currency: 'XAF' });

  async function load() {
    try { const res = await api('/finance/businesses', {}, token || undefined); setItems(res.items || []); } catch (e: any) { Alert.alert('Erreur', e.message); }
  }
  React.useEffect(() => { load(); }, []);

  async function create() {
    try {
      await api('/finance/businesses', { method: 'POST', body: JSON.stringify(form) }, token || undefined);
      setForm({ ...form, name: '' });
      await load();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  return (
    <View style={styles.container}>
      <Card header="Créer un business">
        <Input label="Nom" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <Input label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
        <Input label="Devise" value={form.currency} onChangeText={(v) => setForm({ ...form, currency: v })} />
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={create}>Créer</Button>
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Mes business">
        <FlatList data={items} keyExtractor={(i) => i._id} renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('BusinessDetail', { id: item._id })}>
            <Text style={theme.typography.body}>• {item.name}</Text>
          </Pressable>
        )} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
