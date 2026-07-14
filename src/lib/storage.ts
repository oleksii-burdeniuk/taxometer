import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, Tariff, ThemePreference, Trip } from '@/types';

const KEYS = {
  tariffs: '@taxometer/tariffs',
  trips: '@taxometer/trips',
  activeTrip: '@taxometer/active-trip',
  language: '@taxometer/language',
  receiptLanguage: '@taxometer/receipt-language',
  theme: '@taxometer/theme',
  defaultTariffId: '@taxometer/default-tariff-id',
};

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const storage = {
  getTariffs: (fallback: Tariff[]) => read(KEYS.tariffs, fallback),
  setTariffs: (tariffs: Tariff[]) => AsyncStorage.setItem(KEYS.tariffs, JSON.stringify(tariffs)),
  getTrips: () => read<Trip[]>(KEYS.trips, []),
  setTrips: (trips: Trip[]) => AsyncStorage.setItem(KEYS.trips, JSON.stringify(trips)),
  getActiveTrip: () => read<Trip | null>(KEYS.activeTrip, null),
  setActiveTrip: (trip: Trip | null) =>
    trip
      ? AsyncStorage.setItem(KEYS.activeTrip, JSON.stringify(trip))
      : AsyncStorage.removeItem(KEYS.activeTrip),
  getLanguage: () => read<Language | null>(KEYS.language, null),
  setLanguage: (language: Language) => AsyncStorage.setItem(KEYS.language, JSON.stringify(language)),
  getReceiptLanguage: () => read<Language | null>(KEYS.receiptLanguage, null),
  setReceiptLanguage: (language: Language) => AsyncStorage.setItem(KEYS.receiptLanguage, JSON.stringify(language)),
  getTheme: () => read<ThemePreference>(KEYS.theme, 'system'),
  setTheme: (theme: ThemePreference) => AsyncStorage.setItem(KEYS.theme, JSON.stringify(theme)),
  getDefaultTariffId: () => read<string | null>(KEYS.defaultTariffId, null),
  setDefaultTariffId: (id: string) => AsyncStorage.setItem(KEYS.defaultTariffId, JSON.stringify(id)),
};
