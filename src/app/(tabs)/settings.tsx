import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader, sharedStyles } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useI18n } from '@/i18n';
import { Language } from '@/types';

type LanguageOption = { value: Language; label: string; flag: string };

function LanguageSelector({ options, selected, onSelect }: {
  options: LanguageOption[]; selected: Language; onSelect: (language: Language) => void;
}) {
  return (
    <Card style={styles.card}>
      {options.map((option, index) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === option.value }}
          key={option.value}
          onPress={() => onSelect(option.value)}
          style={[styles.row, index < options.length - 1 && styles.divider]}>
          <Text style={styles.flag}>{option.flag}</Text>
          <Text style={styles.label}>{option.label}</Text>
          {selected === option.value && <Ionicons name="checkmark-circle" size={24} color={colors.success} />}
        </Pressable>
      ))}
    </Card>
  );
}

export default function SettingsScreen() {
  const { t, language, setLanguage, receiptLanguage, setReceiptLanguage } = useI18n();
  const options: LanguageOption[] = [
    { value: 'uk', label: t('ukrainian'), flag: '🇺🇦' },
    { value: 'en', label: t('english'), flag: '🇬🇧' },
    { value: 'pl', label: t('polish'), flag: '🇵🇱' },
  ];
  return (
    <SafeAreaView edges={['top']} style={sharedStyles.screen}>
      <ScreenHeader title={t('settings')} />
      <ScrollView contentContainerStyle={sharedStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={sharedStyles.label}>{t('language')}</Text>
        <LanguageSelector options={options} selected={language} onSelect={setLanguage} />
        <Text style={[sharedStyles.label, styles.sectionLabel]}>{t('receiptLanguage')}</Text>
        <LanguageSelector options={options} selected={receiptLanguage} onSelect={setReceiptLanguage} />
        <View style={styles.about}>
          <View style={styles.logo}><Ionicons name="speedometer" size={28} color={colors.dark} /></View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 0 }, row: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { borderBottomWidth: 1, borderColor: colors.border }, flag: { fontSize: 24 },
  label: { flex: 1, fontSize: 16, fontWeight: '700' }, sectionLabel: { marginTop: 4 },
  about: { alignItems: 'center', marginTop: 24, gap: 7 },
  logo: { width: 58, height: 58, backgroundColor: colors.primary, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 18, fontWeight: '900' }, version: { color: colors.muted, fontSize: 12 },
});
