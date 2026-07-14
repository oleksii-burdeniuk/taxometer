import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader, useSharedStyles } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
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
  about: { alignItems: 'center', marginTop: 24, gap: 7 },
  logo: { width: 58, height: 58, backgroundColor: colors.primary, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  appName: { color: colors.text, fontSize: 18, fontWeight: '900' }, version: { color: colors.muted, fontSize: 12 },
});
