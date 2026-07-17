import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useI18n } from '@/i18n';
import { confirmAction } from '@/lib/confirm-action';
import { formatDuration, formatMoney, getTripFareBreakdown } from '@/lib/meter';
import { createReceipt } from '@/lib/receipt';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' });

function DashedRule() {
  return <View style={styles.rule} />;
}

function ReceiptRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <View style={styles.chargeBlock}><View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>{detail && <Text style={styles.detail}>{detail}</Text>}</View>;
}

function Barcode({ value }: { value: string }) {
  return <View style={styles.barcode}>{value.replace(/[^a-z0-9]/gi, '').slice(-22).split('').map((character, index) => <View key={`${character}-${index}`} style={[styles.bar, { width: (character.charCodeAt(0) + index) % 3 + 1 }]} />)}</View>;
}

export default function TripSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, receiptT, receiptLocale } = useI18n();
  const { ready, trips, deleteTrip } = useApp();
  const [exporting, setExporting] = useState(false);
  const trip = trips.find((item) => item.id === id);

  if (!ready) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!trip) return <SafeAreaView style={styles.center}><Text style={styles.missing}>{t('noTrips')}</Text><Button label={t('newTrip')} onPress={() => router.replace('/')} style={styles.missingButton} /></SafeAreaView>;

  const start = new Date(trip.startedAt);
  const end = new Date(trip.endedAt ?? trip.startedAt);
  const duration = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const fare = getTripFareBreakdown(trip);
  const isMeteredRide = trip.meterEnabled !== false;
  const money = (value: number) => formatMoney(value, trip.tariff.currency, receiptLocale);
  const segments = trip.tariffSegments ?? [];
  const tariffNames = segments.map((segment) => segment.tariff.name);
  const distanceDetail = segments.length
    ? segments.filter((segment) => segment.chargedDistanceMeters > 0).map((segment) => `${segment.tariff.name}: ${(segment.chargedDistanceMeters / 1000).toFixed(2)} km × ${money(segment.tariff.pricePerKm)}`).join(' · ')
    : `${fare.tariffDistanceKm.toFixed(2)} km × ${money(trip.tariff.pricePerKm)}`;
  const waitingDetail = segments.length
    ? segments.filter((segment) => segment.waitingSeconds > 0).map((segment) => `${segment.tariff.name}: ${(segment.waitingSeconds / 60).toFixed(1)} min × ${money(segment.tariff.waitingPerMinute)}`).join(' · ')
    : `${fare.waitingMinutes.toFixed(1)} min × ${money(trip.tariff.waitingPerMinute)}`;
  const receiptNumber = trip.id.slice(-8).toUpperCase();
  const share = async () => {
    setExporting(true);
    try {
      await createReceipt(trip, receiptLocale, {
        receipt: receiptT('receipt'), rideReceipt: receiptT('rideReceipt'), receiptNumber: receiptT('receiptNumber'),
        started: receiptT('started'), finished: receiptT('finished'), tariff: receiptT('tariff'), distance: receiptT('distance'),
        time: receiptT('time'), waiting: receiptT('waiting'), total: receiptT('total'), baseCharge: receiptT('baseCharge'),
        distanceCharge: receiptT('distanceCharge'), waitingCharge: receiptT('waitingCharge'),
        minimumAdjustment: receiptT('minimumAdjustment'), includedAllowance: receiptT('includedAllowance'),
        meteredFare: receiptT('meteredFare'), agreedFare: receiptT('agreedFare'), discount: receiptT('discount'),
        pickupAddress: receiptT('pickupAddress'), dropoffAddress: receiptT('dropoffAddress'), fixedPriceRide: receiptT('fixedPriceRide'),
        thankYou: receiptT('thankYou'), notFiscal: receiptT('notFiscal'),
      });
    } catch { Alert.alert(t('receipt'), t('receiptError')); }
    finally { setExporting(false); }
  };
  const confirmDelete = () => {
    confirmAction({
      title: t('deleteTripTitle'), message: t('deleteTripBody'), cancelLabel: t('cancel'), confirmLabel: t('delete'), destructive: true,
      onConfirm: async () => {
        await deleteTrip(trip.id);
        router.replace('/history');
      },
    });
  };

  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable accessibilityLabel={t('back')} accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.closeButton}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
      <Text style={styles.headerTitle}>{t('tripSummary')}</Text>
      <View style={styles.headerSpacer} />
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.paper}>
        <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandLetter}>T</Text></View><Text style={styles.brand}>TAXOMETER</Text></View>
        <Text style={styles.receiptKind}>{receiptT('rideReceipt')}</Text>
        <Text style={styles.receiptNumber}>{receiptT('receiptNumber')} #{receiptNumber}</Text>
        <DashedRule />
        <View style={styles.meta}>
          <ReceiptRow label={receiptT('started')} value={start.toLocaleString(receiptLocale, { dateStyle: 'short', timeStyle: 'short' })} />
          <ReceiptRow label={receiptT('finished')} value={end.toLocaleString(receiptLocale, { dateStyle: 'short', timeStyle: 'short' })} />
          <ReceiptRow label={isMeteredRide ? receiptT('tariff') : receiptT('fixedPriceRide')} value={isMeteredRide ? (tariffNames.length ? tariffNames : [trip.tariff.name]).join(' → ') : receiptT('agreedFare')} />
          {trip.pickupAddress && <ReceiptRow label={receiptT('pickupAddress')} value={trip.pickupAddress} />}
          {trip.dropoffAddress && <ReceiptRow label={receiptT('dropoffAddress')} value={trip.dropoffAddress} />}
        </View>
        <DashedRule />
        {isMeteredRide ? <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{(trip.distanceMeters / 1000).toFixed(2)} km</Text><Text style={styles.statLabel}>{receiptT('distance')}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{formatDuration(duration)}</Text><Text style={styles.statLabel}>{receiptT('time')}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{formatDuration(trip.waitingSeconds)}</Text><Text style={styles.statLabel}>{receiptT('waiting')}</Text></View>
        </View> : <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{formatDuration(duration)}</Text><Text style={styles.statLabel}>{receiptT('time')}</Text></View></View>}
        <DashedRule />
        {isMeteredRide && <>
          <ReceiptRow label={receiptT('baseCharge')} value={money(fare.baseCharge)} />
          <ReceiptRow label={receiptT('distanceCharge')} value={money(fare.distanceCharge)} detail={distanceDetail || undefined} />
          <ReceiptRow label={receiptT('waitingCharge')} value={money(fare.waitingCharge)} detail={waitingDetail || undefined} />
          {fare.includedAllowance > 0 && <ReceiptRow label={receiptT('includedAllowance')} value={`−${money(fare.includedAllowance)}`} />}
          {fare.minimumAdjustment > 0 && <ReceiptRow label={receiptT('minimumAdjustment')} value={money(fare.minimumAdjustment)} />}
        </>}
        {isMeteredRide && (trip.agreedFare !== undefined || (trip.discountAmount ?? 0) > 0) && <ReceiptRow label={receiptT('meteredFare')} value={money(trip.meteredTotal ?? trip.total)} />}
        {trip.agreedFare !== undefined && <ReceiptRow label={receiptT('agreedFare')} value={money(trip.agreedFare)} />}
        {(trip.discountAmount ?? 0) > 0 && <ReceiptRow label={`${receiptT('discount')}${trip.discountPercent !== undefined ? ` (${trip.discountPercent}%)` : ''}`} value={`−${money(trip.discountAmount ?? 0)}`} />}
        <DashedRule />
        <View style={styles.totalRow}><Text style={styles.totalLabel}>{receiptT('total').toUpperCase()}</Text><Text style={styles.total}>{money(trip.total)}</Text></View>
        <Barcode value={trip.id} />
        <Text style={styles.barcodeNumber}>{receiptNumber}</Text>
        <Text style={styles.thanks}>{receiptT('thankYou')}</Text>
        <Text style={styles.notFiscal}>{receiptT('notFiscal')}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ busy: exporting, disabled: exporting }} disabled={exporting} onPress={share} style={({ pressed }) => [styles.shareButton, pressed && styles.buttonPressed, exporting && styles.buttonDisabled]}>
        {exporting ? <ActivityIndicator color={colors.dark} /> : <><Ionicons name="share-outline" size={21} color={colors.dark} /><Text style={styles.shareLabel}>{t('shareReceipt')}</Text></>}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.newTripButton}><Text style={styles.newTripLabel}>{t('newTrip')}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.deleteTripButton}><Ionicons name="trash-outline" size={18} color="#FF7777" /><Text style={styles.deleteTripLabel}>{t('deleteTrip')}</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#252522' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18, backgroundColor: '#252522' },
  missing: { color: '#fff', fontSize: 18, fontWeight: '700' }, missingButton: { width: 220 },
  header: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3A3A36', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' }, headerSpacer: { width: 40 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 18, paddingBottom: 28, gap: 13 },
  paper: { backgroundColor: '#FFFEFA', paddingHorizontal: 25, paddingVertical: 30, borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  brandMark: { width: 35, height: 35, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: colors.dark, fontSize: 21, fontWeight: '900' }, brand: { fontSize: 23, fontWeight: '900', letterSpacing: -1 },
  receiptKind: { fontFamily: mono, textAlign: 'center', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 14 },
  receiptNumber: { fontFamily: mono, textAlign: 'center', color: '#77766F', fontSize: 10, marginTop: 5 },
  rule: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#77766F', marginVertical: 19 },
  meta: { gap: 1 }, chargeBlock: { paddingVertical: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 18 }, rowLabel: { fontFamily: mono, color: '#55544F', fontSize: 11, flex: 1 },
  rowValue: { fontFamily: mono, color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  detail: { fontFamily: mono, color: '#8B8981', fontSize: 9, marginTop: 3 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' }, stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: mono, color: colors.text, fontSize: 12, fontWeight: '800' }, statLabel: { fontFamily: mono, color: '#77766F', fontSize: 9, marginTop: 4 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 }, totalLabel: { fontSize: 15, fontWeight: '900' },
  total: { fontSize: 29, fontWeight: '900', letterSpacing: -1.2, textAlign: 'right' },
  barcode: { height: 38, flexDirection: 'row', alignSelf: 'center', alignItems: 'stretch', gap: 2, marginTop: 25 }, bar: { backgroundColor: colors.dark },
  barcodeNumber: { fontFamily: mono, textAlign: 'center', fontSize: 8, letterSpacing: 3, marginTop: 5 }, thanks: { fontFamily: mono, textAlign: 'center', fontSize: 11, fontWeight: '800', marginTop: 20 },
  notFiscal: { fontFamily: mono, textAlign: 'center', color: '#8B8981', fontSize: 8, marginTop: 5 },
  shareButton: { height: 56, borderRadius: 17, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  shareLabel: { color: colors.dark, fontSize: 16, fontWeight: '900' }, buttonPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] }, buttonDisabled: { opacity: 0.6 },
  newTripButton: { height: 50, alignItems: 'center', justifyContent: 'center' }, newTripLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteTripButton: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  deleteTripLabel: { color: '#FF7777', fontSize: 14, fontWeight: '700' },
});
