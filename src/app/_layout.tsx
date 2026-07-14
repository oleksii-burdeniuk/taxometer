import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/context/app-context';
import { ThemeProvider, useTheme } from '@/context/theme-context';
import { I18nProvider } from '@/i18n';

function AppRoot() {
  const { scheme, colors } = useTheme();
  return (
    <I18nProvider>
      <AppProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="trip/[id]" options={{ animation: 'slide_from_bottom', presentation: 'card' }} />
        </Stack>
      </AppProvider>
    </I18nProvider>
  );
}

export default function RootLayout() {
  return <SafeAreaProvider><ThemeProvider><AppRoot /></ThemeProvider></SafeAreaProvider>;
}
