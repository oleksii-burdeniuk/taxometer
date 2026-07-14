import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Field, ScreenHeader, useSharedStyles } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
import { confirmAction } from '@/lib/confirm-action';
import { createId, formatMoney, getCrossoverSpeedKmh } from '@/lib/meter';
import { Tariff, TariffKind } from '@/types';

type NumericField = 'baseFare' | 'includedKm' | 'pricePerKm' | 'waitingPerHour' | 'minimumFare' | 'zone1Day' | 'zone1Night' | 'zone2Day' | 'zone2Night';
type Form = {
  id: string; groupId?: string; kind: TariffKind; name: string; groupName: string; currency: Tariff['currency'];
  baseFare: string; includedKm: string; pricePerKm: string; waitingPerHour: string; minimumFare: string;
  zone1Day: string; zone1Night: string; zone2Day: string; zone2Night: string; createdAt: string;
};

const currencies: Tariff['currency'][] = ['UAH', 'PLN', 'EUR', 'USD'];
const rateKeys = ['zone1Day', 'zone1Night', 'zone2Day', 'zone2Night'] as const;

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^0-9.,]/g, '');
  const separatorIndex = cleaned.search(/[.,]/);
  if (separatorIndex === -1) return cleaned;
  const integer = cleaned.slice(0, separatorIndex).replace(/[^0-9]/g, '') || '0';
  const separator = cleaned[separatorIndex];
  const decimal = cleaned.slice(separatorIndex + 1).replace(/[^0-9]/g, '');
  return `${integer}${separator}${decimal}`;
}

const numberText = (value: number) => String(Math.round(value * 1000000) / 1000000);
const emptyForm = (): Form => ({
  id: createId(), kind: 'single', name: '', groupName: '', currency: 'PLN', baseFare: '0', includedKm: '0.2',
  pricePerKm: '0', waitingPerHour: '55', minimumFare: '0',
  zone1Day: '0', zone1Night: '0', zone2Day: '0', zone2Night: '0', createdAt: new Date().toISOString(),
});

function formFromTariffs(items: Tariff[]): Form {
  const first = items[0];
  const findRate = (zone: 'I' | 'II', period: 'day' | 'night') => items.find((tariff) => tariff.zone === zone && tariff.period === period)?.pricePerKm ?? 0;
  return {
    id: first.id, groupId: first.groupId, kind: first.kind ?? (first.groupId ? 'zoned' : 'single'),
    name: first.name, groupName: first.groupName ?? '', currency: first.currency,
    baseFare: numberText(first.baseFare), includedKm: numberText(first.includedKm), pricePerKm: numberText(first.pricePerKm),
    waitingPerHour: numberText(first.waitingPerMinute * 60), minimumFare: numberText(first.minimumFare),
    zone1Day: numberText(findRate('I', 'day')), zone1Night: numberText(findRate('I', 'night')),
    zone2Day: numberText(findRate('II', 'day')), zone2Night: numberText(findRate('II', 'night')), createdAt: first.createdAt,
  };
}

export default function TariffsScreen() {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const sharedStyles = useSharedStyles();
  const styles = useThemedStyles(createStyles);
  const { tariffs, activeTrip, saveTariff, saveTariffs, deleteTariff, deleteTariffGroup, setDefaultTariff } = useApp();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Form | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, Tariff[]>();
    tariffs.forEach((tariff) => {
      const key = tariff.groupId ?? tariff.id;
      map.set(key, [...(map.get(key) ?? []), tariff]);
    });
    return [...map.entries()].map(([id, items]) => ({ id, items }));
  }, [tariffs]);
  const editing = !!form && tariffs.some((tariff) => tariff.id === form.id || (!!form.groupId && tariff.groupId === form.groupId));
  const parse = (value: string) => Number(value.replace(',', '.'));
  const compactNumber = (value: number, maximumFractionDigits = 2) => Number.isFinite(value) ? new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value) : '—';
  const crossoverRows = form ? (form.kind === 'single' ? [
    { key: 'single', label: t('pricePerKm'), rate: parse(form.pricePerKm) || 0 },
  ] : [
    { key: 'zone1Day', label: `${t('zoneOne')} · ${t('day')}`, rate: parse(form.zone1Day) || 0 },
    { key: 'zone1Night', label: `${t('zoneOne')} · ${t('nightHoliday')}`, rate: parse(form.zone1Night) || 0 },
    { key: 'zone2Day', label: `${t('zoneTwo')} · ${t('day')}`, rate: parse(form.zone2Day) || 0 },
    { key: 'zone2Night', label: `${t('zoneTwo')} · ${t('nightHoliday')}`, rate: parse(form.zone2Night) || 0 },
  ]).map((row) => ({
    ...row,
    speed: getCrossoverSpeedKmh({ pricePerKm: row.rate, waitingPerMinute: (parse(form.waitingPerHour) || 0) / 60 }),
  })) : [];
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const updateNumber = (key: NumericField, value: string) => update(key, sanitizeDecimalInput(value));

  const save = () => {
    if (!form) return;
    const numericKeys: NumericField[] = ['baseFare', 'includedKm', 'waitingPerHour', 'minimumFare', ...(form.kind === 'single' ? ['pricePerKm' as const] : rateKeys)];
    const validNumber = /^\d+(?:[.,]\d+)?$/;
    const values = Object.fromEntries(numericKeys.map((key) => [key, parse(form[key])])) as Record<NumericField, number>;
    const title = form.kind === 'single' ? form.name.trim() : form.groupName.trim();
    const rates = form.kind === 'single' ? [values.pricePerKm] : rateKeys.map((key) => values[key]);
    const duplicateTitle = !editing && tariffs.some((tariff) => (tariff.groupName ?? tariff.name).trim().toLocaleLowerCase() === title.toLocaleLowerCase());
    const unreasonableValue = Object.entries(values).some(([key, value]) => value > (key === 'includedKm' ? 1000 : 1_000_000));
    if (!title || title.length > 60 || duplicateTitle || numericKeys.some((key) => !validNumber.test(form[key])) || Object.values(values).some((value) => !Number.isFinite(value) || value < 0) || unreasonableValue || !rates.some((value) => value > 0) || values.minimumFare < values.baseFare) {
      Alert.alert(t('invalidForm')); return;
    }
    const common = {
      currency: form.currency, baseFare: values.baseFare, includedKm: values.includedKm,
      waitingPerMinute: values.waitingPerHour / 60, minimumFare: values.minimumFare,
      isDefault: false, createdAt: form.createdAt, isOfficial: false,
    };
    if (form.kind === 'single') {
      const previous = tariffs.find((tariff) => tariff.id === form.id);
      saveTariff({ ...common, id: form.id, name: title, pricePerKm: values.pricePerKm, kind: 'single', isDefault: previous?.isDefault ?? false });
    } else {
      const groupId = form.groupId ?? createId();
      const existing = tariffs.filter((tariff) => tariff.groupId === groupId);
      const variants = [
        { zone: 'I' as const, period: 'day' as const, rate: values.zone1Day, suffix: 'z1-day', label: `${t('zoneOne')} · ${t('day')}` },
        { zone: 'I' as const, period: 'night' as const, rate: values.zone1Night, suffix: 'z1-night', label: `${t('zoneOne')} · ${t('nightHoliday')}` },
        { zone: 'II' as const, period: 'day' as const, rate: values.zone2Day, suffix: 'z2-day', label: `${t('zoneTwo')} · ${t('day')}` },
        { zone: 'II' as const, period: 'night' as const, rate: values.zone2Night, suffix: 'z2-night', label: `${t('zoneTwo')} · ${t('nightHoliday')}` },
      ];
      saveTariffs(variants.map((variant) => {
        const previous = existing.find((tariff) => tariff.zone === variant.zone && tariff.period === variant.period);
        return {
          ...common, id: previous?.id ?? `${groupId}-${variant.suffix}`, groupId, groupName: title, kind: 'zoned' as const,
          name: `${title} · ${variant.label}`, zone: variant.zone, period: variant.period, pricePerKm: variant.rate,
          isDefault: previous?.isDefault ?? false,
        };
      }));
    }
    setForm(null);
  };

  const removeGroup = (id: string, items: Tariff[]) => {
    confirmAction({
      title: t('deleteTariffTitle'), message: t('deleteTariffBody'), cancelLabel: t('cancel'), confirmLabel: t('delete'), destructive: true,
      onConfirm: () => {
        const ok = items[0].groupId ? deleteTariffGroup(id) : deleteTariff(items[0].id);
        if (!ok) Alert.alert(t('cannotDelete'));
      },
    });
  };

  return <SafeAreaView edges={['top']} style={sharedStyles.screen}>
    <ScreenHeader title={t('tariffs')} action={<Pressable accessibilityRole="button" disabled={!!activeTrip} onPress={() => setForm(emptyForm())} style={[styles.add, activeTrip && styles.disabled]}><Ionicons name="add" size={25} color={colors.dark} /><Text style={styles.addText}>{t('addTariff')}</Text></Pressable>} />
    <ScrollView contentContainerStyle={sharedStyles.content}>
      {groups.map(({ id, items }) => {
        const first = items[0];
        const zoned = first.kind === 'zoned' || !!first.groupId;
        return <Card key={id} style={styles.tariffCard}>
          <View style={styles.groupHeader}>
            <View style={styles.nameRow}><View style={[styles.icon, items.some((tariff) => tariff.isDefault) && styles.iconDefault]}><Ionicons name="car-sport-outline" size={22} color={items.some((tariff) => tariff.isDefault) ? colors.dark : colors.text} /></View><View style={styles.nameText}><Text style={styles.name}>{zoned ? first.groupName : first.name}</Text><Text style={styles.currency}>{first.currency} · {first.isOfficial ? t('officialPreset') : zoned ? t('zonedTariff') : t('singleTariff')}</Text></View></View>
            {!first.isOfficial && <Pressable accessibilityLabel={t('editTariff')} accessibilityRole="button" disabled={!!activeTrip} hitSlop={8} onPress={() => setForm(formFromTariffs(items))}><Ionicons name="create-outline" size={21} color={colors.blue} /></Pressable>}
          </View>
          <View style={styles.rateList}>{items.map((tariff) => <View key={tariff.id} style={styles.variantRow}>
            <View style={styles.variantInfo}><Text style={styles.variantName}>{zoned ? `${tariff.zone === 'I' ? t('zoneOne') : t('zoneTwo')} · ${tariff.period === 'day' ? t('day') : t('nightHoliday')}` : t('pricePerKm')}</Text><Text style={styles.variantMeta}>{formatMoney(tariff.pricePerKm, tariff.currency, locale)}/km · {t('crossoverSpeed')} {Number.isFinite(getCrossoverSpeedKmh(tariff)) ? getCrossoverSpeedKmh(tariff).toFixed(1) : '∞'} km/h</Text></View>
            <Pressable accessibilityLabel={tariff.isDefault ? t('default') : t('makeDefault')} accessibilityRole="radio" accessibilityState={{ checked: tariff.isDefault, disabled: !!activeTrip }} disabled={!!activeTrip} onPress={() => setDefaultTariff(tariff.id)} style={[styles.defaultControl, tariff.isDefault && styles.defaultControlActive]}>{tariff.isDefault ? <Ionicons name="checkmark" size={15} color={colors.onDark} /> : <Text style={styles.defaultControlText}>{t('makeDefault')}</Text>}</Pressable>
          </View>)}</View>
          <View style={styles.summaryRow}><Text style={styles.summaryText}>{t('baseFare')}: {formatMoney(first.baseFare, first.currency, locale)} · {t('waitingRate')}: {formatMoney(first.waitingPerMinute * 60, first.currency, locale)}</Text></View>
          {!first.isOfficial && !activeTrip && <Pressable accessibilityRole="button" onPress={() => removeGroup(id, items)} style={styles.deleteAction}><Ionicons name="trash-outline" size={17} color={colors.danger} /><Text style={styles.deleteText}>{zoned ? t('deleteSet') : t('delete')}</Text></Pressable>}
        </Card>;
      })}
    </ScrollView>
    <Modal visible={!!form} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setForm(null)}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}><Pressable accessibilityRole="button" onPress={() => setForm(null)}><Text style={styles.cancel}>{t('cancel')}</Text></Pressable><Text numberOfLines={1} style={styles.modalTitle}>{editing ? t('editTariff') : t('addTariff')}</Text><View style={styles.modalHeaderSpacer} /></View>
        {form && <ScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          {!editing && <><Text style={styles.fieldLabel}>{t('tariffType')}</Text><View style={styles.segmented}>{(['single', 'zoned'] as const).map((kind) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: form.kind === kind }} key={kind} onPress={() => update('kind', kind)} style={[styles.segment, form.kind === kind && styles.segmentActive]}><Text style={[styles.segmentText, form.kind === kind && styles.segmentTextActive]}>{kind === 'single' ? t('singleTariff') : t('zonedTariff')}</Text></Pressable>)}</View></>}
          <Field label={form.kind === 'single' ? t('tariffName') : t('groupName')} value={form.kind === 'single' ? form.name : form.groupName} onChangeText={(value) => update(form.kind === 'single' ? 'name' : 'groupName', value)} autoFocus />
          <Text style={styles.fieldLabel}>{t('currency')}</Text><View style={styles.currencyRow}>{currencies.map((currency) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: form.currency === currency }} key={currency} onPress={() => update('currency', currency)} style={[styles.currencyButton, form.currency === currency && styles.currencySelected]}><Text style={[styles.currencyText, form.currency === currency && styles.currencyTextSelected]}>{currency}</Text></Pressable>)}</View>
          <View style={styles.twoColumns}><Field label={t('baseFare')} value={form.baseFare} onChangeText={(v) => updateNumber('baseFare', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /><Field label={t('includedKm')} value={form.includedKm} onChangeText={(v) => updateNumber('includedKm', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /></View>
          {form.kind === 'single' ? <Field label={t('pricePerKm')} value={form.pricePerKm} onChangeText={(v) => updateNumber('pricePerKm', v)} keyboardType="decimal-pad" inputMode="decimal" /> : <>
            <Text style={styles.sectionTitle}>{t('zoneRates')}</Text>
            <View style={styles.twoColumns}><Field label={`${t('zoneOne')} · ${t('day')}`} value={form.zone1Day} onChangeText={(v) => updateNumber('zone1Day', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /><Field label={`${t('zoneOne')} · ${t('nightHoliday')}`} value={form.zone1Night} onChangeText={(v) => updateNumber('zone1Night', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /></View>
            <View style={styles.twoColumns}><Field label={`${t('zoneTwo')} · ${t('day')}`} value={form.zone2Day} onChangeText={(v) => updateNumber('zone2Day', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /><Field label={`${t('zoneTwo')} · ${t('nightHoliday')}`} value={form.zone2Night} onChangeText={(v) => updateNumber('zone2Night', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /></View>
          </>}
          <View style={styles.twoColumns}><Field label={t('waitingRate')} value={form.waitingPerHour} onChangeText={(v) => updateNumber('waitingPerHour', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /><Field label={t('minimumFare')} value={form.minimumFare} onChangeText={(v) => updateNumber('minimumFare', v)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /></View>
          <View style={styles.crossoverInfo}>
            <View style={styles.crossoverHeader}><Ionicons name="speedometer-outline" size={22} color={colors.blue} /><View style={styles.crossoverInfoText}><Text style={styles.crossoverInfoValue}>{t('crossoverSpeed')}</Text><Text style={styles.crossoverAuto}>{t('crossoverAuto')}</Text></View></View>
            <View style={styles.crossoverRows}>{crossoverRows.map((row) => <View key={row.key} style={styles.crossoverRow}>
              <View style={styles.crossoverRate}><Text style={styles.crossoverLabel}>{row.label}</Text><Text style={styles.crossoverFormula}>{compactNumber(parse(form.waitingPerHour) || 0)} {form.currency}/{t('hourShort')} ÷ {compactNumber(row.rate)} {form.currency}/km</Text></View>
              <Text style={styles.crossoverResult}>{row.rate > 0 && Number.isFinite(row.speed) ? `${compactNumber(row.speed, 1)} km/h` : '—'}</Text>
            </View>)}</View>
            <Text style={styles.crossoverInfoHint}>{t('crossoverHint')}</Text>
          </View>
          <Button label={t('save')} onPress={save} style={styles.save} />
        </ScrollView>}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 }, addText: { color: colors.dark, fontWeight: '800', fontSize: 13 }, disabled: { opacity: 0.35 },
  tariffCard: { padding: 0, overflow: 'hidden' }, groupHeader: { padding: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, nameText: { flex: 1 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, iconDefault: { backgroundColor: colors.primary }, name: { color: colors.text, fontSize: 17, fontWeight: '800' }, currency: { color: colors.muted, fontSize: 11, marginTop: 3 },
  rateList: { borderTopWidth: 1, borderColor: colors.border }, variantRow: { minHeight: 64, paddingHorizontal: 17, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: colors.border }, variantInfo: { flex: 1 }, variantName: { color: colors.text, fontSize: 13, fontWeight: '800' }, variantMeta: { color: colors.muted, fontSize: 10, marginTop: 4 },
  defaultControl: { minWidth: 44, minHeight: 40, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, defaultControlActive: { backgroundColor: colors.dark, borderColor: colors.dark }, defaultControlText: { color: colors.blue, fontSize: 9, fontWeight: '800' },
  summaryRow: { paddingHorizontal: 17, paddingVertical: 11, backgroundColor: colors.surfaceAlt }, summaryText: { color: colors.muted, fontSize: 10 }, deleteAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, deleteText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  modal: { flex: 1, backgroundColor: colors.background }, modalHeader: { height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border }, modalTitle: { flexShrink: 1, color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' }, cancel: { color: colors.blue, width: 82 }, modalHeaderSpacer: { width: 82 }, form: { padding: 20, gap: 18 },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: -10 }, sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginBottom: -5 }, segmented: { flexDirection: 'row', padding: 4, borderRadius: 15, backgroundColor: colors.surfaceAlt }, segment: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, segmentActive: { backgroundColor: colors.dark }, segmentText: { color: colors.muted, fontWeight: '800' }, segmentTextActive: { color: colors.onDark },
  currencyRow: { flexDirection: 'row', gap: 8 }, currencyButton: { flex: 1, height: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border }, currencySelected: { backgroundColor: colors.dark, borderColor: colors.dark }, currencyText: { color: colors.text, fontWeight: '800' }, currencyTextSelected: { color: colors.onDark },
  twoColumns: { flexDirection: 'row', gap: 12 }, flexField: { flex: 1 }, save: { marginTop: 8 },
  crossoverInfo: { gap: 12, padding: 14, borderRadius: 15, backgroundColor: colors.blueSoft }, crossoverHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, crossoverInfoText: { flex: 1, gap: 2 }, crossoverInfoValue: { color: colors.text, fontSize: 14, fontWeight: '900' }, crossoverAuto: { color: colors.blue, fontSize: 11, fontWeight: '700' },
  crossoverRows: { overflow: 'hidden', borderRadius: 11, borderWidth: 1, borderColor: colors.blueBorder, backgroundColor: colors.surface }, crossoverRow: { minHeight: 54, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.blueBorder }, crossoverRate: { flex: 1, gap: 3 }, crossoverLabel: { color: colors.text, fontSize: 11, fontWeight: '800' }, crossoverFormula: { color: colors.muted, fontSize: 9 }, crossoverResult: { color: colors.text, fontSize: 13, fontWeight: '900' }, crossoverInfoHint: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
