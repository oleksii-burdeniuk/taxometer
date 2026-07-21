import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardDismissAccessory } from '@/components/keyboard-dismiss-accessory';
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
          <Stack.Screen name="statistics" options={{ animation: 'slide_from_right', presentation: 'card' }} />
          <Stack.Screen name="taxi-profile" options={{ animation: 'slide_from_right', presentation: 'card' }} />
          <Stack.Screen name="trip/[id]" options={{ animation: 'slide_from_bottom', presentation: 'card' }} />
          <Stack.Screen name="active-trip" options={{ animation: 'none' }} />
          <Stack.Screen name="trip-control" options={{ animation: 'none' }} />
        </Stack>
        <KeyboardDismissAccessory />
      </AppProvider>
    </I18nProvider>
  );
}

export default function RootLayout() {
  return <SafeAreaProvider><ThemeProvider><AppRoot /></ThemeProvider></SafeAreaProvider>;
}
