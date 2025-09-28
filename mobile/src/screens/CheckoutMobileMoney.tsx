import React from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { api } from '../api';
import { useAuth } from '../ctx/Auth';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Card from '@/components/Card';
import theme from '@/theme';

const NETWORKS = [
  { key: 'MTN', label: 'MTN MoMo CG' },
  { key: 'AIRTEL', label: 'Airtel Money CG' },
] as const;

type Network = typeof NETWORKS[number]['key'];

export default function CheckoutMobileMoneyScreen() {
  const { token } = useAuth();
  const [network, setNetwork] = React.useState<Network>('MTN');
  const [months, setMonths] = React.useState<number>(1);
  const [phone, setPhone] = React.useState<string>('');
  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const price = 2000;
  const discount = months >= 12 ? 0.15 : months >= 3 ? 0.05 : 0;
  const gross = months * price;
  const total = Math.round(gross * (1 - discount));

  const onPay = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 8) { Alert.alert('Téléphone invalide'); return; }
    try {
      setLoading(true);
      const r = await api('/billing/subscriptions/initiate', { method: 'POST', body: JSON.stringify({ months, network, phone }) }, token || undefined);
      setRequestId(r.requestId);
      if (r.paymentUrl) {
        try { if (token) await api('/analytics/upsell', { method: 'POST', body: JSON.stringify({ event: 'checkout_opened', screen: 'CheckoutMobileMoney' }) }, token); } catch {}
        Linking.openURL(r.paymentUrl);
      } else {
        Alert.alert('Demande initiée', `ID: ${r.requestId}\nMontant: ${r.amount} XAF`);
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Échec de la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.bg }}>
      <Card>
        <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 8 }}>Réseau</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {NETWORKS.map(op => (
            <TouchableOpacity key={op.key} onPress={() => setNetwork(op.key)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: network === op.key ? theme.colors.primary : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ color: network === op.key ? theme.colors.onPrimary : theme.colors.text }}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 8 }}>Durée</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[1,3,12].map((m) => (
            <TouchableOpacity key={m} onPress={() => setMonths(m)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: months === m ? theme.colors.primary : theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ color: months === m ? theme.colors.onPrimary : theme.colors.text }}>{m} mois{m>1?'':''}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 8 }}>Montant</Text>
        <View style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }}>
          {discount > 0 ? (
            <Text style={{ color: theme.colors.text, fontSize: 16 }}>
              <Text style={{ textDecorationLine: 'line-through', color: theme.colors.muted }}>{gross}</Text> → {total} XAF ({Math.round(discount*100)}% off)
            </Text>
          ) : (
            <Text style={{ color: theme.colors.text, fontSize: 16 }}>{total} XAF</Text>
          )}
        </View>
        <Text style={{ color: theme.colors.muted, marginTop: 6 }}>Devise: XAF • Premium</Text>
        <View style={{ height: 12 }} />
        <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 8 }}>Téléphone (format national CG)</Text>
        <Input keyboardType="phone-pad" placeholder="060123456" value={phone} onChangeText={setPhone} />
        <View style={{ height: 16 }} />
        <Button title={loading ? '...' : 'Payer'} onPress={onPay} disabled={loading} />
        {requestId ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: theme.colors.text }}>ID de requête: {requestId}</Text>
          </View>
        ) : null}
      </Card>
    </View>
  );
}
