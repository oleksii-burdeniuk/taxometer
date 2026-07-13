import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ScreenHeader, Stat, sharedStyles } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useI18n } from '@/i18n';
import { confirmAction } from '@/lib/confirm-action';
import { formatDuration, formatMoney } from '@/lib/meter';

export default function MeterScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { ready, tariffs, selectedTariffId, setSelectedTariffId, activeTrip, elapsedSeconds, gpsStale, recommendedPeriod, zoneMode, setZoneMode, startTrip, togglePause, finishTrip, switchTripTariff } = useApp();
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const tariffSwitchPending = useRef(false);
  const finishPromptOpen = useRef(false);

  const begin = async () => {
    setStarting(true);
    try { await startTrip(); } catch { Alert.alert(t('locationError')); } finally { setStarting(false); }
  };
  const pause = async () => {
    setPausing(true);
    try { await togglePause(); }
    finally { setPausing(false); }
  };
  const finish = () => {
    if (finishing || finishPromptOpen.current) return;
    finishPromptOpen.current = true;
    const closePrompt = () => { finishPromptOpen.current = false; };
    confirmAction({
      title: t('finishTripTitle'), message: t('finishTripBody'), cancelLabel: t('cancel'), confirmLabel: t('stop'), destructive: true, onCancel: closePrompt,
      onConfirm: async () => {
        closePrompt();
        setFinishing(true);
        try {
          const trip = await finishTrip();
          if (trip) router.push({ pathname: '/trip/[id]', params: { id: trip.id } });
        } finally { setFinishing(false); }
      },
    });
  };
  const tariffGroups = useMemo(() => {
    const map = new Map<string, typeof tariffs>();
    tariffs.forEach((tariff) => { const key = tariff.groupId ?? tariff.id; map.set(key, [...(map.get(key) ?? []), tariff]); });
    return [...map.entries()].map(([id, items]) => ({ id, items }));
  }, [tariffs]);
  const selectedTariff = tariffs.find((tariff) => tariff.id === selectedTariffId) ?? tariffs[0];
  const switchGroupedTariff = (zone: 'I' | 'II', period: 'day' | 'night') => {
    const target = tariffs.find((tariff) => tariff.groupId === activeTrip?.tariff.groupId && tariff.zone === zone && tariff.period === period);
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

  if (!ready) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.dark} /></View>;
  return (
    <SafeAreaView edges={['top']} style={sharedStyles.screen}>
      <ScreenHeader title={t('appName')} action={<View style={styles.liveBadge}><View style={[styles.dot, activeTrip?.status === 'active' && styles.dotActive, activeTrip?.status === 'paused' && styles.dotPaused]} /><Text style={styles.liveText}>{activeTrip?.status === 'active' ? t('gpsStatus') : activeTrip?.status === 'paused' ? t('pausedStatus') : t('readyStatus')}</Text></View>} />
      <ScrollView contentContainerStyle={sharedStyles.content} showsVerticalScrollIndicator={false}>
        {activeTrip ? (
          <>
            <Card style={styles.meterCard}>
              <Text style={styles.activeTariff}>{activeTrip.tariff.name}</Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.fare}>{formatMoney(activeTrip.total, activeTrip.tariff.currency, locale)}</Text>
              <Text style={styles.fareLabel}>{t('currentFare')}</Text>
              <View style={styles.divider} />
              <View style={styles.stats}>
                <Stat label={t('distance')} value={`${(activeTrip.distanceMeters / 1000).toFixed(2)} km`} />
                <View style={styles.verticalLine} />
                <Stat label={t('time')} value={formatDuration(elapsedSeconds)} />
                <View style={styles.verticalLine} />
                <Stat label={t('paidTime')} value={formatDuration(activeTrip.waitingSeconds)} />
              </View>
            </Card>
            {activeTrip.tariff.kind === 'zoned' && activeTrip.tariff.zone && activeTrip.tariff.period && recommendedPeriod && recommendedPeriod !== activeTrip.tariff.period && <Pressable accessibilityRole="button" onPress={() => switchGroupedTariff(activeTrip.tariff.zone!, recommendedPeriod)} style={styles.periodSuggestion}><View style={styles.periodSuggestionText}><Text style={styles.periodSuggestionTitle}>{t('periodSuggestionTitle')}</Text><Text style={styles.periodSuggestionBody}>{t('periodSuggestionBody')}</Text></View><Text style={styles.periodSuggestionAction}>{t('applyTariff')}</Text></Pressable>}
            {activeTrip.tariff.kind === 'zoned' && activeTrip.tariff.groupId && activeTrip.tariff.zone && activeTrip.tariff.period && (
              <Card style={styles.switchCard}>
                <Text style={styles.switchTitle}>{t('tariffZone')}</Text>
                <View style={styles.segmented}>
                  {(['I', 'II'] as const).map((zone) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: activeTrip.tariff.zone === zone }} disabled={activeTrip.status !== 'active' || activeTrip.zoneMode !== 'cross'} key={zone} onPress={() => switchGroupedTariff(zone, activeTrip.tariff.period!)} style={[styles.segment, activeTrip.tariff.zone === zone && styles.segmentActive, activeTrip.zoneMode !== 'cross' && styles.segmentDisabled]}><Text style={[styles.segmentText, activeTrip.tariff.zone === zone && styles.segmentTextActive]}>{zone === 'I' ? t('zoneOne') : t('zoneTwo')}</Text></Pressable>)}
                </View>
                <Text style={[styles.switchTitle, styles.periodTitle]}>{t('tariffPeriod')}</Text>
                <View style={styles.segmented}>
                  {(['day', 'night'] as const).map((period) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: activeTrip.tariff.period === period }} disabled={activeTrip.status !== 'active'} key={period} onPress={() => switchGroupedTariff(activeTrip.tariff.zone!, period)} style={[styles.segment, activeTrip.tariff.period === period && styles.segmentActive]}><Text style={[styles.segmentText, activeTrip.tariff.period === period && styles.segmentTextActive]}>{period === 'day' ? t('day') : t('nightHoliday')}</Text></Pressable>)}
                </View>
                <View style={styles.switchHint}><Ionicons name="information-circle-outline" size={17} color={colors.blue} /><Text style={styles.switchHintText}>{t('zoneSwitchHint')}</Text></View>
              </Card>
            )}
            {(activeTrip.trackingWarning === 'gps' || gpsStale) && <View style={styles.gpsWarning}><Ionicons name="warning-outline" size={18} color="#8A5200" /><Text style={styles.gpsWarningText}>{t('gpsBillingPaused')}</Text></View>}
            <View style={styles.gpsNote}><Ionicons name="navigate" size={16} color={colors.blue} /><Text style={styles.gpsNoteText}>{t('foregroundNote')}</Text></View>
            <View style={styles.actionRow}>
              <Button disabled={finishing} label={activeTrip.status === 'paused' ? t('resume') : t('pause')} loading={pausing} variant="ghost" onPress={() => void pause()} style={styles.actionButton} />
              <Button disabled={pausing} label={t('stop')} loading={finishing} variant="danger" onPress={finish} style={styles.actionButton} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}><Ionicons name="car-sport" size={43} color={colors.dark} /></View>
              <Text style={styles.heroTitle}>{t('ready')}</Text>
              <Text style={sharedStyles.body}>{t('chooseTariff')}</Text>
            </View>
            {selectedTariff?.kind === 'zoned' && <View style={styles.routeModeCard}><Text style={styles.switchTitle}>{t('routeMode')}</Text><View style={styles.segmented}>{(['single', 'cross'] as const).map((mode) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: zoneMode === mode }} key={mode} onPress={() => setZoneMode(mode)} style={[styles.segment, zoneMode === mode && styles.segmentActive]}><Text style={[styles.segmentText, zoneMode === mode && styles.segmentTextActive]}>{mode === 'single' ? t('sameZoneRoute') : t('crossZoneRoute')}</Text></Pressable>)}</View></View>}
            <Button label={t('start')} loading={starting} onPress={begin} />
            <Text style={sharedStyles.label}>{t('activeTariff')}</Text>
            <View style={styles.tariffList}>{tariffGroups.map(({ id, items }) => <View key={id} style={styles.selectionGroup}>
              <Text style={styles.groupLabel}>{items[0].groupName ?? items[0].name}</Text>
              {items.map((tariff) => { const selected = selectedTariffId === tariff.id; return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={tariff.id} onPress={() => setSelectedTariffId(tariff.id)} style={({ pressed }) => [styles.tariff, selected && styles.tariffSelected, pressed && styles.tariffPressed]}>
                <View style={styles.tariffInfo}><Text style={styles.tariffName}>{tariff.kind === 'zoned' ? `${tariff.zone === 'I' ? t('zoneOne') : t('zoneTwo')} · ${tariff.period === 'day' ? t('day') : t('nightHoliday')}` : tariff.name}</Text><Text style={styles.tariffMeta}>{t('baseFare')}: {formatMoney(tariff.baseFare, tariff.currency, locale)}</Text></View>
                <View style={styles.tariffRate}><Text numberOfLines={1} style={styles.tariffPrice}>{formatMoney(tariff.pricePerKm, tariff.currency, locale)}</Text><Text style={styles.perKm}>/ km</Text></View>
                <View style={[styles.selector, selected && styles.selectorSelected]}>{selected && <Ionicons name="checkmark" size={15} color="#fff" />}</View>
              </Pressable>; })}
            </View>)}</View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/tariffs')} style={styles.manage}><Ionicons name="options-outline" size={18} /><Text style={styles.manageText}>{t('editTariffs')}</Text></Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted }, dotActive: { backgroundColor: colors.success }, dotPaused: { backgroundColor: '#D48B00' }, liveText: { fontSize: 11, fontWeight: '800' },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 }, heroIcon: { width: 84, height: 84, borderRadius: 27, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  heroTitle: { fontSize: 27, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }, tariffList: { gap: 10 },
  tariff: { minHeight: 82, paddingHorizontal: 15, paddingVertical: 14, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tariffSelected: { borderColor: colors.dark, backgroundColor: '#FFFDF3' }, tariffPressed: { opacity: 0.78 }, tariffInfo: { flex: 1, gap: 6 },
  tariffName: { fontSize: 17, fontWeight: '800', color: colors.text }, tariffRate: { alignItems: 'flex-end', gap: 3 },
  tariffPrice: { fontSize: 19, fontWeight: '900', color: colors.text, maxWidth: 135 }, perKm: { fontSize: 11, fontWeight: '600', color: colors.muted }, tariffMeta: { color: colors.muted, fontSize: 12 },
  selector: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#C7CBD0', alignItems: 'center', justifyContent: 'center' }, selectorSelected: { backgroundColor: colors.dark, borderColor: colors.dark },
  manage: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8 }, manageText: { color: colors.text, fontWeight: '700' },
  meterCard: { alignItems: 'center', paddingVertical: 30 }, activeTariff: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  fare: { width: '100%', paddingHorizontal: 8, fontSize: 49, fontWeight: '900', color: colors.text, letterSpacing: -2, marginTop: 14, textAlign: 'center' }, fareLabel: { color: colors.muted, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, alignSelf: 'stretch', marginVertical: 26 }, stats: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  verticalLine: { width: 1, height: 34, backgroundColor: colors.border }, actionRow: { flexDirection: 'row', gap: 12 }, actionButton: { flex: 1 },
  gpsNote: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, gpsNoteText: { flexShrink: 1, color: colors.muted, fontSize: 13, textAlign: 'center' },
  switchCard: { gap: 9 }, switchTitle: { color: colors.text, fontSize: 13, fontWeight: '800' }, periodTitle: { marginTop: 5 },
  segmented: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 15, backgroundColor: '#F0F1F2' },
  segment: { flex: 1, minHeight: 42, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.dark }, segmentText: { color: colors.muted, fontSize: 13, fontWeight: '800', textAlign: 'center' }, segmentTextActive: { color: '#fff' },
  segmentDisabled: { opacity: 0.45 }, gpsWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 14, backgroundColor: '#FFF0C7' }, gpsWarningText: { flex: 1, color: '#704400', fontSize: 12, fontWeight: '800' },
  periodSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 15, backgroundColor: '#FFF3BD', borderWidth: 1, borderColor: '#E8C64A' }, periodSuggestionText: { flex: 1 }, periodSuggestionTitle: { color: colors.text, fontSize: 12, fontWeight: '900' }, periodSuggestionBody: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, periodSuggestionAction: { color: colors.blue, fontSize: 12, fontWeight: '900' },
  selectionGroup: { gap: 8, padding: 9, borderRadius: 20, backgroundColor: '#ECEDEF' }, groupLabel: { paddingHorizontal: 7, paddingTop: 3, color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, routeModeCard: { gap: 9, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  switchHint: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginTop: 6 }, switchHintText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
});
