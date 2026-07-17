import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import { ThemeColors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useTheme, useThemedStyles } from '@/context/theme-context';
import { useI18n } from '@/i18n';
import { formatDuration, formatMoney } from '@/lib/meter';
import { buildTripStats, shiftStatsPeriod, startOfStatsPeriod, StatsPeriod, summarizeTrips, tripsInStatsRange, TripStatsBucket } from '@/lib/trip-stats';
import { Tariff } from '@/types';

export default function StatisticsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { trips } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [currency, setCurrency] = useState<Tariff['currency']>('PLN');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedBucketStart, setSelectedBucketStart] = useState<string | null>(null);

  const currencies = useMemo(() => [...new Set(trips.map((trip) => trip.tariff.currency))], [trips]);
  const activeCurrency = currencies.includes(currency) ? currency : currencies[0] ?? 'PLN';
  const stats = useMemo(() => buildTripStats(trips, period, activeCurrency, anchor), [activeCurrency, anchor, period, trips]);
  const selectedStats = stats.buckets.find((bucket) => bucket.start.toISOString() === selectedBucketStart) ?? stats.current;
  const previousStart = shiftStatsPeriod(selectedStats.start, period, -1);
  const previousStats = useMemo(() => summarizeTrips(trips, activeCurrency, previousStart, selectedStats.start), [activeCurrency, previousStart, selectedStats.start, trips]);
  const selectedTrips = useMemo(() => tripsInStatsRange(trips, activeCurrency, selectedStats.start, selectedStats.end).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [activeCurrency, selectedStats.end, selectedStats.start, trips]);
  const comparison = previousStats.fare > 0 ? (selectedStats.fare - previousStats.fare) / previousStats.fare * 100 : null;
  const currentPeriodStart = startOfStatsPeriod(new Date(), period);
  const nextDisabled = stats.current.start.getTime() >= currentPeriodStart.getTime();
  const maxFare = Math.max(...stats.buckets.map((bucket) => bucket.fare), 0);

  const periodLabel = (bucket: TripStatsBucket) => {
    if (period === 'day') return bucket.start.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
    if (period === 'week') return bucket.start.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return bucket.start.toLocaleDateString(locale, { month: 'short' });
  };
  const currentPeriodLabel = (bucket: TripStatsBucket) => {
    if (period === 'day') return bucket.start.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    if (period === 'month') return bucket.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const lastDay = new Date(bucket.end.getTime() - 1);
    return `${bucket.start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${lastDay.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
  };
  const changePeriod = (nextPeriod: StatsPeriod) => {
    setPeriod(nextPeriod);
    setAnchor(new Date());
    setSelectedBucketStart(null);
  };
  const navigatePeriod = (amount: number) => {
    setAnchor((current) => shiftStatsPeriod(current, period, amount));
    setSelectedBucketStart(null);
  };

  const metrics = [
    { icon: 'car-sport-outline', value: `${selectedStats.trips}`, label: t('rides') },
    { icon: 'navigate-outline', value: `${(selectedStats.distanceMeters / 1000).toFixed(1)} km`, label: t('distance') },
    { icon: 'speedometer-outline', value: selectedStats.durationSeconds > 0 ? formatMoney(selectedStats.fare / (selectedStats.durationSeconds / 3600), activeCurrency, locale) : '—', label: t('earningsPerHour') },
    { icon: 'analytics-outline', value: selectedStats.distanceMeters > 0 ? formatMoney(selectedStats.fare / (selectedStats.distanceMeters / 1000), activeCurrency, locale) : '—', label: t('earningsPerKm') },
    { icon: 'time-outline', value: formatDuration(selectedStats.paidSeconds), label: t('paidTime') },
    { icon: 'calculator-outline', value: selectedStats.trips ? formatMoney(selectedStats.fare / selectedStats.trips, activeCurrency, locale) : '—', label: t('averageRide') },
  ] as const;

  return <SafeAreaView edges={['top']} style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityLabel={t('back')} accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
      <Text accessibilityRole="header" style={styles.headerTitle}>{t('statistics')}</Text>
      <View style={styles.headerSpacer} />
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.periodTabs}>{(['day', 'week', 'month'] as const).map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: period === item }} key={item} onPress={() => changePeriod(item)} style={[styles.periodTab, period === item && styles.periodTabActive]}><Text style={[styles.periodTabText, period === item && styles.periodTabTextActive]}>{item === 'day' ? t('daily') : item === 'week' ? t('weekly') : t('monthly')}</Text></Pressable>)}</View>
      {currencies.length > 1 && <View style={styles.currencyTabs}>{currencies.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: activeCurrency === item }} key={item} onPress={() => setCurrency(item)} style={[styles.currencyTab, activeCurrency === item && styles.currencyTabActive]}><Text style={[styles.currencyTabText, activeCurrency === item && styles.currencyTabTextActive]}>{item}</Text></Pressable>)}</View>}

      <Card style={styles.overviewCard}>
        <View style={styles.periodNavigator}>
          <Pressable accessibilityLabel={t('previousPeriod')} accessibilityRole="button" onPress={() => navigatePeriod(-1)} style={styles.navButton}><Ionicons name="chevron-back" size={19} color={colors.text} /></Pressable>
          <Text numberOfLines={1} style={styles.periodCaption}>{currentPeriodLabel(selectedStats)}</Text>
          <Pressable accessibilityLabel={t('nextPeriod')} accessibilityRole="button" accessibilityState={{ disabled: nextDisabled }} disabled={nextDisabled} onPress={() => navigatePeriod(1)} style={[styles.navButton, nextDisabled && styles.navButtonDisabled]}><Ionicons name="chevron-forward" size={19} color={colors.text} /></Pressable>
        </View>
        <View style={styles.overviewMain}>
          <View style={styles.revenueBlock}><Text style={styles.revenueLabel}>{t('earnings')}</Text><Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.revenueValue}>{formatMoney(selectedStats.fare, activeCurrency, locale)}</Text></View>
          <View style={[styles.comparisonBadge, comparison === null ? styles.comparisonNeutral : comparison >= 0 ? styles.comparisonPositive : styles.comparisonNegative]}><Ionicons name={comparison === null ? 'remove' : comparison >= 0 ? 'trending-up' : 'trending-down'} size={13} color={comparison === null ? colors.muted : comparison >= 0 ? colors.success : colors.danger} /><Text numberOfLines={2} style={[styles.comparisonText, { color: comparison === null ? colors.muted : comparison >= 0 ? colors.success : colors.danger }]}>{comparison === null ? t('noComparison') : `${comparison >= 0 ? '+' : ''}${comparison.toFixed(0)}% ${t('vsPrevious')}`}</Text></View>
        </View>
      </Card>

      <View style={styles.summaryGrid}>{metrics.map((metric) => <Card key={metric.label} style={styles.summaryCard}><Ionicons name={metric.icon} size={16} color={colors.blue} /><Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.summaryValue}>{metric.value}</Text><Text numberOfLines={2} style={styles.summaryLabel}>{metric.label}</Text></Card>)}</View>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}><View><Text style={styles.chartTitle}>{t('earningsChart')}</Text><Text style={styles.chartSubtitle}>{activeCurrency}</Text></View><Ionicons name="trending-up" size={19} color={colors.success} /></View>
        <View style={styles.chart}>{stats.buckets.map((bucket) => {
          const height = maxFare > 0 ? Math.max(4, Math.round(bucket.fare / maxFare * 80)) : 4;
          const selected = bucket.start.getTime() === selectedStats.start.getTime();
          return <Pressable accessibilityLabel={`${periodLabel(bucket)}: ${formatMoney(bucket.fare, activeCurrency, locale)}`} accessibilityRole="button" accessibilityState={{ selected }} key={bucket.start.toISOString()} onPress={() => setSelectedBucketStart(bucket.start.toISOString())} style={styles.chartColumn}><Text numberOfLines={1} style={[styles.chartValue, selected && styles.chartValueSelected]}>{bucket.fare > 0 ? new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(bucket.fare) : ''}</Text><View style={styles.barTrack}><View style={[styles.bar, { height }, selected && styles.currentBar]} /></View><Text numberOfLines={1} style={[styles.chartLabel, selected && styles.chartLabelSelected]}>{periodLabel(bucket)}</Text></Pressable>;
        })}</View>
      </Card>

      <View style={styles.activityHeader}><Text style={styles.activityTitle}>{t('periodTrips')}</Text><Text style={styles.activityCount}>{selectedTrips.length}</Text></View>
      {!selectedTrips.length ? <View style={styles.periodEmpty}><Ionicons name="car-outline" size={25} color={colors.muted} /><Text style={styles.periodEmptyText}>{t('noTripsPeriod')}</Text></View> : selectedTrips.map((trip) => <Pressable accessibilityRole="button" key={trip.id} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })} style={styles.activityTrip}><View style={styles.activityIcon}><Ionicons name="car-sport-outline" size={16} color={colors.blue} /></View><View style={styles.activityInfo}><Text numberOfLines={1} style={styles.activityName}>{trip.tariff.variantLabel ?? trip.tariff.name}</Text><Text numberOfLines={1} style={styles.activityMeta}>{new Date(trip.startedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · {new Date(trip.startedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · {(trip.distanceMeters / 1000).toFixed(1)} km</Text></View><Text numberOfLines={1} style={styles.activityPrice}>{formatMoney(trip.total, trip.tariff.currency, locale)}</Text><Ionicons name="chevron-forward" size={15} color={colors.muted} /></Pressable>)}
    </ScrollView>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { width: '100%', maxWidth: 560, alignSelf: 'center', minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  headerSpacer: { width: 38 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 14, paddingBottom: 30, gap: 10 },
  periodTabs: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  periodTab: { flex: 1, minHeight: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  periodTabActive: { backgroundColor: colors.dark },
  periodTabText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  periodTabTextActive: { color: colors.onDark },
  currencyTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  currencyTab: { minWidth: 55, minHeight: 30, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  currencyTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  currencyTabText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  currencyTabTextActive: { color: colors.dark },
  overviewCard: { padding: 12, gap: 12, backgroundColor: colors.selected, borderColor: colors.primary },
  periodNavigator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  navButtonDisabled: { opacity: 0.3 },
  periodCaption: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '800', textAlign: 'center', textTransform: 'capitalize' },
  overviewMain: { minHeight: 55, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  revenueBlock: { flex: 1, minWidth: 0 },
  revenueLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  revenueValue: { width: '100%', marginTop: 3, color: colors.text, fontSize: 29, fontWeight: '900', letterSpacing: -0.8 },
  comparisonBadge: { maxWidth: '43%', minHeight: 28, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  comparisonNeutral: { backgroundColor: colors.surfaceAlt },
  comparisonPositive: { backgroundColor: colors.surface },
  comparisonNegative: { backgroundColor: colors.dangerSoft },
  comparisonText: { flexShrink: 1, fontSize: 9, lineHeight: 12, fontWeight: '900' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  summaryCard: { width: '31%', flexGrow: 1, minHeight: 78, padding: 10, gap: 3, justifyContent: 'center', borderRadius: 16 },
  summaryValue: { width: '100%', color: colors.text, fontSize: 15, fontWeight: '900' },
  summaryLabel: { color: colors.muted, fontSize: 9, lineHeight: 11, fontWeight: '700' },
  chartCard: { padding: 13, gap: 9, borderRadius: 18 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chartTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  chartSubtitle: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 1 },
  chart: { height: 126, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartColumn: { flex: 1, height: '100%', minWidth: 0, alignItems: 'center', justifyContent: 'flex-end' },
  chartValue: { width: '100%', height: 15, color: colors.muted, fontSize: 7, fontWeight: '700', textAlign: 'center' },
  chartValueSelected: { color: colors.text, fontWeight: '900' },
  barTrack: { height: 82, width: '66%', justifyContent: 'flex-end' },
  bar: { width: '100%', minHeight: 4, borderRadius: 6, backgroundColor: colors.blue },
  currentBar: { backgroundColor: colors.primary },
  chartLabel: { width: '100%', height: 20, paddingTop: 5, color: colors.muted, fontSize: 7, fontWeight: '700', textAlign: 'center' },
  chartLabelSelected: { color: colors.text, fontWeight: '900' },
  activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  activityTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  activityCount: { minWidth: 26, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, overflow: 'hidden', backgroundColor: colors.surfaceAlt, color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  periodEmpty: { minHeight: 88, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
  periodEmptyText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  activityTrip: { minHeight: 56, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, minWidth: 0, gap: 2 },
  activityName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  activityMeta: { color: colors.muted, fontSize: 9 },
  activityPrice: { maxWidth: 82, color: colors.text, fontSize: 11, fontWeight: '900', textAlign: 'right' },
});
