import React from 'react';
import { View, Text, StyleSheet, Alert, FlatList, Switch } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api, apiWithEtag } from '../api';
import { useAuth } from '../ctx/Auth';

export default function SavingsScreen() {
  const { token } = useAuth();
  const [plans, setPlans] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [etag, setEtag] = React.useState<string | undefined>();
  const [newPlan, setNewPlan] = React.useState<any>({ name: 'Objectif', cadence: 'monthly', targetAmountMinor: 100000, currency: 'XAF', startDate: new Date().toISOString(), annualInterestRate: 0.06 });
  const [projection, setProjection] = React.useState<any | null>(null);

  async function load() {
    try {
      const list = await api('/savings/plans', {}, token || undefined);
      setPlans(list || []);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function create() {
    try {
      await api('/savings/plans', { method: 'POST', body: JSON.stringify(newPlan) }, token || undefined);
      setNewPlan({ ...newPlan, name: `${newPlan.name} +` });
      await load();
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function selectPlan(id: string) {
    try {
      const { data, etag } = await apiWithEtag(`/savings/plans/${id}`, {}, token || undefined);
      setSelected(data);
      setEtag(etag);
      const proj = await api(`/savings/plans/${id}/projection?periods=12`, {}, token || undefined);
      setProjection(proj);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function saveSelected() {
    if (!selected) return;
    try {
      await api(`/savings/plans/${selected._id}`, { method: 'PATCH', headers: { 'If-Match': etag || '' }, body: JSON.stringify({ name: selected.name, cadence: selected.cadence, targetAmountMinor: Number(selected.targetAmountMinor), currency: selected.currency, startDate: selected.startDate, annualInterestRate: selected.annualInterestRate, autoRemind: !!selected.autoRemind }) }, token || undefined);
      Alert.alert('OK', 'Plan mis à jour');
      await load();
    } catch (err: any) {
      if (String(err.message).toLowerCase().includes('precondition')) {
        const latest = await apiWithEtag(`/savings/plans/${selected._id}`, {}, token || undefined);
        Alert.alert('Conflit', 'Le plan a changé. Que faire ?', [
          { text: 'Garder serveur', onPress: () => { setSelected(latest.data); setEtag(latest.etag); } },
          { text: 'Écraser', onPress: async () => { setEtag(latest.etag); try { await api(`/savings/plans/${selected._id}`, { method: 'PATCH', headers: { 'If-Match': latest.etag || '' }, body: JSON.stringify(selected) }, token || undefined); Alert.alert('OK', 'Écrasé'); await load(); } catch (e2: any) { Alert.alert('Erreur', e2.message); } }},
          { text: 'Annuler', style: 'cancel' },
        ]);
      } else { Alert.alert('Erreur', err.message); }
    }
  }

  React.useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <Card header="Créer un plan">
        <Input label="Nom" value={newPlan.name} onChangeText={(v) => setNewPlan({ ...newPlan, name: v })} />
        <Input label="Cadence (weekly|monthly)" value={newPlan.cadence} onChangeText={(v) => setNewPlan({ ...newPlan, cadence: v })} />
        <Input label="Cible (minor)" keyboardType="numeric" value={String(newPlan.targetAmountMinor)} onChangeText={(v) => setNewPlan({ ...newPlan, targetAmountMinor: Number(v) || 0 })} />
        <Input label="Devise" value={newPlan.currency} onChangeText={(v) => setNewPlan({ ...newPlan, currency: v })} />
        <Input label="Début ISO" value={newPlan.startDate} onChangeText={(v) => setNewPlan({ ...newPlan, startDate: v })} />
        <Input label="Taux annuel (0..1)" keyboardType="numeric" value={String(newPlan.annualInterestRate)} onChangeText={(v) => setNewPlan({ ...newPlan, annualInterestRate: Number(v) || 0 })} />
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={create}>Créer</Button>
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Mes plans">
        <FlatList data={plans} keyExtractor={(i) => i._id} renderItem={({ item }) => (
          <Text onPress={() => selectPlan(item._id)} style={theme.typography.body}>• {item.name} ({item.cadence})</Text>
        )} />
      </Card>

      {selected && (
        <>
          <View style={{ height: theme.spacing(3) }} />
          <Card header="Plan sélectionné">
            <Input label="Nom" value={selected.name} onChangeText={(v) => setSelected({ ...selected, name: v })} />
            <Input label="Cadence" value={selected.cadence} onChangeText={(v) => setSelected({ ...selected, cadence: v })} />
            <Input label="Cible (minor)" keyboardType="numeric" value={String(selected.targetAmountMinor)} onChangeText={(v) => setSelected({ ...selected, targetAmountMinor: Number(v) || 0 })} />
            <Input label="Devise" value={selected.currency} onChangeText={(v) => setSelected({ ...selected, currency: v })} />
            <Input label="Début ISO" value={selected.startDate} onChangeText={(v) => setSelected({ ...selected, startDate: v })} />
            <Input label="Taux annuel" keyboardType="numeric" value={String(selected.annualInterestRate || 0)} onChangeText={(v) => setSelected({ ...selected, annualInterestRate: Number(v) || 0 })} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing(2) }}>
              <Text style={theme.typography.body}>Rappel d’épargne (8h locale)</Text>
              <Switch value={!!selected.autoRemind} onValueChange={(val) => setSelected({ ...selected, autoRemind: val })} />
            </View>
            <View style={{ height: theme.spacing(2) }} />
            <Button onPress={saveSelected}>Enregistrer</Button>
          </Card>
          {projection && (
            <Card header="Projection (12 périodes)">
              <Text style={theme.typography.caption}>Total périodes: {projection.periods}</Text>
              <Text style={theme.typography.caption}>1ère échéance: {projection.schedule?.[0]?.date}</Text>
            </Card>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
