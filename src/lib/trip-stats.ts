import { Trip } from '@/types';

export type StatsPeriod = 'day' | 'week' | 'month';

export type TripStats = {
  fare: number;
  trips: number;
  distanceMeters: number;
  paidSeconds: number;
  durationSeconds: number;
};

export type TripStatsBucket = TripStats & {
  start: Date;
  end: Date;
};

const emptyStats = (): TripStats => ({ fare: 0, trips: 0, distanceMeters: 0, paidSeconds: 0, durationSeconds: 0 });

export function startOfStatsPeriod(date: Date, period: StatsPeriod) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === 'week') {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  } else if (period === 'month') {
    start.setDate(1);
  }
  return start;
}

export function shiftStatsPeriod(date: Date, period: StatsPeriod, amount: number) {
  const shifted = new Date(date);
  if (period === 'day') shifted.setDate(shifted.getDate() + amount);
  else if (period === 'week') shifted.setDate(shifted.getDate() + amount * 7);
  else shifted.setMonth(shifted.getMonth() + amount);
  return shifted;
}

export function tripsInStatsRange(trips: Trip[], currency: Trip['tariff']['currency'], start: Date, end: Date) {
  return trips.filter((trip) => {
    if (trip.status !== 'completed' || trip.tariff.currency !== currency) return false;
    const timestamp = new Date(trip.startedAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
  });
}

export function summarizeTrips(trips: Trip[], currency: Trip['tariff']['currency'], start: Date, end: Date) {
  return tripsInStatsRange(trips, currency, start, end).reduce<TripStats>((summary, trip) => {
    const startedAt = new Date(trip.startedAt).getTime();
    const endedAt = trip.endedAt ? new Date(trip.endedAt).getTime() : startedAt;
    summary.fare += trip.total;
    summary.trips += 1;
    summary.distanceMeters += trip.distanceMeters;
    summary.paidSeconds += trip.waitingSeconds;
    summary.durationSeconds += Number.isFinite(endedAt) && endedAt > startedAt ? (endedAt - startedAt) / 1000 : 0;
    return summary;
  }, emptyStats());
}

export function buildTripStats(trips: Trip[], period: StatsPeriod, currency: Trip['tariff']['currency'], now = new Date()) {
  const bucketCount = period === 'day' ? 7 : period === 'week' ? 8 : 6;
  const currentStart = startOfStatsPeriod(now, period);
  const buckets: TripStatsBucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const start = shiftStatsPeriod(currentStart, period, index - bucketCount + 1);
    return { ...emptyStats(), start, end: shiftStatsPeriod(start, period, 1) };
  });

  buckets.forEach((bucket) => Object.assign(bucket, summarizeTrips(trips, currency, bucket.start, bucket.end)));

  return { current: buckets.at(-1) ?? { ...emptyStats(), start: currentStart, end: shiftStatsPeriod(currentStart, period, 1) }, buckets };
}
