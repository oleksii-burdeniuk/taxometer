import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FinishTripModal } from '@/components/finish-trip-modal';
import { Button, Card, Field, ScreenHeader, Stat, useSharedStyles } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
import { confirmAction } from '@/lib/confirm-action';
import { formatDuration, formatMoney } from '@/lib/meter';
import { Tariff } from '@/types';

export default function MeterScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const sharedStyles = useSharedStyles();
  const styles = useThemedStyles(createStyles);
  const { ready, tariffs, selectedTariffId, setSelectedTariffId, activeTrip, displayTrip, elapsedSeconds, gpsStale, recommendedTariffId, startTrip, togglePause, finishTrip, switchTripTariff } = useApp();
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountMode, setDiscountMode] = useState<'percent' | 'finalPrice'>('percent');
  const [finalPriceInput, setFinalPriceInput] = useState('');
  const [fareMode, setFareMode] = useState<'metered' | 'agreed'>('metered');
  const [agreedFareInput, setAgreedFareInput] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [agreedMeterEnabled, setAgreedMeterEnabled] = useState(true);
  const tariffSwitchPending = useRef(false);

  const begin = async () => {
    const agreedFare = Number(agreedFareInput.replace(',', '.'));
    if (fareMode === 'agreed' && (!Number.isFinite(agreedFare) || agreedFare <= 0)) {
      Alert.alert(t('invalidAgreedFare'));
      return;
    }
    setStarting(true);
    try {
      const started = await startTrip(fareMode === 'agreed' ? {
        agreedFare: Math.round(agreedFare * 100) / 100,
        pickupAddress,
        dropoffAddress,
        meterEnabled: agreedMeterEnabled,
      } : undefined);
      if (started) {
        setFareMode('metered'); setAgreedFareInput(''); setPickupAddress(''); setDropoffAddress(''); setAgreedMeterEnabled(true);
      }
    } catch { Alert.alert(t('locationError')); } finally { setStarting(false); }
  };
  const pause = async () => {
    setPausing(true);
    try { await togglePause(); }
    finally { setPausing(false); }
  };
  const openFinishSummary = async () => {
    if (finishing || finishModalVisible || !activeTrip) return;
    setFinishing(true);
    try {
      if (activeTrip.status === 'active') await togglePause();
      setDiscountPercent(0);
      setDiscountMode('percent');
      const price = activeTrip.agreedFare ?? displayTrip?.total ?? activeTrip.total;
      setFinalPriceInput(price.toFixed(2));
      setFinishModalVisible(true);
    } finally { setFinishing(false); }
  };
  const confirmFinish = async () => {
    setFinishing(true);
    try {
      const exactPrice = finalPriceInput.trim() ? Number(finalPriceInput.replace(',', '.')) : undefined;
      const trip = await finishTrip({ percent: discountPercent, finalPrice: exactPrice });
      if (trip) {
        setFinishModalVisible(false);
        router.push({ pathname: '/trip/[id]', params: { id: trip.id } });
      }
    } finally { setFinishing(false); }
  };
  const changeDiscountMode = (mode: 'percent' | 'finalPrice') => {
    setDiscountMode(mode);
  };
  const changeDiscountPercent = (value: number) => {
    setDiscountPercent(value);
    const price = activeTrip?.agreedFare ?? displayTrip?.total ?? activeTrip?.total ?? 0;
    setFinalPriceInput((Math.round((price * (100 - value))) / 100).toFixed(2));
  };
  const changeExactPrice = (value: string) => {
    setFinalPriceInput(value);
    const price = activeTrip?.agreedFare ?? displayTrip?.total ?? activeTrip?.total ?? 0;
    const entered = Number(value.replace(',', '.'));
    if (value.trim() && Number.isFinite(entered) && entered >= 0 && entered <= price) {
      const percent = price > 0 ? ((price - entered) / price) * 100 : 0;
      setDiscountPercent(Math.round(percent * 100) / 100);
    }
  };
  const tariffGroups = useMemo(() => {
    const map = new Map<string, typeof tariffs>();
    tariffs.filter((tariff) => tariff.showOnHome !== false).forEach((tariff) => { const key = tariff.groupId ?? tariff.id; map.set(key, [...(map.get(key) ?? []), tariff]); });
    return [...map.entries()].map(([id, items]) => ({ id, items }));
  }, [tariffs]);
  const hasHomeTariffs = tariffGroups.length > 0;
  const activeGroupTariffs = activeTrip?.tariff.groupId
    ? tariffs.filter((tariff) => tariff.groupId === activeTrip.tariff.groupId && tariff.currency === activeTrip.tariff.currency)
    : [];
  const isMeteredRide = activeTrip?.meterEnabled !== false;
  const tariffLabel = (tariff: Tariff) => tariff.variantLabel ?? tariff.name;
  const switchGroupedTariff = (target: Tariff | undefined) => {
    if (!target || !activeTrip || target.id === activeTrip.tariff.id || tariffSwitchPending.current) return;
    tariffSwitchPending.current = true;
    const unlock = () => { tariffSwitchPending.current = false; };
    const apply = async () => {
      try { await switchTripTariff(target.id); }
      finally { unlock(); }
    };
    if (target.pricePerKm > activeTrip.tariff.pricePerKm) {
      confirmAction({ title: t('higherTariffTitle'), message: t('higherTariffBody'), cancelLabel: t('cancel'), confirmLabel: t('applyTariff'), onCancel: unlock, onConfirm: apply });
    } else void apply();
  };

  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.text} /></View>;
  return (
    <SafeAreaView edges={['top']} style={sharedStyles.screen}>
      <ScreenHeader title={t('appName')} action={<View style={styles.liveBadge}><View style={[styles.dot, activeTrip?.status === 'active' && styles.dotActive, activeTrip?.status === 'paused' && styles.dotPaused]} /><Text style={styles.liveText}>{activeTrip?.status === 'active' ? (activeTrip.meterEnabled === false ? t('fixedStatus') : t('gpsStatus')) : activeTrip?.status === 'paused' ? t('pausedStatus') : t('readyStatus')}</Text></View>} />
      <ScrollView contentContainerStyle={sharedStyles.content} showsVerticalScrollIndicator={false}>
        {activeTrip ? (
          <>
            <Card style={styles.meterCard}>
              <Text style={styles.activeTariff}>{isMeteredRide ? activeTrip.tariff.name : t('fixedPriceRide')}</Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.fare}>{formatMoney(displayTrip?.total ?? activeTrip.total, activeTrip.tariff.currency, locale)}</Text>
              <Text style={styles.fareLabel}>{isMeteredRide ? t('currentFare') : t('agreedFare')}</Text>
              {isMeteredRide && activeTrip.agreedFare !== undefined && <View style={styles.agreedLive}><Text style={styles.agreedLiveLabel}>{t('agreedFare')}</Text><Text style={styles.agreedLiveValue}>{formatMoney(activeTrip.agreedFare, activeTrip.tariff.currency, locale)}</Text></View>}
              <View style={styles.divider} />
              {isMeteredRide ? <View style={styles.stats}>
                <Stat label={t('distance')} value={`${(activeTrip.distanceMeters / 1000).toFixed(2)} km`} />
                <View style={styles.verticalLine} />
                <Stat label={t('time')} value={formatDuration(elapsedSeconds)} />
                <View style={styles.verticalLine} />
                <Stat label={t('paidTime')} value={formatDuration(displayTrip?.waitingSeconds ?? activeTrip.waitingSeconds)} />
              </View> : <View style={styles.fixedTime}><Stat label={t('time')} value={formatDuration(elapsedSeconds)} /></View>}
            </Card>
            {(activeTrip.pickupAddress || activeTrip.dropoffAddress) && <Card style={styles.routeCard}>
              {activeTrip.pickupAddress && <View style={styles.routeRow}><View style={[styles.routeDot, styles.routeDotPickup]} /><View style={styles.routeCopy}><Text style={styles.routeLabel}>{t('pickupAddress')}</Text><Text style={styles.routeAddress}>{activeTrip.pickupAddress}</Text></View></View>}
              {activeTrip.pickupAddress && activeTrip.dropoffAddress && <View style={styles.routeLine} />}
              {activeTrip.dropoffAddress && <View style={styles.routeRow}><View style={[styles.routeDot, styles.routeDotDropoff]} /><View style={styles.routeCopy}><Text style={styles.routeLabel}>{t('dropoffAddress')}</Text><Text style={styles.routeAddress}>{activeTrip.dropoffAddress}</Text></View></View>}
            </Card>}
            {isMeteredRide && recommendedTariffId && recommendedTariffId !== activeTrip.tariff.id && <Pressable accessibilityRole="button" onPress={() => switchGroupedTariff(tariffs.find((tariff) => tariff.id === recommendedTariffId))} style={styles.periodSuggestion}><View style={styles.periodSuggestionText}><Text style={styles.periodSuggestionTitle}>{t('periodSuggestionTitle')}</Text><Text style={styles.periodSuggestionBody}>{t('periodSuggestionBody')}</Text></View><Text style={styles.periodSuggestionAction}>{t('applyTariff')}</Text></Pressable>}
            {isMeteredRide && activeGroupTariffs.length > 1 && (
              <Card style={styles.switchCard}>
                <Text style={styles.switchTitle}>{t('rideTariff')}</Text>
                <View style={styles.tariffSwitches}>
                  {activeGroupTariffs.map((tariff) => { const selected = tariff.id === activeTrip.tariff.id; return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: activeTrip.status !== 'active' }} disabled={activeTrip.status !== 'active'} key={tariff.id} onPress={() => switchGroupedTariff(tariff)} style={[styles.tariffSwitch, selected && styles.tariffSwitchActive]}><Text style={[styles.tariffSwitchText, selected && styles.tariffSwitchTextActive]}>{tariffLabel(tariff)}</Text></Pressable>; })}
                </View>
                <View style={styles.switchHint}><Ionicons name="information-circle-outline" size={17} color={colors.blue} /><Text style={styles.switchHintText}>{t('zoneSwitchHint')}</Text></View>
              </Card>
            )}
            {isMeteredRide && (activeTrip.trackingWarning === 'gps' || gpsStale) && <View style={styles.gpsWarning}><Ionicons name="warning-outline" size={18} color={colors.warningText} /><Text style={styles.gpsWarningText}>{t('gpsBillingPaused')}</Text></View>}
            {isMeteredRide && <View style={styles.gpsNote}><Ionicons name="navigate" size={16} color={colors.blue} /><Text style={styles.gpsNoteText}>{t('foregroundNote')}</Text></View>}
            <View style={styles.actionRow}>
              <Button disabled={finishing} label={activeTrip.status === 'paused' ? t('resume') : t('pause')} loading={pausing} variant="ghost" onPress={() => void pause()} style={styles.actionButton} />
              <Button disabled={pausing} label={t('stop')} loading={finishing} variant="danger" onPress={() => void openFinishSummary()} style={styles.actionButton} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}><Ionicons name="car-sport" size={29} color={colors.dark} /></View>
              <View style={styles.heroCopy}><Text style={styles.heroTitle}>{t('ready')}</Text><Text style={[sharedStyles.body, styles.heroBody]}>{t('chooseTariff')}</Text></View>
            </View>
            <Card style={styles.fareModeCard}>
              <Text style={styles.fareModeTitle}>{t('fareMode')}</Text>
              <View style={styles.fareModeOptions}>
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: fareMode === 'metered' }} onPress={() => setFareMode('metered')} style={[styles.fareModeOption, fareMode === 'metered' && styles.fareModeOptionActive]}><Ionicons name="speedometer-outline" size={18} color={fareMode === 'metered' ? colors.dark : colors.muted} /><Text style={[styles.fareModeOptionText, fareMode === 'metered' && styles.fareModeOptionTextActive]}>{t('meteredFare')}</Text></Pressable>
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: fareMode === 'agreed' }} onPress={() => setFareMode('agreed')} style={[styles.fareModeOption, fareMode === 'agreed' && styles.fareModeOptionActive]}><Ionicons name="hand-left-outline" size={18} color={fareMode === 'agreed' ? colors.dark : colors.muted} /><Text style={[styles.fareModeOptionText, fareMode === 'agreed' && styles.fareModeOptionTextActive]}>{t('agreedFare')}</Text></Pressable>
              </View>
              {fareMode === 'agreed' && <>
                <Field autoFocus compact keyboardType="decimal-pad" label={t('agreedFareAmount')} onChangeText={setAgreedFareInput} placeholder={`0.00 ${tariffs.find((tariff) => tariff.id === selectedTariffId)?.currency ?? ''}`} value={agreedFareInput} />
                <View style={styles.addressFields}>
                  <Field compact label={t('pickupAddress')} onChangeText={setPickupAddress} placeholder={t('addressOptional')} value={pickupAddress} />
                  <Field compact label={t('dropoffAddress')} onChangeText={setDropoffAddress} placeholder={t('addressOptional')} value={dropoffAddress} />
                </View>
                <View style={styles.meterToggle}><View style={styles.meterToggleCopy}><Text style={styles.meterToggleTitle}>{t('useTaximeter')}</Text><Text style={styles.meterToggleHint}>{agreedMeterEnabled ? t('useTaximeterHint') : t('fixedPriceOnlyHint')}</Text></View><Switch accessibilityLabel={t('useTaximeter')} onValueChange={setAgreedMeterEnabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={agreedMeterEnabled ? colors.dark : colors.muted} value={agreedMeterEnabled} /></View>
                <View style={styles.agreedHint}><Ionicons name="information-circle-outline" size={17} color={colors.blue} /><Text style={styles.agreedHintText}>{t('agreedFareHint')}</Text></View>
              </>}
            </Card>
            <Button disabled={!hasHomeTariffs} label={t('start')} loading={starting} onPress={begin} />
            <Text style={sharedStyles.label}>{t('activeTariff')}</Text>
            {!hasHomeTariffs && <View style={styles.noTariffs}><Ionicons name="options-outline" size={24} color={colors.muted} /><Text style={styles.noTariffsTitle}>{t('noHomeTariffs')}</Text><Text style={styles.noTariffsHint}>{t('noHomeTariffsHint')}</Text></View>}
            <View style={styles.tariffList}>{tariffGroups.map(({ id, items }) => <View key={id} style={styles.selectionGroup}>
              <Text style={styles.groupLabel}>{items[0].groupName ?? items[0].name}</Text>
              {items.map((tariff) => { const selected = selectedTariffId === tariff.id; return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={tariff.id} onPress={() => setSelectedTariffId(tariff.id)} style={({ pressed }) => [styles.tariff, selected && styles.tariffSelected, pressed && styles.tariffPressed]}>
                <View style={styles.tariffInfo}><Text numberOfLines={2} style={styles.tariffName}>{tariffLabel(tariff)}</Text><Text numberOfLines={1} style={styles.tariffMeta}>{t('baseFare')}: {formatMoney(tariff.baseFare, tariff.currency, locale)}</Text></View>
                <View style={styles.tariffRate}><Text numberOfLines={1} style={styles.tariffPrice}>{formatMoney(tariff.pricePerKm, tariff.currency, locale)}</Text><Text style={styles.perKm}>/ km</Text></View>
                <View style={[styles.selector, selected && styles.selectorSelected]}>{selected && <Ionicons name="checkmark" size={15} color={colors.onDark} />}</View>
              </Pressable>; })}
            </View>)}</View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/tariffs')} style={styles.manage}><Ionicons name="options-outline" size={18} color={colors.text} /><Text style={styles.manageText}>{t('editTariffs')}</Text></Pressable>
          </>
        )}
      </ScrollView>
      <FinishTripModal discountMode={discountMode} discountPercent={discountPercent} finalPriceInput={finalPriceInput} finishing={finishing} onClose={() => setFinishModalVisible(false)} onDiscountChange={changeDiscountPercent} onDiscountModeChange={changeDiscountMode} onFinalPriceChange={changeExactPrice} onFinish={() => void confirmFinish()} trip={displayTrip ?? activeTrip} visible={finishModalVisible} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted }, dotActive: { backgroundColor: colors.success }, dotPaused: { backgroundColor: '#D48B00' }, liveText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  hero: { minHeight: 78, padding: 12, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }, heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1, gap: 3 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: colors.text, letterSpacing: -0.3 }, heroBody: { fontSize: 13, lineHeight: 18 }, tariffList: { gap: 8 },
  tariff: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9 },
  tariffSelected: { borderColor: colors.primary, backgroundColor: colors.selected }, tariffPressed: { opacity: 0.78 }, tariffInfo: { flex: 1, gap: 3 },
  tariffName: { fontSize: 13, lineHeight: 16, fontWeight: '900', color: colors.text }, tariffRate: { alignItems: 'flex-end', gap: 1 },
  tariffPrice: { fontSize: 16, fontWeight: '900', color: colors.text, maxWidth: 105 }, perKm: { fontSize: 9, fontWeight: '600', color: colors.muted }, tariffMeta: { color: colors.muted, fontSize: 9 },
  selector: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' }, selectorSelected: { backgroundColor: colors.dark, borderColor: colors.dark },
  noTariffs: { minHeight: 120, padding: 18, borderRadius: 17, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 }, noTariffsTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, noTariffsHint: { color: colors.muted, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  manage: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, padding: 6 }, manageText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  meterCard: { alignItems: 'center', paddingVertical: 23 }, activeTariff: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  fare: { width: '100%', paddingHorizontal: 8, fontSize: 45, fontWeight: '900', color: colors.text, letterSpacing: -2, marginTop: 10, textAlign: 'center' }, fareLabel: { color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, alignSelf: 'stretch', marginVertical: 20 }, stats: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  agreedLive: { marginTop: 12, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.selected, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary },
  agreedLiveLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' }, agreedLiveValue: { color: colors.text, fontSize: 14, fontWeight: '900' },
  fixedTime: { width: '55%', alignSelf: 'center' },
  routeCard: { gap: 0, paddingVertical: 15 }, routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  routeDot: { width: 11, height: 11, borderRadius: 6, marginTop: 4, borderWidth: 2 }, routeDotPickup: { backgroundColor: colors.primary, borderColor: colors.dark }, routeDotDropoff: { backgroundColor: colors.dark, borderColor: colors.primary },
  routeLine: { width: 2, height: 18, marginLeft: 4.5, backgroundColor: colors.border }, routeCopy: { flex: 1, gap: 2 }, routeLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, routeAddress: { color: colors.text, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  verticalLine: { width: 1, height: 34, backgroundColor: colors.border }, actionRow: { flexDirection: 'row', gap: 12 }, actionButton: { flex: 1 },
  gpsNote: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, gpsNoteText: { flexShrink: 1, color: colors.muted, fontSize: 13, textAlign: 'center' },
  switchCard: { gap: 8, padding: 14 }, switchTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  tariffSwitches: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, padding: 3, borderRadius: 13, backgroundColor: colors.surfaceAlt },
  tariffSwitch: { minHeight: 36, minWidth: '47%', flexGrow: 1, flexBasis: 120, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tariffSwitchActive: { backgroundColor: colors.dark }, tariffSwitchText: { color: colors.muted, fontSize: 10, fontWeight: '800', textAlign: 'center' }, tariffSwitchTextActive: { color: colors.onDark },
  gpsWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 14, backgroundColor: colors.warningBackground }, gpsWarningText: { flex: 1, color: colors.warningText, fontSize: 12, fontWeight: '800' },
  periodSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 15, backgroundColor: colors.warningBackground, borderWidth: 1, borderColor: colors.warningBorder }, periodSuggestionText: { flex: 1 }, periodSuggestionTitle: { color: colors.text, fontSize: 12, fontWeight: '900' }, periodSuggestionBody: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, periodSuggestionAction: { color: colors.blue, fontSize: 12, fontWeight: '900' },
  selectionGroup: { gap: 6, padding: 7, borderRadius: 17, backgroundColor: colors.surfaceAlt }, groupLabel: { paddingHorizontal: 5, paddingTop: 2, color: colors.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  fareModeCard: { gap: 12, padding: 14 }, fareModeTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  fareModeOptions: { flexDirection: 'row', gap: 8 }, fareModeOption: { flex: 1, minHeight: 48, paddingHorizontal: 8, borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  fareModeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary }, fareModeOptionText: { color: colors.muted, fontSize: 11, fontWeight: '900', textAlign: 'center' }, fareModeOptionTextActive: { color: colors.dark },
  agreedHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, agreedHintText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 15 },
  addressFields: { gap: 10 },
  meterToggle: { minHeight: 64, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceAlt, flexDirection: 'row', alignItems: 'center', gap: 12 },
  meterToggleCopy: { flex: 1, gap: 3 }, meterToggleTitle: { color: colors.text, fontSize: 13, fontWeight: '900' }, meterToggleHint: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  switchHint: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 6 }, switchHintText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
});
