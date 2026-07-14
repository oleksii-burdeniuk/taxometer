import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from '@/constants/colors';
import { storage } from '@/lib/storage';
import { ThemePreference } from '@/types';

type ThemeValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    storage.getTheme().then(setPreferenceState).catch(() => undefined);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void storage.setTheme(next);
  }, []);
  const scheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo<ThemeValue>(() => ({
    preference,
    setPreference,
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
  }), [preference, scheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
