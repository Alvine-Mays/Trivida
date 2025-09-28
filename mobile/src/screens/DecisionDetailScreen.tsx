import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api, apiWithEtag } from '../api';
import { useAuth } from '../ctx/Auth';

export default function DecisionDetailScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const id = route.params?.id as string;
  const [decision, setDecision] = React.useState<any>(null);
  const [etag, setEtag] = React.useState<string | undefined>();

  React.useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const { data, etag } = await apiWithEtag(`/decisions/${id}`, {}, token || undefined);
      setDecision(data.decision || data);
      setEtag(etag);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function save() {
    try {
      await api(`/decisions/${id}`, { method: 'PATCH', headers: { 'If-Match': etag || '' }, body: JSON.stringify({ title: decision.title, chosenOption: decision.chosenOption || '', status: decision.status }) }, token || undefined);
      Alert.alert('OK', 'Décision mise à jour');
      navigation.goBack();
    } catch (err: any) {
      if (String(err.message).toLowerCase().includes('precondition')) {
        const latest = await apiWithEtag(`/decisions/${id}`, {}, token || undefined);
        Alert.alert('Conflit', 'La décision a changé. Que faire ?', [
          { text: 'Garder serveur', onPress: () => { setDecision(latest.data.decision || latest.data); setEtag(latest.etag); } },
          { text: 'Écraser', onPress: async () => { setEtag(latest.etag); try { await api(`/decisions/${id}`, { method: 'PATCH', headers: { 'If-Match': latest.etag || '' }, body: JSON.stringify({ title: decision.title, chosenOption: decision.chosenOption || '', status: decision.status }) }, token || undefined); Alert.alert('OK', 'Écrasé'); navigation.goBack(); } catch (e2: any) { Alert.alert('Erreur', e2.message); } } },
          { text: 'Annuler', style: 'cancel' },
        ]);
      } else { Alert.alert('Erreur', err.message); }
    }
  }

  if (!decision) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Card header="Décision">
        <Input label="Titre" value={decision.title} onChangeText={(v) => setDecision({ ...decision, title: v })} />
        <Input label="Option choisie" value={decision.chosenOption || ''} onChangeText={(v) => setDecision({ ...decision, chosenOption: v })} />
        <Input label="Statut (pending|decided)" value={decision.status} onChangeText={(v) => setDecision({ ...decision, status: v })} />
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={save}>Enregistrer</Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
