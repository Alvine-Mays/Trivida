import React from 'react';
import { View, Text, StyleSheet, Alert, FlatList } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';

export default function BusinessDetailScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const id = route.params?.id as string;
  const [biz, setBiz] = React.useState<any>(null);
  const [sum, setSum] = React.useState<any>(null);

  async function load() {
    try {
      const b = await api(`/finance/businesses/${id}`, {}, token || undefined);
      setBiz(b);
      const s = await api(`/finance/businesses/${id}/summary?period=monthly`, {}, token || undefined);
      setSum(s);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  React.useEffect(() => { load(); }, [id]);

  return (
    <View style={styles.container}>
      <Card header={biz?.name || 'Business'}>
        <Text style={theme.typography.body}>Devise: {biz?.currency}</Text>
        {sum && (
          <>
            <Text style={theme.typography.body}>Recettes: {sum.income}</Text>
            <Text style={theme.typography.body}>Dépenses: {sum.expense}</Text>
            <Text style={theme.typography.subtitle}>Bénéfice net: {sum.net}</Text>
          </>
        )}
        <View style={{ height: theme.spacing(2) }} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" onPress={() => navigation.navigate('Categories', { businessId: id })}>Catégories</Button>
          <Button variant="outline" onPress={() => navigation.navigate('AddTransaction', { businessId: id })}>Ajouter opération</Button>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
