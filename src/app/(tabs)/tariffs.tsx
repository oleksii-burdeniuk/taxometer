import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Field, ScreenHeader, useSharedStyles } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
import { confirmAction } from '@/lib/confirm-action';
import { createId, formatMoney, getCrossoverSpeedKmh } from '@/lib/meter';
import { Tariff, TariffKind, TariffScheduleKind } from '@/types';

type NumericField = 'baseFare' | 'includedKm' | 'waitingPerHour' | 'minimumFare';
type VariantForm = {
  id: string;
  name: string;
  zone: string;
  pricePerKm: string;
  scheduleKind: TariffScheduleKind;
  startTime: string;
  endTime: string;
  isDefault: boolean;
  showOnHome: boolean;
};
type Form = {
  id: string;
  groupId?: string;
  kind: TariffKind;
  name: string;
  groupName: string;
  currency: Tariff['currency'];
  baseFare: string;
  includedKm: string;
  waitingPerHour: string;
  minimumFare: string;
  createdAt: string;
  variants: VariantForm[];
};

const defaultCurrencies: Tariff['currency'][] = ['UAH', 'PLN', 'EUR', 'USD'];
const scheduleKinds: TariffScheduleKind[] = ['always', 'weekday', 'nightHoliday'];

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^0-9.,]/g, '');
  const separatorIndex = cleaned.search(/[.,]/);
  if (separatorIndex === -1) return cleaned;
  const integer = cleaned.slice(0, separatorIndex).replace(/[^0-9]/g, '') || '0';
  const separator = cleaned[separatorIndex];
  const decimal = cleaned.slice(separatorIndex + 1).replace(/[^0-9]/g, '');
  return `${integer}${separator}${decimal}`;
}

const sanitizeCurrencyCode = (value: string) => value.replace(/[^a-z]/gi, '').toUpperCase().slice(0, 3);

const sanitizeTimeInput = (value: string) => value.replace(/[^0-9:]/g, '').slice(0, 5);
const numberText = (value: number) => String(Math.round(value * 1_000_000) / 1_000_000);
const timeText = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const parseTime = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
};

const emptyVariant = (overrides: Partial<VariantForm> = {}): VariantForm => ({
  id: createId(), name: '', zone: '', pricePerKm: '0', scheduleKind: 'always',
  startTime: '06:00', endTime: '22:00', isDefault: false, showOnHome: true, ...overrides,
});

const emptyForm = (): Form => ({
  id: createId(), kind: 'single', name: '', groupName: '', currency: 'PLN',
  baseFare: '0', includedKm: '0.2', waitingPerHour: '55', minimumFare: '0',
  createdAt: new Date().toISOString(), variants: [emptyVariant()],
});

function scheduleForTariff(tariff: Tariff) {
  if (tariff.schedule) return tariff.schedule;
  if (tariff.period === 'day') return { kind: 'weekday' as const, startMinutes: 360, endMinutes: 1320 };
  if (tariff.period === 'night') return { kind: 'nightHoliday' as const, startMinutes: 1320, endMinutes: 360 };
  return { kind: 'always' as const, startMinutes: 0, endMinutes: 0 };
}

function variantLabel(tariff: Tariff) {
  return tariff.variantLabel ?? ([tariff.zone && `Strefa ${tariff.zone}`, tariff.period === 'day' ? 'Dzień' : tariff.period === 'night' ? 'Noc/święta' : undefined].filter(Boolean).join(' · ') || tariff.name);
}

function formFromTariffs(items: Tariff[]): Form {
  const first = items[0];
  return {
    id: first.id, groupId: first.groupId, kind: first.kind ?? (first.groupId ? 'zoned' : 'single'),
    name: first.name, groupName: first.groupName ?? '', currency: first.currency,
    baseFare: numberText(first.baseFare), includedKm: numberText(first.includedKm),
    waitingPerHour: numberText(first.waitingPerMinute * 60), minimumFare: numberText(first.minimumFare),
    createdAt: first.createdAt,
    variants: items.map((tariff) => {
      const schedule = scheduleForTariff(tariff);
      return {
        id: tariff.id, name: variantLabel(tariff), zone: tariff.zone ?? '', pricePerKm: numberText(tariff.pricePerKm),
        scheduleKind: schedule.kind, startTime: timeText(schedule.startMinutes), endTime: timeText(schedule.endMinutes),
        isDefault: tariff.isDefault, showOnHome: tariff.showOnHome !== false,
      };
    }),
  };
}

export default function TariffsScreen() {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const sharedStyles = useSharedStyles();
  const styles = useThemedStyles(createStyles);
  const { tariffs, activeTrip, saveTariff, saveTariffs, deleteTariff, deleteTariffGroup, setDefaultTariff, setTariffVisibility, setTariffGroupVisibility } = useApp();
  const [form, setForm] = useState<Form | null>(null);
  const [crossoverExpanded, setCrossoverExpanded] = useState(false);
  const [customCurrencyOpen, setCustomCurrencyOpen] = useState(false);
  const [customCurrency, setCustomCurrency] = useState('');
  const groups = useMemo(() => {
    const map = new Map<string, Tariff[]>();
    tariffs.forEach((tariff) => {
      const key = tariff.groupId ?? tariff.id;
      map.set(key, [...(map.get(key) ?? []), tariff]);
    });
    return [...map.entries()].map(([id, items]) => ({ id, items }));
  }, [tariffs]);
  const availableCurrencies = useMemo(() => [...new Set([...defaultCurrencies, ...tariffs.map((tariff) => tariff.currency), ...(form ? [form.currency] : [])])], [form, tariffs]);
  const switchTrackColors = useMemo(() => ({ false: colors.border, true: colors.primary }), [colors.border, colors.primary]);
  const editing = !!form && tariffs.some((tariff) => tariff.id === form.id || (!!form.groupId && tariff.groupId === form.groupId));
  const parse = (value: string) => Number(value.replace(',', '.'));
  const compactNumber = (value: number, maximumFractionDigits = 2) => Number.isFinite(value) ? new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value) : '—';
  const crossoverPreview = form ? (() => {
    if (form.kind !== 'single') return `${form.variants.length} ${t('rates')}`;
    const rate = parse(form.variants[0].pricePerKm) || 0;
    const speed = getCrossoverSpeedKmh({ pricePerKm: rate, waitingPerMinute: (parse(form.waitingPerHour) || 0) / 60 });
    return rate > 0 && Number.isFinite(speed) ? `${compactNumber(speed, 1)} km/h` : '—';
  })() : '—';
  const openForm = (nextForm: Form) => {
    setCrossoverExpanded(false);
    setCustomCurrencyOpen(false);
    setCustomCurrency('');
    setForm(nextForm);
  };
  const closeForm = () => {
    setCrossoverExpanded(false);
    setCustomCurrencyOpen(false);
    setCustomCurrency('');
    setForm(null);
  };
  const addCustomCurrency = () => {
    if (!form || !/^[A-Z]{3}$/.test(customCurrency)) return;
    update('currency', customCurrency);
    setCustomCurrencyOpen(false);
    setCustomCurrency('');
  };
  const update = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const updateNumber = (key: NumericField, value: string) => update(key, sanitizeDecimalInput(value));
  const updateVariant = (id: string, patch: Partial<VariantForm>) => setForm((current) => current ? {
    ...current, variants: current.variants.map((variant) => variant.id === id ? { ...variant, ...patch } : variant),
  } : current);

  const changeKind = (kind: TariffKind) => setForm((current) => {
    if (!current || current.kind === kind) return current;
    if (kind === 'single') return { ...current, kind, variants: [{ ...current.variants[0], scheduleKind: 'always' }] };
    const first = { ...current.variants[0], name: current.variants[0].name || t('day'), scheduleKind: 'weekday' as const, startTime: '06:00', endTime: '22:00' };
    return { ...current, kind, variants: [first, emptyVariant({ name: t('nightHoliday'), scheduleKind: 'nightHoliday', startTime: '22:00', endTime: '06:00' })] };
  });

  const addVariant = () => setForm((current) => current ? { ...current, variants: [...current.variants, emptyVariant()] } : current);
  const removeVariant = (id: string) => setForm((current) => {
    if (!current || current.variants.length <= 2 || current.variants.find((variant) => variant.id === id)?.isDefault) return current;
    return { ...current, variants: current.variants.filter((variant) => variant.id !== id) };
  });

  const save = () => {
    if (!form) return;
    const validNumber = /^\d+(?:[.,]\d+)?$/;
    const commonValues = {
      baseFare: parse(form.baseFare), includedKm: parse(form.includedKm),
      waitingPerHour: parse(form.waitingPerHour), minimumFare: parse(form.minimumFare),
    };
    const title = (form.kind === 'single' ? form.name : form.groupName).trim();
    const currentKey = form.groupId ?? form.id;
    const duplicateTitle = tariffs.some((tariff) => (tariff.groupId ?? tariff.id) !== currentKey && (tariff.groupName ?? tariff.name).trim().toLocaleLowerCase() === title.toLocaleLowerCase());
    const variants = form.kind === 'single' ? [{ ...form.variants[0], name: title, scheduleKind: 'always' as const }] : form.variants;
    const variantNames = variants.map((variant) => variant.name.trim().toLocaleLowerCase());
    const commonTextValues = [form.baseFare, form.includedKm, form.waitingPerHour, form.minimumFare];
    const invalidCommonNumber = commonTextValues.some((value) => !validNumber.test(value))
      || Object.values(commonValues).some((value) => !Number.isFinite(value) || value < 0 || value > 1_000_000);
    const invalidPrice = variants.some((variant) => {
      const price = parse(variant.pricePerKm);
      return !validNumber.test(variant.pricePerKm) || !Number.isFinite(price) || price <= 0 || price > 1_000_000;
    });
    const invalidSchedule = variants.some((variant) => {
      if (variant.scheduleKind === 'always') return false;
      const start = parseTime(variant.startTime);
      const end = parseTime(variant.endTime);
      return start === null || end === null || start === end;
    });
    if (!title || title.length > 60 || variants.some((variant) => !variant.name.trim())) {
      Alert.alert(t('invalidForm'), t('validationName')); return;
    }
    if (duplicateTitle || new Set(variantNames).size !== variantNames.length) {
      Alert.alert(t('invalidForm'), t('validationDuplicate')); return;
    }
    if (invalidCommonNumber) {
      Alert.alert(t('invalidForm'), t('validationNumbers')); return;
    }
    if (invalidPrice) {
      Alert.alert(t('invalidForm'), t('validationPrice')); return;
    }
    if (commonValues.minimumFare > 0 && commonValues.minimumFare < commonValues.baseFare) {
      Alert.alert(t('invalidForm'), t('validationMinimumFare')); return;
    }
    if (invalidSchedule) {
      Alert.alert(t('invalidForm'), t('validationSchedule')); return;
    }
    const common = {
      currency: form.currency, baseFare: commonValues.baseFare, includedKm: commonValues.includedKm,
      waitingPerMinute: commonValues.waitingPerHour / 60, minimumFare: commonValues.minimumFare,
      createdAt: form.createdAt, isOfficial: false,
    };
    if (form.kind === 'single') {
      const previous = tariffs.find((tariff) => tariff.id === form.id);
      saveTariff({ ...common, id: form.id, name: title, pricePerKm: parse(variants[0].pricePerKm), kind: 'single',
        isDefault: previous?.isDefault ?? false, showOnHome: previous?.showOnHome ?? true });
    } else {
      const groupId = form.groupId ?? createId();
      saveTariffs(variants.map((variant) => ({
        ...common, id: variant.id, groupId, groupName: title, kind: 'zoned' as const,
        name: `${title} · ${variant.name.trim()}`, variantLabel: variant.name.trim(), zone: variant.zone.trim() || undefined,
        period: variant.scheduleKind === 'weekday' ? 'day' as const : variant.scheduleKind === 'nightHoliday' ? 'night' as const : undefined,
        schedule: { kind: variant.scheduleKind, startMinutes: parseTime(variant.startTime) ?? 0, endMinutes: parseTime(variant.endTime) ?? 0 },
        pricePerKm: parse(variant.pricePerKm), isDefault: variant.isDefault, showOnHome: variant.showOnHome,
      })));
    }
    closeForm();
  };

  const removeGroup = (id: string, items: Tariff[]) => confirmAction({
    title: t('deleteTariffTitle'), message: t('deleteTariffBody'), cancelLabel: t('cancel'), confirmLabel: t('delete'), destructive: true,
    onConfirm: () => {
      const ok = items[0].groupId ? deleteTariffGroup(id) : deleteTariff(items[0].id);
      if (!ok) Alert.alert(t('cannotDelete'));
    },
  });

  const scheduleLabel = (tariff: Tariff) => {
    const schedule = scheduleForTariff(tariff);
    if (schedule.kind === 'always') return t('scheduleAlways');
    const kind = schedule.kind === 'weekday' ? t('scheduleWeekday') : t('scheduleNightHoliday');
    return `${kind} · ${timeText(schedule.startMinutes)}–${timeText(schedule.endMinutes)}`;
  };

  return <SafeAreaView edges={['top']} style={sharedStyles.screen}>
    <ScreenHeader title={t('tariffs')} action={<Pressable accessibilityRole="button" disabled={!!activeTrip} onPress={() => openForm(emptyForm())} style={[styles.add, activeTrip && styles.disabled]}><Ionicons name="add" size={25} color={colors.dark} /><Text style={styles.addText}>{t('addTariff')}</Text></Pressable>} />
    <ScrollView contentContainerStyle={sharedStyles.content}>
      {activeTrip && <View style={styles.lockedNotice}><Ionicons name="lock-closed-outline" size={18} color={colors.warningText} /><Text style={styles.lockedNoticeText}>{t('tariffEditingLocked')}</Text></View>}
      {groups.map(({ id, items }) => {
        const first = items[0];
        const isSet = first.kind === 'zoned' || !!first.groupId;
        const presetEnabled = items.some((tariff) => tariff.showOnHome !== false);
        return <Card key={id} style={styles.tariffCard}>
          <View style={styles.groupHeader}>
            <View style={styles.nameRow}><View style={[styles.icon, items.some((tariff) => tariff.isDefault) && styles.iconDefault]}><Ionicons name={first.isOfficial ? 'shield-checkmark-outline' : 'car-sport-outline'} size={23} color={items.some((tariff) => tariff.isDefault) ? colors.dark : colors.text} /></View><View style={styles.nameText}><Text style={styles.name}>{isSet ? first.groupName : first.name}</Text><View style={styles.badges}><View style={styles.badge}><Text style={styles.badgeText}>{first.currency}</Text></View><View style={styles.badge}><Text style={styles.badgeText}>{first.isOfficial ? t('officialPreset') : isSet ? t('tariffSet') : t('singleTariff')}</Text></View>{items.some((tariff) => tariff.isDefault) && <View style={styles.defaultBadge}><Ionicons name="star" size={11} color={colors.dark} /><Text style={styles.defaultBadgeText}>{t('default')}</Text></View>}</View></View></View>
            {first.isOfficial ? <View style={styles.presetControl}><Text style={[styles.presetState, presetEnabled && styles.presetStateEnabled]}>{presetEnabled ? t('presetEnabled') : t('presetDisabled')}</Text><Switch accessibilityLabel={t('showPresetOnHome')} accessibilityState={{ disabled: !!activeTrip }} disabled={!!activeTrip} style={styles.presetSwitch} value={presetEnabled} onValueChange={(visible) => { if (first.groupId) setTariffGroupVisibility(first.groupId, visible); }} trackColor={switchTrackColors} thumbColor={presetEnabled ? colors.dark : colors.muted} /></View> : <Pressable accessibilityLabel={t('editTariff')} accessibilityRole="button" accessibilityState={{ disabled: !!activeTrip }} disabled={!!activeTrip} onPress={() => openForm(formFromTariffs(items))} style={[styles.editButton, activeTrip && styles.disabled]}><Ionicons name="create-outline" size={20} color={colors.blue} /></Pressable>}
          </View>
          <View style={styles.commonSummary}><Text style={styles.commonSummaryText}>{items.length} {t('rates')}  ·  {t('baseFare')} <Text style={styles.commonSummaryValue}>{formatMoney(first.baseFare, first.currency, locale)}</Text>  ·  {t('waitingRate')} <Text style={styles.commonSummaryValue}>{formatMoney(first.waitingPerMinute * 60, first.currency, locale)}</Text>  ·  {t('includedKm')} <Text style={styles.commonSummaryValue}>{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(first.includedKm)} km</Text></Text>{first.isOfficial && !presetEnabled && <Text style={styles.presetHiddenHint}>{t('presetHiddenHint')}</Text>}</View>
          {(!first.isOfficial || presetEnabled) && <View style={styles.rateList}>{items.map((tariff) => { const crossover = getCrossoverSpeedKmh(tariff); return <View key={tariff.id} style={[styles.variantRow, tariff.isDefault && styles.variantRowDefault]}>
            <View style={styles.variantInfo}>
              <View style={styles.variantHeader}><Text numberOfLines={1} style={styles.variantName}>{isSet ? variantLabel(tariff) : first.name}</Text></View>
              <View style={styles.priceRow}><Text numberOfLines={1} style={styles.variantPrice}>{formatMoney(tariff.pricePerKm, tariff.currency, locale)}</Text><Text style={styles.perKm}>/ km</Text></View>
              <Text numberOfLines={1} style={styles.variantMeta}>{scheduleLabel(tariff)}</Text>
              <Text style={styles.variantMeta}>{t('crossoverSpeed')}: {Number.isFinite(crossover) ? crossover.toFixed(1) : '∞'} km/h</Text>
            </View>
            <View style={styles.compactActions}>
              {!first.isOfficial && <View style={styles.compactHome}><Text style={styles.compactHomeLabel}>{t('homeShort')}</Text><Switch accessibilityLabel={t('showOnHome')} style={styles.compactSwitch} value={tariff.showOnHome !== false} onValueChange={(visible) => { if (!setTariffVisibility(tariff.id, visible)) Alert.alert(t('atLeastOneHomeTariff')); }} trackColor={switchTrackColors} thumbColor={tariff.showOnHome !== false ? colors.dark : colors.muted} /></View>}
              <Pressable accessibilityLabel={tariff.isDefault ? t('default') : t('makeDefault')} accessibilityRole="radio" accessibilityState={{ checked: tariff.isDefault, disabled: !!activeTrip }} disabled={!!activeTrip || tariff.isDefault} onPress={() => setDefaultTariff(tariff.id)} style={[styles.starButton, tariff.isDefault && styles.starButtonActive, activeTrip && styles.disabled]}><Ionicons name={tariff.isDefault ? 'star' : 'star-outline'} size={17} color={tariff.isDefault ? colors.dark : colors.blue} /></Pressable>
            </View>
          </View>; })}</View>}
          {!first.isOfficial && !activeTrip && <Pressable accessibilityRole="button" onPress={() => removeGroup(id, items)} style={styles.deleteAction}><Ionicons name="trash-outline" size={17} color={colors.danger} /><Text style={styles.deleteText}>{isSet ? t('deleteSet') : t('delete')}</Text></Pressable>}
        </Card>;
      })}
    </ScrollView>
    <Modal visible={!!form} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForm}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}><Pressable accessibilityRole="button" onPress={closeForm}><Text style={styles.cancel}>{t('cancel')}</Text></Pressable><Text numberOfLines={1} style={styles.modalTitle}>{editing ? t('editTariff') : t('addTariff')}</Text><View style={styles.modalHeaderSpacer} /></View>
        {form && <><ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {!editing && <><Text style={styles.fieldLabel}>{t('tariffType')}</Text><View style={styles.segmented}>{(['single', 'zoned'] as const).map((kind) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: form.kind === kind }} key={kind} onPress={() => changeKind(kind)} style={[styles.segment, form.kind === kind && styles.segmentActive]}><Text style={[styles.segmentText, form.kind === kind && styles.segmentTextActive]}>{kind === 'single' ? t('singleTariff') : t('tariffSet')}</Text></Pressable>)}</View></>}
          <Field compact label={form.kind === 'single' ? t('tariffName') : t('groupName')} value={form.kind === 'single' ? form.name : form.groupName} onChangeText={(value) => update(form.kind === 'single' ? 'name' : 'groupName', value)} autoFocus />
          <Text style={styles.fieldLabel}>{t('currency')}</Text><View style={styles.currencyRow}>{availableCurrencies.map((currency) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: form.currency === currency }} key={currency} onPress={() => update('currency', currency)} style={[styles.currencyButton, form.currency === currency && styles.currencySelected]}><Text style={[styles.currencyText, form.currency === currency && styles.currencyTextSelected]}>{currency}</Text></Pressable>)}<Pressable accessibilityLabel={t('addCurrency')} accessibilityRole="button" onPress={() => setCustomCurrencyOpen((open) => !open)} style={[styles.currencyButton, styles.currencyAdd, customCurrencyOpen && styles.currencyAddActive]}><Ionicons name={customCurrencyOpen ? 'close' : 'add'} size={19} color={customCurrencyOpen ? colors.onDark : colors.text} /></Pressable></View>
          {customCurrencyOpen && <View style={styles.customCurrencyRow}><Field compact autoCapitalize="characters" autoCorrect={false} label={t('currencyCode')} maxLength={3} onChangeText={(value) => setCustomCurrency(sanitizeCurrencyCode(value))} placeholder="GBP" value={customCurrency} containerStyle={styles.flexField} /><Pressable accessibilityLabel={t('useCurrency')} accessibilityRole="button" accessibilityState={{ disabled: customCurrency.length !== 3 }} disabled={customCurrency.length !== 3} onPress={addCustomCurrency} style={[styles.confirmCurrency, customCurrency.length !== 3 && styles.disabled]}><Ionicons name="checkmark" size={22} color={colors.dark} /></Pressable></View>}
          <View style={styles.twoColumns}><Field compact label={t('baseFare')} value={form.baseFare} onChangeText={(value) => updateNumber('baseFare', value)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /><Field compact label={t('includedKm')} value={form.includedKm} onChangeText={(value) => updateNumber('includedKm', value)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /></View>
          {form.kind === 'single' ? <Field compact label={t('pricePerKm')} value={form.variants[0].pricePerKm} onChangeText={(value) => updateVariant(form.variants[0].id, { pricePerKm: sanitizeDecimalInput(value) })} keyboardType="decimal-pad" inputMode="decimal" /> : <>
            <Text style={styles.sectionTitle}>{t('tariffVariants')}</Text>
            {form.variants.map((variant) => <Card key={variant.id} style={styles.variantEditor}>
              <View style={styles.variantEditorHeader}><Text style={styles.variantEditorTitle}>{variant.name || t('variantName')}</Text>{form.variants.length > 2 && !variant.isDefault && <Pressable accessibilityLabel={t('removeVariant')} accessibilityRole="button" onPress={() => removeVariant(variant.id)}><Ionicons name="close-circle-outline" size={22} color={colors.danger} /></Pressable>}</View>
              <Field compact label={t('variantName')} value={variant.name} onChangeText={(name) => updateVariant(variant.id, { name })} />
              <View style={styles.twoColumns}><Field compact label={t('zoneOptional')} value={variant.zone} onChangeText={(zone) => updateVariant(variant.id, { zone })} containerStyle={styles.flexField} /><Field compact label={t('pricePerKm')} value={variant.pricePerKm} onChangeText={(value) => updateVariant(variant.id, { pricePerKm: sanitizeDecimalInput(value) })} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /></View>
              <Text style={styles.compactLabel}>{t('schedule')}</Text><View style={styles.scheduleOptions}>{scheduleKinds.map((kind) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: variant.scheduleKind === kind }} key={kind} onPress={() => updateVariant(variant.id, { scheduleKind: kind })} style={[styles.scheduleOption, variant.scheduleKind === kind && styles.scheduleOptionActive]}><Text style={[styles.scheduleOptionText, variant.scheduleKind === kind && styles.scheduleOptionTextActive]}>{kind === 'always' ? t('scheduleAlways') : kind === 'weekday' ? t('scheduleWeekday') : t('scheduleNightHoliday')}</Text></Pressable>)}</View>
              {variant.scheduleKind !== 'always' && <View style={styles.twoColumns}><Field compact label={t('startsAt')} value={variant.startTime} onChangeText={(startTime) => updateVariant(variant.id, { startTime: sanitizeTimeInput(startTime) })} keyboardType="numbers-and-punctuation" maxLength={5} containerStyle={styles.flexField} /><Field compact label={t('endsAt')} value={variant.endTime} onChangeText={(endTime) => updateVariant(variant.id, { endTime: sanitizeTimeInput(endTime) })} keyboardType="numbers-and-punctuation" maxLength={5} containerStyle={styles.flexField} /></View>}
            </Card>)}
            <Pressable accessibilityRole="button" onPress={addVariant} style={styles.addVariant}><Ionicons name="add-circle-outline" size={20} color={colors.blue} /><Text style={styles.addVariantText}>{t('addVariant')}</Text></Pressable>
          </>}
          <View style={styles.twoColumns}><Field compact label={t('waitingRate')} value={form.waitingPerHour} onChangeText={(value) => updateNumber('waitingPerHour', value)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /><Field compact label={t('minimumFare')} value={form.minimumFare} onChangeText={(value) => updateNumber('minimumFare', value)} keyboardType="decimal-pad" inputMode="decimal" containerStyle={styles.flexField} /></View>
          <View style={styles.crossoverInfo}><Pressable accessibilityRole="button" accessibilityState={{ expanded: crossoverExpanded }} onPress={() => setCrossoverExpanded((expanded) => !expanded)} style={styles.crossoverHeader}><Ionicons name="speedometer-outline" size={20} color={colors.blue} /><View style={styles.crossoverInfoText}><Text style={styles.crossoverInfoValue}>{t('crossoverSpeed')}</Text><Text style={styles.crossoverAuto}>{t('crossoverAuto')}</Text></View><Text numberOfLines={1} style={styles.crossoverPreview}>{crossoverPreview}</Text><Ionicons name={crossoverExpanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.muted} /></Pressable>{crossoverExpanded && <><View style={styles.crossoverRows}>{form.variants.map((variant) => { const rate = parse(variant.pricePerKm) || 0; const speed = getCrossoverSpeedKmh({ pricePerKm: rate, waitingPerMinute: (parse(form.waitingPerHour) || 0) / 60 }); return <View key={variant.id} style={styles.crossoverRow}><View style={styles.crossoverRate}><Text style={styles.crossoverLabel}>{form.kind === 'single' ? t('pricePerKm') : variant.name || t('variantName')}</Text><Text style={styles.crossoverFormula}>{compactNumber(parse(form.waitingPerHour) || 0)} {form.currency}/{t('hourShort')} ÷ {compactNumber(rate)} {form.currency}/km</Text></View><Text style={styles.crossoverResult}>{rate > 0 && Number.isFinite(speed) ? `${compactNumber(speed, 1)} km/h` : '—'}</Text></View>; })}</View><Text style={styles.crossoverInfoHint}>{t('crossoverHint')}</Text></>}</View>
        </ScrollView><View style={styles.formFooter}><Button label={t('save')} onPress={save} style={styles.save} /></View></>}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  add: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 }, addText: { color: colors.dark, fontWeight: '800', fontSize: 13 }, disabled: { opacity: 0.35 },
  lockedNotice: { padding: 12, borderRadius: 14, backgroundColor: colors.warningBackground, borderWidth: 1, borderColor: colors.warningBorder, flexDirection: 'row', alignItems: 'center', gap: 8 }, lockedNoticeText: { flex: 1, color: colors.warningText, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  tariffCard: { padding: 0, overflow: 'hidden' }, groupHeader: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 }, nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, nameText: { flex: 1, gap: 5 },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, iconDefault: { backgroundColor: colors.primary }, name: { color: colors.text, fontSize: 15, fontWeight: '900' }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.surfaceAlt }, badgeText: { color: colors.muted, fontSize: 8, fontWeight: '800' }, defaultBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 3 }, defaultBadgeText: { color: colors.dark, fontSize: 8, fontWeight: '900' }, editButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  presetControl: { width: 74, alignItems: 'center', justifyContent: 'center' }, presetState: { marginBottom: -4, color: colors.muted, fontSize: 8, fontWeight: '800' }, presetStateEnabled: { color: colors.success }, presetSwitch: { transform: [{ scale: 0.78 }] },
  commonSummary: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderColor: colors.border }, commonSummaryText: { color: colors.muted, fontSize: 9, lineHeight: 15 }, commonSummaryValue: { color: colors.text, fontWeight: '900' }, presetHiddenHint: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  rateList: { borderTopWidth: 1, borderColor: colors.border }, variantRow: { minHeight: 108, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }, variantRowDefault: { backgroundColor: colors.selected }, variantInfo: { flex: 1, minWidth: 0, gap: 3 }, variantHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 }, variantName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '900' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 }, variantPrice: { maxWidth: '78%', color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 }, perKm: { color: colors.muted, fontSize: 10, fontWeight: '700' }, variantMeta: { color: colors.muted, fontSize: 8.5, lineHeight: 12 }, compactActions: { width: 58, alignItems: 'center', gap: 5 }, compactHome: { minHeight: 39, alignItems: 'center', justifyContent: 'center' }, compactHomeLabel: { marginBottom: -5, color: colors.muted, fontSize: 8, fontWeight: '700' }, compactSwitch: { transform: [{ scale: 0.72 }] }, starButton: { width: 34, height: 30, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, starButtonActive: { backgroundColor: colors.primary },
  deleteAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.dangerSoft }, deleteText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  modal: { flex: 1, backgroundColor: colors.background }, modalHeader: { height: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border }, modalTitle: { flexShrink: 1, color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' }, cancel: { color: colors.blue, width: 72 }, modalHeaderSpacer: { width: 72 }, form: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 }, formFooter: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: -7 }, compactLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: -3 }, segmented: { flexDirection: 'row', padding: 3, borderRadius: 13, backgroundColor: colors.surfaceAlt }, segment: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, segmentActive: { backgroundColor: colors.dark }, segmentText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, segmentTextActive: { color: colors.onDark },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, currencyButton: { flexGrow: 1, flexBasis: 62, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 11, borderWidth: 1, borderColor: colors.border }, currencySelected: { backgroundColor: colors.dark, borderColor: colors.dark }, currencyText: { color: colors.text, fontSize: 12, fontWeight: '800' }, currencyTextSelected: { color: colors.onDark }, currencyAdd: { flexGrow: 0, flexBasis: 40 }, currencyAddActive: { backgroundColor: colors.dark, borderColor: colors.dark }, customCurrencyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, confirmCurrency: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  twoColumns: { flexDirection: 'row', gap: 10 }, flexField: { flex: 1 }, save: { minHeight: 50 },
  variantEditor: { gap: 9, borderRadius: 15, padding: 12 }, variantEditorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, variantEditorTitle: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '900' }, scheduleOptions: { flexDirection: 'row', gap: 5 }, scheduleOption: { flex: 1, minHeight: 42, paddingHorizontal: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, scheduleOptionActive: { backgroundColor: colors.selected, borderColor: colors.primary }, scheduleOptionText: { color: colors.muted, fontSize: 9, lineHeight: 11, fontWeight: '700', textAlign: 'center' }, scheduleOptionTextActive: { color: colors.text }, addVariant: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.blue }, addVariantText: { color: colors.blue, fontWeight: '800', fontSize: 12 },
  crossoverInfo: { gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.blueSoft }, crossoverHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 9 }, crossoverInfoText: { flex: 1, minWidth: 0, gap: 1 }, crossoverInfoValue: { color: colors.text, fontSize: 13, fontWeight: '900' }, crossoverAuto: { color: colors.blue, fontSize: 9, fontWeight: '700' }, crossoverPreview: { maxWidth: 72, color: colors.text, fontSize: 12, fontWeight: '900', textAlign: 'right' },
  crossoverRows: { overflow: 'hidden', borderRadius: 11, borderWidth: 1, borderColor: colors.blueBorder, backgroundColor: colors.surface }, crossoverRow: { minHeight: 54, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.blueBorder }, crossoverRate: { flex: 1, gap: 3 }, crossoverLabel: { color: colors.text, fontSize: 11, fontWeight: '800' }, crossoverFormula: { color: colors.muted, fontSize: 9 }, crossoverResult: { color: colors.text, fontSize: 13, fontWeight: '900' }, crossoverInfoHint: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
