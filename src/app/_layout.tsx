import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/context/app-context';
import { I18nProvider } from '@/i18n';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            <Stack.Screen name="trip/[id]" options={{ animation: 'slide_from_bottom', presentation: 'card' }} />
          </Stack>
        </AppProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
