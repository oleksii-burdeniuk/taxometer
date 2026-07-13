import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { GestureResponderEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader, sharedStyles } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/app-context';
import { useI18n } from '@/i18n';
import { confirmAction } from '@/lib/confirm-action';
import { formatMoney } from '@/lib/meter';

export default function HistoryScreen() {
  const router = useRouter(); const { t, locale } = useI18n(); const { trips, deleteTrip } = useApp();
  const confirmDelete = (event: GestureResponderEvent, id: string) => {
    event.stopPropagation();
    confirmAction({ title: t('deleteTripTitle'), message: t('deleteTripBody'), cancelLabel: t('cancel'), confirmLabel: t('delete'), destructive: true, onConfirm: () => deleteTrip(id) });
  };
  return <SafeAreaView edges={['top']} style={sharedStyles.screen}>
    <ScreenHeader title={t('history')} />
    <ScrollView contentContainerStyle={[sharedStyles.content, !trips.length && styles.emptyContainer]}>
      {!trips.length ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="receipt-outline" size={36} color={colors.muted} /></View><Text style={styles.emptyTitle}>{t('noTrips')}</Text><Text style={sharedStyles.body}>{t('noTripsHint')}</Text></View> : trips.map((trip) => (
          <Card key={trip.id} style={styles.trip}>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })} style={styles.tripMain}>
            <View style={styles.dateIcon}><Text style={styles.day}>{new Date(trip.startedAt).toLocaleDateString(locale, { day: '2-digit' })}</Text><Text style={styles.month}>{new Date(trip.startedAt).toLocaleDateString(locale, { month: 'short' }).toUpperCase()}</Text></View>
            <View style={styles.tripInfo}><Text style={styles.tripName}>{trip.tariff.name}</Text><Text style={styles.tripMeta}>{new Date(trip.startedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · {(trip.distanceMeters / 1000).toFixed(2)} km</Text></View>
            <Text numberOfLines={1} style={styles.price}>{formatMoney(trip.total, trip.tariff.currency, locale)}</Text>
            </Pressable>
            <Pressable accessibilityLabel={t('deleteTrip')} accessibilityRole="button" hitSlop={8} onPress={(event) => confirmDelete(event, trip.id)} style={styles.deleteButton}><Ionicons name="trash-outline" size={19} color={colors.danger} /></Pressable>
          </Card>
      ))}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  emptyContainer: { flexGrow: 1, justifyContent: 'center' }, empty: { alignItems: 'center', gap: 9, marginBottom: 80 }, emptyIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }, emptyTitle: { fontSize: 22, fontWeight: '800' },
  trip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }, tripMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 4 }, dateIcon: { width: 48, height: 50, borderRadius: 14, backgroundColor: '#F1F2F3', alignItems: 'center', justifyContent: 'center' }, day: { fontSize: 17, fontWeight: '900' }, month: { color: colors.muted, fontSize: 9, fontWeight: '800' }, tripInfo: { flex: 1, gap: 4 }, tripName: { fontSize: 16, fontWeight: '800' }, tripMeta: { color: colors.muted, fontSize: 12 }, price: { maxWidth: 105, fontSize: 15, fontWeight: '900', textAlign: 'right' }, deleteButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
});
