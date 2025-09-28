import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '@/navigation/RootNavigator';

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function setupPushNavigation() {
  Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data: any = response.notification.request.content.data || {};
      if (data && data.screen === 'CheckoutMobileMoney') {
        if (navigationRef.isReady()) navigationRef.navigate('CheckoutMobileMoney' as never);
      }
    } catch {}
  });
}

function tzOffsetMinutes(timeZone: string, d: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).formatToParts(d);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0';
  const m = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = (m?.[1] === '-' ? -1 : 1);
  const h = Number(m?.[2] || 0);
  const min = Number(m?.[3] || 0);
  return sign * (h * 60 + min);
}

function ymdInTz(timeZone: string, d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export async function ensureLocalTrialReminders(trialEndsAt: Date | string, locale: 'fr' | 'en' = 'fr') {
  const tz = 'Africa/Brazzaville';
  const target = new Date(trialEndsAt);
  const [ty, tm, td] = ymdInTz(tz, target).split('-').map(Number);
  const planFor = async (daysLeft: 7 | 3 | 1) => {
    const probe = new Date(Date.UTC(ty, tm - 1, td - daysLeft, 12, 0, 0));
    const [y, m, d] = ymdInTz(tz, probe).split('-').map(Number);
    const offsetMin = tzOffsetMinutes(tz, probe);
    const epochMs = Date.UTC(y, m - 1, d, 9, 0, 0) - offsetMin * 60000;
    const when = new Date(epochMs);
    if (when.getTime() <= Date.now()) return;
    const key = `trialReminder_${daysLeft}`;
    const existing = await AsyncStorage.getItem(key);
    const ymd = `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    if (existing === ymd) return;
    const ln = locale === 'en' ? 'en' : 'fr';
    const title = daysLeft === 7 ? (ln === 'en' ? 'Your trial ends in 7 days' : 'Votre période d’essai se termine dans 7 jours') : daysLeft === 3 ? (ln === 'en' ? 'Only 3 days left in your trial' : 'Plus que 3 jours d’essai') : (ln === 'en' ? 'Final day of your trial' : 'Dernier jour d’essai');
    const body = ln === 'en' ? 'Activate Trivida via Mobile Money to keep going.' : 'Activez Trivida via Mobile Money pour continuer.';
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { screen: 'CheckoutMobileMoney', reason: 'trial', daysLeft } },
      trigger: when,
    });
    await AsyncStorage.setItem(key, ymd);
  };
  await planFor(7);
  await planFor(3);
  await planFor(1);
}
