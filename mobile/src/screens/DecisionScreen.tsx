import React from 'react';
import { View, Text, StyleSheet, Alert, FlatList } from 'react-native';
import theme from '@/theme';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';
import UpsellBanner from '@/components/UpsellBanner';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function DecisionScreen({ navigation }: any) {
  const { token } = useAuth();
  const [query, setQuery] = React.useState('dîner');
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [factors, setFactors] = React.useState({ budgetImpact: 1, longTermBenefit: 1, urgency: 0.3 });
  const [score, setScore] = React.useState<number | null>(null);
  const [title, setTitle] = React.useState('Décision');
  const [decisions, setDecisions] = React.useState<any[]>([]);

  async function loadTemplates() {
    try {
      const res = await api(`/decision/templates?query=${encodeURIComponent(query)}`, {}, token || undefined);
      setTemplates(res.templates || []);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function computeScore() {
    try {
      const res = await api('/decision/score', { method: 'POST', body: JSON.stringify({ factors }) }, token || undefined);
      setScore(res.score);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function createDecision() {
    try {
      const res = await api('/decisions', { method: 'POST', body: JSON.stringify({ title, factors }) }, token || undefined);
      Alert.alert('OK', 'Décision créée');
      await loadDecisions();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function loadDecisions() {
    try {
      const res = await api('/decisions?limit=20', {}, token || undefined);
      setDecisions(res.items || []);
    } catch (e: any) { /*noop*/ }
  }

  React.useEffect(() => { loadDecisions(); }, []);

  return (
    <View style={styles.container}>
      <UpsellBanner screen="Decision" />
      <Card header="Suggestions">
        <Input label="Intention" value={query} onChangeText={setQuery} />
        <View style={{ height: theme.spacing(2) }} />
        <Button variant="outline" onPress={loadTemplates}>Charger</Button>
        <FlatList style={{ marginTop: theme.spacing(2) }} data={templates} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => (
          <Text style={theme.typography.body}>{item.options?.map((o: any) => o.label).join(' / ')}</Text>
        )} />
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Facteurs & Score">
        <Input label="Titre" value={title} onChangeText={setTitle} />
        <Input label="Impact budget" keyboardType="numeric" value={String(factors.budgetImpact)} onChangeText={(v) => setFactors({ ...factors, budgetImpact: Number(v) })} />
        <Input label="Bénéfice long-terme" keyboardType="numeric" value={String(factors.longTermBenefit)} onChangeText={(v) => setFactors({ ...factors, longTermBenefit: Number(v) })} />
        <Input label="Urgence" keyboardType="numeric" value={String(factors.urgency)} onChangeText={(v) => setFactors({ ...factors, urgency: Number(v) })} />
        <View style={{ height: theme.spacing(2) }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button onPress={computeScore}>Calculer</Button>
          <Button variant="outline" onPress={createDecision}>Créer</Button>
        </View>
        {score !== null && <Text style={{ ...theme.typography.subtitle, marginTop: theme.spacing(2) }}>Score: {score.toFixed(3)}</Text>}
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Mes décisions">
        <FlatList data={decisions} keyExtractor={(i) => i._id} renderItem={({ item }) => (
          <Text style={theme.typography.body} onPress={() => navigation.navigate('DecisionDetail', { id: item._id })}>• {item.title} — {item.status}</Text>
        )} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
