import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import theme from '@/theme';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function AuthScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { setToken } = useAuth();

  async function login() {
    try {
      setLoading(true);
      const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(res.tokens?.accessToken || null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally { setLoading(false); }
  }

  async function register() {
    try {
      setLoading(true);
      const res = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(res.tokens?.accessToken || null);
    } catch (e: any) { Alert.alert('Erreur', e.message); } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trivida</Text>
      <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <View style={{ height: theme.spacing(2) }} />
      <Input label="Mot de passe" placeholder="********" value={password} onChangeText={setPassword} secureTextEntry />
      <View style={{ height: theme.spacing(3) }} />
      <Button onPress={login} loading={loading}>Connexion</Button>
      <View style={{ height: theme.spacing(2) }} />
      <Button variant="outline" onPress={register} loading={loading}>Créer un compte</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4), justifyContent: 'center' },
  title: { ...theme.typography.title, marginBottom: theme.spacing(4), textAlign: 'center' },
});
