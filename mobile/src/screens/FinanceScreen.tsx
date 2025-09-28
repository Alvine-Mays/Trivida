import React from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import theme from '@/theme';
import Card from '@/components/Card';
import Input from '@/components/Input';
import UpsellBanner from '@/components/UpsellBanner';
import Button from '@/components/Button';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryLine, VictoryLegend, VictoryStack } from 'victory-native';

export default function FinanceScreen({ navigation }: any) {
  const { token } = useAuth();
  const [baseCurrency, setBaseCurrency] = React.useState('XAF');
  const [summary, setSummary] = React.useState<any | null>(null);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');

  const [categoryType, setCategoryType] = React.useState<'all'|'expense'|'income'|'savings'>('all');
  const [period, setPeriod] = React.useState<'weekly'|'monthly'>('weekly');

  async function loadSummary() {
    try {
      const params = new URLSearchParams({ baseCurrency });
      if (categoryType !== 'all') params.set('type', categoryType);
      if (period) params.set('period', period);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await api(`/finance/summary?${params.toString()}`, {}, token || undefined);
      setSummary(res);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
  }

  async function loadRecent(reset: boolean = false) {
    try {
      if (loadingMore) return;
      setLoadingMore(true);
      const params: string[] = ['limit=10'];
      if (selectedCategoryId) params.push(`categoryId=${encodeURIComponent(selectedCategoryId)}`);
      if (dateFrom) params.push(`from=${encodeURIComponent(dateFrom)}`);
      if (dateTo) params.push(`to=${encodeURIComponent(dateTo)}`);
      if (!reset && nextCursor) params.push(`cursor=${encodeURIComponent(nextCursor)}`);
      const res = await api(`/finance/transactions?${params.join('&')}`, {}, token || undefined);
      const items = res.items || [];
      setTransactions(reset ? items : [...transactions, ...items]);
      setNextCursor(res.nextCursor || null);
    } catch (e: any) { Alert.alert('Erreur', e.message); }
    finally { setLoadingMore(false); }
  }

  async function loadCats() {
    try {
      const res = await api('/finance/categories', {}, token || undefined);
      setCategories(res || []);
    } catch (e: any) { /*noop*/ }
  }

  React.useEffect(() => { loadCats(); }, []);

  return (
    <View style={styles.container}>
      <UpsellBanner screen="Finance" />
      <Card header="Résumé">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['XAF','USD','EUR'].map(c => (
            <Button key={c} variant={baseCurrency === c ? 'filled' : 'outline'} onPress={() => setBaseCurrency(c)}>{c}</Button>
          ))}
        </View>
        <View style={{ height: theme.spacing(2) }} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button onPress={loadSummary}>Charger</Button>
          <Button variant="outline" onPress={() => navigation.navigate('AddTransaction')}>Ajouter transaction</Button>
          <Button variant="outline" onPress={() => navigation.navigate('Savings')}>Projection épargne</Button>
          <Button variant="outline" onPress={() => navigation.navigate('Categories')}>Gérer catégories</Button>
          <Button variant="outline" onPress={() => navigation.navigate('Businesses')}>Mes business</Button>
          <Button variant="outline" onPress={() => navigation.navigate('Subscription')}>Abonnement & Points</Button>
          <Button variant="outline" onPress={() => navigation.navigate('Export')}>Exporter</Button>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: theme.spacing(2) }}>
          <Input label="From (YYYY-MM-DD)" placeholder="2025-01-01" value={dateFrom} onChangeText={setDateFrom} />
          <Input label="To (YYYY-MM-DD)" placeholder="2025-12-31" value={dateTo} onChangeText={setDateTo} />
          <Button variant="outline" onPress={() => { setNextCursor(null); setTransactions([]); loadSummary(); loadRecent(true); }}>Appliquer période</Button>
        </View>
        {summary && (
          <View style={{ marginTop: theme.spacing(2) }}>
            <Text style={theme.typography.body}>Devise base: {summary.baseCurrency}</Text>
            <Text style={theme.typography.body}>Totals: {JSON.stringify(summary.totalsByType)}</Text>
            <VictoryChart theme={VictoryTheme.material} domainPadding={12}>
              <VictoryAxis style={{ tickLabels: { fill: '#B0B0B0' }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} />
              <VictoryAxis dependentAxis style={{ tickLabels: { fill: '#B0B0B0' }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} />
              <VictoryBar data={Object.entries(summary.totalsByType).map(([k,v]: any) => ({ x: k, y: v }))} style={{ data: { fill: '#2979FF' } }} />
            </VictoryChart>
            <View style={{ height: theme.spacing(2) }} />
            <Text style={theme.typography.caption}>Évolution ({period})</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: theme.spacing(1) }}>
              {(['weekly','monthly'] as const).map((p) => (
                <Button key={p} variant={period === p ? 'filled' : 'outline'} onPress={() => setPeriod(p)}>{p}</Button>
              ))}
              <Button variant="outline" onPress={loadSummary}>Actualiser</Button>
            </View>
            {summary.timeline && (
              <VictoryChart theme={VictoryTheme.material} domainPadding={12}>
                <VictoryLegend x={10} y={0} orientation="horizontal" gutter={16} style={{ labels: { fill: '#B0B0B0' } }} data={[
                  { name: 'Dépenses', symbol: { fill: '#FF4C4C' } },
                  { name: 'Revenus', symbol: { fill: '#22C55E' } },
                  { name: 'Épargne', symbol: { fill: '#2979FF' } },
                ]} />
                <VictoryAxis style={{ tickLabels: { fill: '#B0B0B0', angle: 45, fontSize: 9 }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} tickFormat={(t) => String(t)} />
                <VictoryAxis dependentAxis style={{ tickLabels: { fill: '#B0B0B0' }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} />
                <VictoryLine data={summary.timeline.map((pt: any) => ({ x: pt.periodStart, y: pt.totalsByType.expense }))} style={{ data: { stroke: '#FF4C4C' } }} />
                <VictoryLine data={summary.timeline.map((pt: any) => ({ x: pt.periodStart, y: pt.totalsByType.income }))} style={{ data: { stroke: '#22C55E' } }} />
                <VictoryLine data={summary.timeline.map((pt: any) => ({ x: pt.periodStart, y: pt.totalsByType.savings }))} style={{ data: { stroke: '#2979FF' } }} />
              </VictoryChart>
            )}
            <View style={{ height: theme.spacing(2) }} />
            <Text style={theme.typography.caption}>Catégories ({categoryType !== 'all' ? categoryType : 'toutes'}):</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginVertical: theme.spacing(1) }}>
              {(['all','expense','income','savings'] as const).map((t) => (
                <Button key={t} variant={categoryType === t ? 'filled' : 'outline'} onPress={() => setCategoryType(t)}>{t}</Button>
              ))}
              <Button variant="outline" onPress={loadSummary}>Actualiser</Button>
            </View>
            {(() => {
              const palette = ['#2979FF', '#00E5FF', '#22C55E', '#F59E0B', '#FF4C4C'];
              const items = (summary.totalsByCategoryFiltered && categoryType !== 'all') ? summary.totalsByCategoryFiltered : summary.totalsByCategory;
              const data = (items || []).map((it: any, i: number) => {
                const cat = categories.find((c) => c._id === it.categoryId);
                const name = cat?.name || String(it.categoryId).slice(-6);
                return { x: name, y: it.amountMinor, fill: palette[i % palette.length] };
              });
              return (
                <VictoryChart theme={VictoryTheme.material} domainPadding={12}>
                  <VictoryAxis style={{ tickLabels: { fill: '#B0B0B0', angle: 45, fontSize: 9 }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} />
                  <VictoryAxis dependentAxis style={{ tickLabels: { fill: '#B0B0B0' }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} />
                  <VictoryBar data={data} style={{ data: { fill: ({ datum }) => (datum as any).fill } }} />
                </VictoryChart>
              );
            })()}

            <View style={{ height: theme.spacing(2) }} />
            <Text style={theme.typography.caption}>Répartition catégories — période sélectionnée (barres empilées)</Text>
            {(() => {
              const palette = ['#2979FF', '#00E5FF', '#22C55E', '#F59E0B', '#FF4C4C'];
              const items = (summary.totalsByCategoryFiltered && categoryType !== 'all') ? summary.totalsByCategoryFiltered : summary.totalsByCategory;
              const enriched = (items || []).map((it: any, i: number) => {
                const cat = categories.find((c) => c._id === it.categoryId);
                const name = cat?.name || String(it.categoryId).slice(-6);
                const color = palette[i % palette.length];
                return { name, amountMinor: it.amountMinor, color };
              }).sort((a: any, b: any) => b.amountMinor - a.amountMinor);
              const top = enriched.slice(0, 5);
              const rest = enriched.slice(5);
              const restSum = rest.reduce((s: number, it: any) => s + it.amountMinor, 0);
              const series = [...top, ...(restSum > 0 ? [{ name: 'Autres', amountMinor: restSum, color: '#888888' }] : [])];

              return (
                <VictoryChart theme={VictoryTheme.material} domainPadding={12}>
                  <VictoryLegend x={10} y={0} orientation="horizontal" gutter={12} style={{ labels: { fill: '#B0B0B0', fontSize: 10 } }} data={series.map((s) => ({ name: s.name, symbol: { fill: s.color } }))} />
                  <VictoryAxis style={{ tickLabels: { fill: '#B0B0B0' }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} tickValues={['Période']} />
                  <VictoryAxis dependentAxis style={{ tickLabels: { fill: '#B0B0B0' }, axis: { stroke: '#B0B0B0' }, grid: { stroke: '#1F1F1F' } }} />
                  <VictoryStack colorScale={series.map((s) => s.color)}>
                    {series.map((s, idx) => (
                      <VictoryBar key={idx} data={[{ x: 'Période', y: s.amountMinor }]} />
                    ))}
                  </VictoryStack>
                </VictoryChart>
              );
            })()}
          </View>
        )}
      </Card>

      <View style={{ height: theme.spacing(3) }} />
      <Card header="Transactions récentes">
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" onPress={() => { setNextCursor(null); setTransactions([]); loadRecent(true); }}>Charger 10</Button>
          <Button variant="outline" onPress={() => navigation.navigate('AddTransaction')}>Ajouter</Button>
        </View>
        <View style={{ height: theme.spacing(2) }} />
        <Text style={theme.typography.caption}>Filtrer par catégorie:</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginVertical: theme.spacing(1) }}>
          <Button variant={selectedCategoryId ? 'outline' : 'filled'} onPress={() => { setSelectedCategoryId(null); setNextCursor(null); setTransactions([]); loadRecent(true); }}>Toutes</Button>
          {categories.map((c) => (
            <Button key={c._id} variant={selectedCategoryId === c._id ? 'filled' : 'outline'} onPress={() => { setSelectedCategoryId(c._id); setNextCursor(null); setTransactions([]); loadRecent(true); }}>{c.name}</Button>
          ))}
        </View>
        {transactions.map((tx) => (
          <Pressable key={tx._id} onPress={() => navigation.navigate('TransactionDetail', { id: tx._id })}>
            <Text style={theme.typography.body}>• {String(tx.date).slice(0,10)} — {tx.amountMinor} {tx.currency} (cat: {String(tx.categoryId).slice(-6)})</Text>
          </Pressable>
        ))}
        {nextCursor && (
          <View style={{ marginTop: theme.spacing(2) }}>
            <Button onPress={() => loadRecent(false)} loading={loadingMore}>Charger plus</Button>
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: theme.spacing(4) },
});
