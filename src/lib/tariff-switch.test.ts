import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTripFare } from '@/lib/meter';
import { appendTariffSegment } from '@/lib/tariff-switch';
import type { Tariff, Trip } from '@/types';

const rate = (id: string, pricePerKm: number): Tariff => ({
  id, name: id, currency: 'PLN', baseFare: 9, includedKm: 0.2, pricePerKm,
  waitingPerMinute: 55 / 60, minimumFare: 9, isDefault: id === 't1',
  createdAt: '2026-01-01T00:00:00.000Z', kind: 'zoned', groupId: 'set',
});

test('appends switch segments without changing already recorded charges', () => {
  const t1 = rate('t1', 4);
  const t3 = rate('t3', 8);
  const trip: Trip = {
    id: 'trip', tariff: t1, initialTariff: t1, status: 'active', startedAt: t1.createdAt,
    distanceMeters: 1_000, chargedDistanceMeters: 1_000, waitingSeconds: 0, total: 12.2, points: [],
    tariffSegments: [{ id: 'first', tariff: t1, startedAt: t1.createdAt, chargedDistanceMeters: 1_000, waitingSeconds: 0 }],
  };
  const switched = appendTariffSegment(trip, t3, '2026-01-01T00:05:00.000Z');
  assert.equal(switched.tariffSegments?.length, 2);
  assert.equal(switched.tariffSegments?.[0].chargedDistanceMeters, 1_000);
  assert.equal(switched.tariffSegments?.[0].endedAt, '2026-01-01T00:05:00.000Z');
  assert.equal(switched.tariffSegments?.[1].tariff.id, 't3');
  assert.equal(calculateTripFare(switched), 12.2);
});

test('marks the exact switch time as a tracking boundary', () => {
  const t1 = rate('t1', 4);
  const t3 = rate('t3', 8);
  const trip: Trip = {
    id: 'trip', tariff: t1, status: 'active', startedAt: '1970-01-01T00:00:01.000Z',
    distanceMeters: 0, chargedDistanceMeters: 0, waitingSeconds: 0, total: 9,
    points: [{ latitude: 0, longitude: 0, speed: 0, timestamp: 1_000 }],
  };

  const switched = appendTariffSegment(trip, t3, '1970-01-01T00:00:05.000Z');

  assert.equal(switched.trackingResumedAt, 5_000);
});
