import React from 'react';
import { View, Text, StyleSheet, Alert, FlatList, Linking } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function ExportScreen() {
  const { token } = useAuth();
  const [businesses, setBusinesses] = React.useState<any[]>([]);
  const [selectedBizId, setSelectedBizId] = React.useState<string>('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [baseCurrency, setBaseCurrency] = React.useState('XAF');

  async function load() {
    try { const res = await api('/finance/businesses', {}, token || undefined); setBusinesses(res.items || []); } catch {}
  }
  React.useEffect(() => { load(); }, []);

  async function openUrl(path: string, usePoints: boolean = false) {
    try {
      const params = new URLSearchParams({});
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (baseCurrency) params.set('baseCurrency', baseCurrency);
      if (usePoints) params.set('usePoints', '1');
      const url = `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000'}${path}${params.toString() ? `?${params.toString()}` : ''}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url); else Alert.alert('Erreur', 'Ouverture impossible');
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function guardedExport(path: string) {
    try {
      await openUrl(path, false);
    } catch (e: any) {
      if (String(e?.message || '').includes('403')) {
        Alert.alert('Premium requis', 'Débloquer via 50 points ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Débloquer', onPress: () => openUrl(path, true) },
        ]);
      } else {
        Alert.alert('Erreur', e.message || String(e));
      }
    }
  }

  return (
    <View style={styles.container}>
      <Card header="Exporter / Rapports">
        <Input label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} />
        <Input label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} />
        <Input label="Devise base" value={baseCurrency} onChangeText={setBaseCurrency} />
        <View style={{ height: theme.spacing(2) }} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" onPress={() => guardedExport('/finance/export.csv')}>Export CSV global</Button>
        </View>
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Exporter un business">
        <FlatList data={businesses} keyExtractor={(i) => i._id} horizontal renderItem={({ item }) => (
          <Text onPress={() => setSelectedBizId(item._id)} style={{ ...theme.typography.body, marginRight: theme.spacing(2), color: selectedBizId === item._id ? theme.colors.accent : theme.colors.text }}>#{String(item._id).slice(-6)} {item.name}</Text>
        )} />
        <View style={{ height: theme.spacing(2) }} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" onPress={() => selectedBizId ? guardedExport(`/finance/businesses/${selectedBizId}/export.csv`) : Alert.alert('Info', 'Sélectionnez un business')}>Export CSV business</Button>
          <Button variant="outline" onPress={() => selectedBizId ? openUrl(`/finance/businesses/${selectedBizId}/report`) : Alert.alert('Info', 'Sélectionnez un business')}>Rapport détaillé (JSON)</Button>
        </View>
        <Text style={{ ...theme.typography.caption, marginTop: theme.spacing(2) }}>Astuce: si 403, un pop-up proposera de débloquer via 50 points.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
