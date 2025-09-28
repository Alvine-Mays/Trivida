import React from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function EventsScreen({ navigation }: any) {
  const { token } = useAuth();
  const [events, setEvents] = React.useState<any[]>([]);
  const [slug, setSlug] = React.useState('');
  const [accessCode, setAccessCode] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');

  async function loadEvents() {
    try {
      const res = await api('/events', {}, token || undefined);
      setEvents(res.items || []);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function viewPublic() {
    try {
      const q = accessCode ? `?accessCode=${encodeURIComponent(accessCode)}` : '';
      const res = await api(`/public/events/${slug}${q}`);
      Alert.alert('Événement', res.title || slug);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function rsvp() {
    try {
      await api(`/public/events/${slug}/rsvp`, { method: 'POST', body: JSON.stringify({ name: inviteName, status: 'yes', plusOnes: 1, accessCode: accessCode || undefined }) });
      Alert.alert('RSVP', 'OK');
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function testPush() {
    try {
      if (!token) return Alert.alert('Info', 'Connectez-vous pour tester.');
      const res = await api('/notifications/test', { method: 'POST', body: JSON.stringify({ message: 'Hello Trivida!' }) }, token);
      Alert.alert('Notifications', JSON.stringify(res));
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  return (
    <View style={styles.container}>
      <Card header="Mes événements">
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing(2) }}>
          <Button onPress={loadEvents}>Charger</Button>
          <Button variant="outline" onPress={() => navigation.navigate('EventForm')}>Créer</Button>
        </View>
        {events.map((e) => (
          <Pressable key={e._id} onPress={() => navigation.navigate('EventForm', { id: e._id })}>
            <Text style={theme.typography.body}>• {e.title} ({e.visibility})</Text>
          </Pressable>
        ))}
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Public">
        <Input label="Slug public" value={slug} onChangeText={setSlug} />
        <Input label="Code d’accès (si privé)" value={accessCode} onChangeText={setAccessCode} />
        <Button variant="outline" onPress={viewPublic}>Voir</Button>
        <View style={{ height: theme.spacing(2) }} />
        <Input label="Ton nom (RSVP)" value={inviteName} onChangeText={setInviteName} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing(1) }}>
          <Button onPress={rsvp}>RSVP +1</Button>
          <Button variant="outline" onPress={testPush}>Tester notification</Button>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
