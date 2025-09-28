import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/ctx/Auth';
import AuthScreen from '@/screens/AuthScreen';
import DecisionScreen from '@/screens/DecisionScreen';
import DecisionDetailScreen from '@/screens/DecisionDetailScreen';
import FinanceScreen from '@/screens/FinanceScreen';
import EventsScreen from '@/screens/EventsScreen';
import theme from '@/theme';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

import EventFormScreen from '@/screens/EventFormScreen';
import AddTransactionScreen from '@/screens/AddTransactionScreen';
import SavingsScreen from '@/screens/SavingsScreen';
import TransactionDetailScreen from '@/screens/TransactionDetailScreen';
import CategoriesScreen from '@/screens/CategoriesScreen';
import CategoryDetailScreen from '@/screens/CategoryDetailScreen';
import BusinessListScreen from '@/screens/BusinessListScreen';
import BusinessDetailScreen from '@/screens/BusinessDetailScreen';
import SubscriptionScreen from '@/screens/SubscriptionScreen';
import ExportScreen from '@/screens/ExportScreen';
import CheckoutMobileMoneyScreen from '@/screens/CheckoutMobileMoney';

function AppTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.text, tabBarStyle: { backgroundColor: theme.colors.surface }, tabBarActiveTintColor: theme.colors.primary }}>
      <Tabs.Screen name="Décision" component={DecisionScreen} />
      <Tabs.Screen name="Finance" component={FinanceScreen} />
      <Tabs.Screen name="Événements" component={EventsScreen} />
    </Tabs.Navigator>
  );
}

export const navigationRef = createNavigationContainerRef();

export default function RootNavigator() {
  const { token } = useAuth();
  return (
    <NavigationContainer ref={navigationRef} theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.bg, card: theme.colors.surface, text: theme.colors.text, border: theme.colors.border, primary: theme.colors.primary } }}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.text }}>
        {token ? (
          <>
            <Stack.Screen name="App" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="EventForm" component={EventFormScreen} options={{ title: 'Événement' }} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: 'Transaction' }} />
            <Stack.Screen name="Savings" component={SavingsScreen} options={{ title: 'Épargne' }} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ title: 'Transaction' }} />
            <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Catégories' }} />
            <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ title: 'Catégorie' }} />
            <Stack.Screen name="DecisionDetail" component={DecisionDetailScreen} options={{ title: 'Décision' }} />
            <Stack.Screen name="Businesses" component={BusinessListScreen} options={{ title: 'Business' }} />
            <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} options={{ title: 'Business' }} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Abonnement & Points' }} />
            <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Exporter' }} />
            <Stack.Screen name="CheckoutMobileMoney" component={CheckoutMobileMoneyScreen} options={{ title: 'Mobile Money' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
