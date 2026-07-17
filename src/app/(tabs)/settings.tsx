import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader, useSharedStyles } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
import {
  canUseTripOverlay,
  isTripOverlayEnabled,
  requestTripOverlayPermission,
  setTripOverlayEnabled,
} from '@/services/external-trip-display';
import { Language, ThemePreference } from '@/types';

type LanguageOption = { value: Language; label: string; flag: string };

function Selector<T extends string>({ options, selected, onSelect }: {
  options: { value: T; label: string; icon?: keyof typeof Ionicons.glyphMap; flag?: string }[]; selected: T; onSelect: (value: T) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.card}>
      {options.map((option, index) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === option.value }}
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={[styles.row, index < options.length - 1 && styles.divider]}>
          {option.flag ? <Text style={styles.flag}>{option.flag}</Text> : option.icon ? <Ionicons name={option.icon} size={22} color={colors.muted} /> : null}
          <Text style={styles.label}>{option.label}</Text>
          {selected === option.value && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
        </Pressable>
      ))}
    </Card>
  );
}

export default function SettingsScreen() {
  const { t, language, setLanguage, receiptLanguage, setReceiptLanguage } = useI18n();
  const { colors, preference, setPreference } = useTheme();
  const sharedStyles = useSharedStyles();
  const styles = useThemedStyles(createStyles);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [overlayPermission, setOverlayPermission] = useState(false);
  const overlayPermissionPending = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const refresh = async () => {
      const [allowed, enabled] = await Promise.all([canUseTripOverlay(), isTripOverlayEnabled()]);
      setOverlayPermission(allowed);
      if (allowed && overlayPermissionPending.current) {
        overlayPermissionPending.current = false;
        await setTripOverlayEnabled(true);
        setOverlayEnabled(true);
      } else {
        setOverlayEnabled(enabled);
      }
    };
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, []);

  const toggleOverlay = async () => {
    if (!overlayPermission) {
      overlayPermissionPending.current = true;
      await requestTripOverlayPermission();
      return;
    }
    const next = !overlayEnabled;
    if (await setTripOverlayEnabled(next)) setOverlayEnabled(next);
  };
  const options: LanguageOption[] = [
    { value: 'uk', label: t('ukrainian'), flag: '🇺🇦' },
    { value: 'en', label: t('english'), flag: '🇬🇧' },
    { value: 'pl', label: t('polish'), flag: '🇵🇱' },
  ];
  const themeOptions: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'system', label: t('themeSystem'), icon: 'phone-portrait-outline' },
    { value: 'light', label: t('themeLight'), icon: 'sunny-outline' },
    { value: 'dark', label: t('themeDark'), icon: 'moon-outline' },
  ];
  return (
    <SafeAreaView edges={['top']} style={sharedStyles.screen}>
      <ScreenHeader title={t('settings')} />
      <ScrollView contentContainerStyle={sharedStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={sharedStyles.label}>{t('language')}</Text>
        <Selector options={options} selected={language} onSelect={setLanguage} />
        <Text style={[sharedStyles.label, styles.sectionLabel]}>{t('receiptLanguage')}</Text>
        <Selector options={options} selected={receiptLanguage} onSelect={setReceiptLanguage} />
        <Text style={[sharedStyles.label, styles.sectionLabel]}>{t('appearance')}</Text>
        <Selector options={themeOptions} selected={preference} onSelect={setPreference} />
        {Platform.OS === 'android' && <>
          <Text style={[sharedStyles.label, styles.sectionLabel]}>{t('activeRideDisplay')}</Text>
          <Card style={styles.card}>
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: overlayEnabled }} onPress={() => void toggleOverlay()} style={styles.overlayRow}>
              <View style={[styles.overlayIcon, overlayEnabled && styles.overlayIconActive]}><Ionicons name="albums-outline" size={21} color={overlayEnabled ? colors.dark : colors.muted} /></View>
              <View style={styles.overlayCopy}><Text style={styles.label}>{t('floatingOverlay')}</Text><Text style={styles.overlayHint}>{overlayPermission ? t('floatingOverlayHint') : t('floatingOverlayPermission')}</Text></View>
              <View style={[styles.toggle, overlayEnabled && styles.toggleActive]}><View style={[styles.toggleThumb, overlayEnabled && styles.toggleThumbActive]} /></View>
            </Pressable>
          </Card>
        </>}
        <View style={styles.about}>
          <View style={styles.logo}><Ionicons name="speedometer" size={28} color={colors.dark} /></View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { paddingVertical: 0 }, row: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderBottomWidth: 1, borderColor: colors.border }, flag: { fontSize: 24 },
  label: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' }, sectionLabel: { marginTop: 4 },
  overlayRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  overlayIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  overlayIconActive: { backgroundColor: colors.primary }, overlayCopy: { flex: 1, gap: 3 },
  overlayHint: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  toggle: { width: 45, height: 27, borderRadius: 14, padding: 3, backgroundColor: colors.border }, toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 21, height: 21, borderRadius: 11, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  toggleThumbActive: { transform: [{ translateX: 18 }], backgroundColor: colors.dark },
  about: { alignItems: 'center', marginTop: 24, gap: 7 },
  logo: { width: 58, height: 58, backgroundColor: colors.primary, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  appName: { color: colors.text, fontSize: 18, fontWeight: '900' }, version: { color: colors.muted, fontSize: 12 },
});
