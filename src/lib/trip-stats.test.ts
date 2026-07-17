import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTripStats, startOfStatsPeriod } from '@/lib/trip-stats';
import type { Trip } from '@/types';

const trip = (startedAt: string, total: number, currency: 'PLN' | 'EUR' = 'PLN'): Trip => ({
  id: startedAt, status: 'completed', startedAt, endedAt: new Date(new Date(startedAt).getTime() + 30 * 60_000).toISOString(),
  distanceMeters: 1_500, waitingSeconds: 120, total, points: [],
  tariff: { id: currency, name: currency, currency, baseFare: 0, includedKm: 0, pricePerKm: 1, waitingPerMinute: 1, minimumFare: 0, isDefault: false, createdAt: startedAt },
});

test('uses Monday as the beginning of weekly summaries', () => {
  assert.equal(startOfStatsPeriod(new Date(2026, 6, 16, 12), 'week').toISOString().slice(0, 10), '2026-07-12');
});

test('builds daily totals and keeps currencies separate', () => {
  const stats = buildTripStats([
    trip('2026-07-14T08:00:00.000Z', 20),
    trip('2026-07-14T12:00:00.000Z', 30),
    trip('2026-07-14T13:00:00.000Z', 99, 'EUR'),
  ], 'day', 'PLN', new Date('2026-07-14T20:00:00.000Z'));
  assert.equal(stats.current.fare, 50);
  assert.equal(stats.current.trips, 2);
  assert.equal(stats.current.distanceMeters, 3_000);
  assert.equal(stats.current.paidSeconds, 240);
  assert.equal(stats.current.durationSeconds, 3_600);
});

test('includes previous weeks in chronological order', () => {
  const stats = buildTripStats([trip('2026-07-07T10:00:00.000Z', 40)], 'week', 'PLN', new Date('2026-07-14T12:00:00.000Z'));
  assert.equal(stats.buckets.length, 8);
  assert.equal(stats.buckets.at(-2)?.fare, 40);
  assert.equal(stats.current.fare, 0);
});
