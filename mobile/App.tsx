import React from 'react';
import { SafeAreaView } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import theme, { useLoadThemeFonts } from './src/theme';
import { AuthProvider } from './src/ctx/Auth';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const fontsReady = useLoadThemeFonts();
  if (!fontsReady) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  return (
    <AuthProvider>
      <ExpoStatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
