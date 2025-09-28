import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api, apiWithEtag } from '../api';
import { useAuth } from '../ctx/Auth';

export default function EventFormScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const id = route.params?.id as string | undefined;
  const [form, setForm] = React.useState<any>({ title: '', dateTime: new Date().toISOString(), visibility: 'public', costPerGuestMinor: 0, currency: 'XAF', accessCode: '' });
  const [etag, setEtag] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    try {
      setLoading(true);
      const { data, etag } = await apiWithEtag(`/events/${id}`, {}, token || undefined);
      setForm({ ...data, accessCode: '' });
      setEtag(etag);
    } catch (e: any) { Alert.alert('Erreur', e.message); } finally { setLoading(false); }
  }

  async function save() {
    try {
      setLoading(true);
      if (!id) {
        const created = await api('/events', { method: 'POST', body: JSON.stringify({ title: form.title, dateTime: form.dateTime, visibility: form.visibility, accessCode: form.accessCode || undefined, costPerGuestMinor: Number(form.costPerGuestMinor), currency: form.currency }) }, token || undefined);
        Alert.alert('OK', 'Événement créé');
        navigation.goBack();
        return;
      }
      // edit with ETag
      try {
        const updated = await api(`/events/${id}`, { method: 'PATCH', headers: { 'If-Match': etag || '' }, body: JSON.stringify({ title: form.title, dateTime: form.dateTime, visibility: form.visibility, accessCode: form.accessCode || undefined, costPerGuestMinor: Number(form.costPerGuestMinor), currency: form.currency }) }, token || undefined);
        Alert.alert('OK', 'Événement mis à jour');
        navigation.goBack();
      } catch (err: any) {
        if (String(err.message).toLowerCase().includes('precondition')) {
          // 412 — fetch latest and ask
          const latest = await apiWithEtag(`/events/${id}`, {}, token || undefined);
          Alert.alert('Conflit', 'L’événement a changé. Que faire ?', [
            { text: 'Garder serveur', onPress: () => { setForm({ ...latest.data, accessCode: '' }); setEtag(latest.etag); } },
            { text: 'Écraser', onPress: async () => {
              setEtag(latest.etag);
              try {
                await api(`/events/${id}`, { method: 'PATCH', headers: { 'If-Match': latest.etag || '' }, body: JSON.stringify({ title: form.title, dateTime: form.dateTime, visibility: form.visibility, accessCode: form.accessCode || undefined, costPerGuestMinor: Number(form.costPerGuestMinor), currency: form.currency }) }, token || undefined);
                Alert.alert('OK', 'Écrasé');
                navigation.goBack();
              } catch (e2: any) { Alert.alert('Erreur', e2.message); }
            }},
            { text: 'Annuler', style: 'cancel' },
          ]);
        } else {
          throw err;
        }
      }
    } catch (e: any) { Alert.alert('Erreur', e.message); } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Card header={id ? 'Modifier événement' : 'Créer événement'}>
        <Input label="Titre" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
        <Input label="Date ISO" value={form.dateTime} onChangeText={(v) => setForm({ ...form, dateTime: v })} />
        <Input label="Visibilité (public|private)" value={form.visibility} onChangeText={(v) => setForm({ ...form, visibility: v })} />
        <Input label="Code (si privé)" value={form.accessCode} onChangeText={(v) => setForm({ ...form, accessCode: v })} />
        <Input label="Coût par invité (minor)" keyboardType="numeric" value={String(form.costPerGuestMinor)} onChangeText={(v) => setForm({ ...form, costPerGuestMinor: Number(v) || 0 })} />
        <Input label="Devise" value={form.currency} onChangeText={(v) => setForm({ ...form, currency: v })} />
        <View style={{ height: theme.spacing(2) }} />
        <Button onPress={save} loading={loading}>{id ? 'Enregistrer' : 'Créer'}</Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
