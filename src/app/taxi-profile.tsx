import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Field } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
import { confirmAction } from '@/lib/confirm-action';
import { getLicenseExpiryStatus, hasTaxiProfileData, isValidPolishNip, normalizeTaxiProfile } from '@/lib/taxi-profile';
import { TaxiProfile } from '@/types';

type ProfileField = keyof TaxiProfile;

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.sectionHeader}><View style={styles.sectionIcon}><Ionicons name={icon} size={18} color={colors.dark} /></View><Text style={styles.sectionTitle}>{title}</Text></View>;
}

function SwitchRow({ icon, title, hint, value, disabled = false, onChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={[styles.switchRow, disabled && styles.switchDisabled]}>
    <View style={[styles.switchIcon, value && styles.switchIconActive]}><Ionicons name={icon} size={18} color={value ? colors.dark : colors.muted} /></View>
    <View style={styles.switchCopy}><Text style={styles.switchTitle}>{title}</Text><Text style={styles.switchHint}>{hint}</Text></View>
    <View style={[styles.toggle, value && styles.toggleActive]}><View style={[styles.toggleThumb, value && styles.toggleThumbActive]} /></View>
  </Pressable>;
}

export default function TaxiProfileScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { ready, taxiProfile, taxiProfileMetadata, taxiDataPreferences, taxiDataAccess, saveTaxiProfile, setTaxiDataPreference } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState<TaxiProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const profile = draft ?? taxiProfile;
  const hasData = useMemo(() => hasTaxiProfileData(profile), [profile]);
  const licenseStatus = useMemo(() => getLicenseExpiryStatus(profile.licenseValidUntil), [profile.licenseValidUntil]);
  const canEdit = taxiDataAccess.canEditProfile;
  const update = <K extends ProfileField>(field: K, value: TaxiProfile[K]) => {
    setSaved(false);
    setDraft((current) => ({ ...(current ?? taxiProfile), [field]: value }));
  };
  const save = async () => {
    if (!isValidPolishNip(profile.companyNip ?? '')) {
      Alert.alert(t('invalidCompanyData'), t('invalidNip'));
      return false;
    }
    if (licenseStatus === 'invalid') {
      Alert.alert(t('invalidForm'), t('invalidLicenseDate'));
      return false;
    }
    setSaving(true);
    const normalized = normalizeTaxiProfile(profile);
    const didSave = await saveTaxiProfile(normalized);
    if (didSave) setDraft(normalized);
    setSaving(false);
    setSaved(didSave);
    return didSave;
  };
  const clear = () => confirmAction({
    title: t('clearTaxiProfileTitle'),
    message: t('clearTaxiProfileBody'),
    cancelLabel: t('cancel'),
    confirmLabel: t('clearData'),
    destructive: true,
    onConfirm: async () => {
      await saveTaxiProfile({});
      setDraft({});
      setSaved(false);
    },
  });
  const toggleEditing = async (value: boolean) => {
    if (!value && hasData && !(await save())) return;
    await setTaxiDataPreference('allowProfileEditing', value);
  };
  const toggleManagedMode = async (value: boolean) => {
    if (value && canEdit && hasData && !(await save())) return;
    await setTaxiDataPreference('managedMode', value);
  };
  const digitsOnly = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength);

  return <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityLabel={t('back')} accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
      <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>{t('taxiProfile')}</Text>
      <View style={styles.headerSpacer} />
    </View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.statusRow}>
            <View style={styles.optionalBadge}><Text style={styles.optionalText}>{t('optional')}</Text></View>
            <View style={[styles.sourceBadge, taxiDataPreferences.managedMode && styles.sourceBadgeManaged]}><Ionicons name={taxiDataPreferences.managedMode ? 'cloud-done-outline' : 'phone-portrait-outline'} size={12} color={taxiDataPreferences.managedMode ? colors.dark : colors.muted} /><Text style={[styles.sourceText, taxiDataPreferences.managedMode && styles.sourceTextManaged]}>{taxiDataPreferences.managedMode ? t('managedProfile') : t('localProfile')} · v{taxiProfileMetadata.revision}</Text></View>
          </View>
          <Text style={styles.introText}>{t('taxiProfileDescription')}</Text>
        </View>

        <Card style={styles.controlCard}>
          <Text style={styles.controlTitle}>{t('dataControls')}</Text>
          <SwitchRow icon="business-outline" title={t('managedMode')} hint={t('managedModeHint')} value={taxiDataPreferences.managedMode} onChange={(value) => void toggleManagedMode(value)} />
          <View style={styles.controlDivider} />
          <SwitchRow icon="receipt-outline" title={t('includeTaxiDataOnReceipt')} hint={t('includeTaxiDataOnReceiptHint')} value={taxiDataPreferences.includeOnReceipt} onChange={(value) => void setTaxiDataPreference('includeOnReceipt', value)} />
          <View style={styles.controlDivider} />
          <SwitchRow disabled={taxiDataPreferences.managedMode} icon="create-outline" title={t('allowTaxiDataEditing')} hint={t('allowTaxiDataEditingHint')} value={taxiDataPreferences.allowProfileEditing} onChange={(value) => void toggleEditing(value)} />
          <View style={styles.controlDivider} />
          <SwitchRow disabled={taxiDataPreferences.managedMode} icon="trash-outline" title={t('allowReceiptDeletion')} hint={t('allowReceiptDeletionHint')} value={taxiDataPreferences.allowReceiptDeletion} onChange={(value) => void setTaxiDataPreference('allowReceiptDeletion', value)} />
        </Card>

        {taxiDataPreferences.managedMode && <View style={styles.managedNotice}><Ionicons name="lock-closed-outline" size={18} color={colors.warningText} /><Text style={styles.managedNoticeText}>{t('managedProfileHint')}</Text></View>}

        <Card style={[styles.sectionCard, !canEdit && styles.readOnlyCard]}>
          <SectionTitle icon="business-outline" title={t('companyData')} />
          <Field compact editable={canEdit} autoCapitalize="words" label={t('companyName')} maxLength={120} onChangeText={(value) => update('companyName', value)} placeholder={t('companyNamePlaceholder')} value={profile.companyName ?? ''} />
          <View style={styles.twoColumns}>
            <Field compact editable={canEdit} containerStyle={styles.column} keyboardType="number-pad" label="NIP" maxLength={10} onChangeText={(value) => update('companyNip', digitsOnly(value, 10))} placeholder="1234567890" value={profile.companyNip ?? ''} />
            <Field compact editable={canEdit} autoCapitalize="characters" containerStyle={styles.column} label={t('companyRegistryNumber')} maxLength={20} onChangeText={(value) => update('companyRegistryNumber', value)} value={profile.companyRegistryNumber ?? ''} />
          </View>
          <Text style={styles.registryLabel}>{t('companyRegistry')}</Text>
          <View style={styles.registryOptions}>{(['CEIDG', 'KRS'] as const).map((type) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: profile.companyRegistryType === type, disabled: !canEdit }} disabled={!canEdit} key={type} onPress={() => update('companyRegistryType', profile.companyRegistryType === type ? undefined : type)} style={[styles.registryOption, profile.companyRegistryType === type && styles.registryOptionActive]}><Text style={[styles.registryOptionText, profile.companyRegistryType === type && styles.registryOptionTextActive]}>{type}</Text></Pressable>)}</View>
          <Field compact editable={canEdit} autoCapitalize="words" label={t('companyAddress')} maxLength={180} onChangeText={(value) => update('companyAddress', value)} placeholder={t('companyAddressPlaceholder')} value={profile.companyAddress ?? ''} />
          <View style={styles.twoColumns}>
            <Field compact editable={canEdit} autoComplete="tel" containerStyle={styles.column} keyboardType="phone-pad" label={t('companyPhone')} maxLength={30} onChangeText={(value) => update('companyPhone', value)} placeholder="+48…" value={profile.companyPhone ?? ''} />
            <Field compact editable={canEdit} autoCapitalize="none" autoComplete="email" autoCorrect={false} containerStyle={styles.column} keyboardType="email-address" label="Email" maxLength={120} onChangeText={(value) => update('companyEmail', value)} placeholder="taxi@example.pl" value={profile.companyEmail ?? ''} />
          </View>
        </Card>

        <Card style={[styles.sectionCard, !canEdit && styles.readOnlyCard]}>
          <SectionTitle icon="person-outline" title={t('driverData')} />
          <Field compact editable={canEdit} autoCapitalize="words" label={t('driverName')} maxLength={100} onChangeText={(value) => update('driverName', value)} placeholder={t('driverNamePlaceholder')} value={profile.driverName ?? ''} />
          <Field compact editable={canEdit} autoCapitalize="characters" label={t('driverIdentifier')} maxLength={40} onChangeText={(value) => update('driverIdentifier', value)} placeholder={t('driverIdentifierPlaceholder')} value={profile.driverIdentifier ?? ''} />
          <Field compact editable={canEdit} autoComplete="tel" keyboardType="phone-pad" label={t('driverPhone')} maxLength={30} onChangeText={(value) => update('driverPhone', value)} placeholder="+48…" value={profile.driverPhone ?? ''} />
        </Card>

        <Card style={[styles.sectionCard, !canEdit && styles.readOnlyCard]}>
          <SectionTitle icon="car-sport-outline" title={t('vehicleData')} />
          <View style={styles.twoColumns}>
            <Field compact editable={canEdit} autoCapitalize="words" containerStyle={styles.column} label={t('vehicleMake')} maxLength={50} onChangeText={(value) => update('vehicleMake', value)} placeholder="Toyota" value={profile.vehicleMake ?? ''} />
            <Field compact editable={canEdit} autoCapitalize="words" containerStyle={styles.column} label={t('vehicleModel')} maxLength={50} onChangeText={(value) => update('vehicleModel', value)} placeholder="Corolla" value={profile.vehicleModel ?? ''} />
          </View>
          <Field compact editable={canEdit} autoCapitalize="characters" label={t('registrationNumber')} maxLength={16} onChangeText={(value) => update('vehicleRegistrationNumber', value.toUpperCase())} placeholder="KR 1234A" value={profile.vehicleRegistrationNumber ?? ''} />
          <Field compact editable={canEdit} autoCapitalize="characters" autoCorrect={false} label={t('vehicleVin')} maxLength={17} onChangeText={(value) => update('vehicleVin', value.toUpperCase())} placeholder="XXXXXXXXXXXXXXXXX" value={profile.vehicleVin ?? ''} />
          <Field compact editable={canEdit} autoCapitalize="characters" label={t('vehicleSideNumber')} maxLength={20} onChangeText={(value) => update('vehicleSideNumber', value)} placeholder={t('vehicleSideNumberPlaceholder')} value={profile.vehicleSideNumber ?? ''} />
        </Card>

        <Card style={[styles.sectionCard, !canEdit && styles.readOnlyCard]}>
          <SectionTitle icon="document-text-outline" title={t('taxiLicense')} />
          <Field compact editable={canEdit} autoCapitalize="words" label={t('licenseHolderName')} maxLength={120} onChangeText={(value) => update('licenseHolderName', value)} placeholder={t('licenseHolderPlaceholder')} value={profile.licenseHolderName ?? ''} />
          <View style={styles.twoColumns}>
            <Field compact editable={canEdit} autoCapitalize="characters" containerStyle={styles.column} label={t('licenseNumber')} maxLength={50} onChangeText={(value) => update('licenseNumber', value)} value={profile.licenseNumber ?? ''} />
            <Field compact editable={canEdit} autoCapitalize="characters" containerStyle={styles.column} label={t('licenseExtractNumber')} maxLength={50} onChangeText={(value) => update('licenseExtractNumber', value)} value={profile.licenseExtractNumber ?? ''} />
          </View>
          <Field compact editable={canEdit} autoCapitalize="words" label={t('issuingAuthority')} maxLength={120} onChangeText={(value) => update('licenseIssuingAuthority', value)} placeholder={t('issuingAuthorityPlaceholder')} value={profile.licenseIssuingAuthority ?? ''} />
          <Field compact editable={canEdit} autoCapitalize="words" label={t('licenseArea')} maxLength={120} onChangeText={(value) => update('licenseArea', value)} placeholder={t('licenseAreaPlaceholder')} value={profile.licenseArea ?? ''} />
          <Field compact editable={canEdit} label={t('licenseValidUntil')} maxLength={30} onChangeText={(value) => update('licenseValidUntil', value)} placeholder={t('datePlaceholder')} value={profile.licenseValidUntil ?? ''} />
          {licenseStatus && licenseStatus !== 'invalid' && <View style={[styles.expiryBadge, licenseStatus === 'valid' ? styles.expiryValid : licenseStatus === 'expiring' ? styles.expiryWarning : styles.expiryExpired]}><Ionicons name={licenseStatus === 'valid' ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={15} color={licenseStatus === 'valid' ? colors.success : licenseStatus === 'expiring' ? colors.warningText : colors.danger} /><Text style={[styles.expiryText, { color: licenseStatus === 'valid' ? colors.success : licenseStatus === 'expiring' ? colors.warningText : colors.danger }]}>{licenseStatus === 'valid' ? t('licenseValid') : licenseStatus === 'expiring' ? t('licenseExpiresSoon') : t('licenseExpired')}</Text></View>}
        </Card>

        <View style={styles.privacyNote}><Ionicons name="lock-closed-outline" size={16} color={colors.muted} /><Text style={styles.privacyText}>{t('taxiProfilePrivacy')}</Text></View>
        {saved && <View accessibilityLiveRegion="polite" style={styles.savedBanner}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><Text style={styles.savedText}>{t('dataSaved')}</Text></View>}
        {canEdit && <Button disabled={!ready} label={t('saveData')} loading={saving} onPress={() => void save()} />}
        {canEdit && hasData && <Button label={t('clearData')} onPress={clear} variant="ghost" />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { width: '100%', maxWidth: 560, alignSelf: 'center', minHeight: 56, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, marginHorizontal: 10, color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  headerSpacer: { width: 38 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 14, paddingBottom: 28, gap: 10 },
  intro: { paddingHorizontal: 4, gap: 7 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  optionalBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: colors.primary },
  optionalText: { color: colors.dark, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  introText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  sourceBadge: { minHeight: 25, paddingHorizontal: 8, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt },
  sourceBadgeManaged: { backgroundColor: colors.primary },
  sourceText: { color: colors.muted, fontSize: 9, fontWeight: '800' }, sourceTextManaged: { color: colors.dark },
  sectionCard: { padding: 14, borderRadius: 18, gap: 12 },
  readOnlyCard: { opacity: 0.72 },
  controlCard: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 18 },
  controlTitle: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: 9, paddingBottom: 4 },
  switchRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchDisabled: { opacity: 0.5 },
  switchIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  switchIconActive: { backgroundColor: colors.primary },
  switchCopy: { flex: 1, minWidth: 0, gap: 2 },
  switchTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  switchHint: { color: colors.muted, fontSize: 10, lineHeight: 13 },
  controlDivider: { height: 1, marginLeft: 46, backgroundColor: colors.border },
  toggle: { width: 43, height: 26, borderRadius: 13, padding: 3, backgroundColor: colors.border },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface },
  toggleThumbActive: { transform: [{ translateX: 17 }], backgroundColor: colors.dark },
  managedNotice: { padding: 12, borderRadius: 14, backgroundColor: colors.warningBackground, borderWidth: 1, borderColor: colors.warningBorder, flexDirection: 'row', alignItems: 'center', gap: 8 },
  managedNoticeText: { flex: 1, color: colors.warningText, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 1 },
  sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  twoColumns: { flexDirection: 'row', gap: 9 },
  column: { flex: 1, minWidth: 0 },
  registryLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: -5 },
  registryOptions: { flexDirection: 'row', gap: 7 },
  registryOption: { flex: 1, minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
  registryOptionActive: { borderColor: colors.primary, backgroundColor: colors.selected },
  registryOptionText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, registryOptionTextActive: { color: colors.text },
  expiryBadge: { minHeight: 34, paddingHorizontal: 10, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1 },
  expiryValid: { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, expiryWarning: { backgroundColor: colors.warningBackground, borderColor: colors.warningBorder }, expiryExpired: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  expiryText: { fontSize: 11, fontWeight: '800' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 5, paddingVertical: 5 },
  privacyText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 15 },
  savedBanner: { minHeight: 42, paddingHorizontal: 13, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  savedText: { color: colors.text, fontSize: 13, fontWeight: '800' },
});
