import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFare, calculateTripFare, formatMoney, getCrossoverSpeedKmh } from '@/lib/meter';
import type { Tariff, Trip } from '@/types';

const tariff: Tariff = {
  id: 'test', name: 'Test', currency: 'UAH', baseFare: 60, includedKm: 1,
  pricePerKm: 18, waitingPerMinute: 3, minimumFare: 80, isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

test('calculates the OIML/MI-007 cross-over speed from time and distance tariffs', () => {
  assert.equal(getCrossoverSpeedKmh(tariff), 10);
});

test('handles tariffs with only time or only distance charging', () => {
  assert.equal(getCrossoverSpeedKmh({ pricePerKm: 0, waitingPerMinute: 3 }), Infinity);
  assert.equal(getCrossoverSpeedKmh({ pricePerKm: 18, waitingPerMinute: 0 }), 0);
});

test('formats a custom ISO currency code', () => {
  assert.match(formatMoney(12.5, 'GBP', 'en-GB'), /£12\.50/);
});

test('applies base fare, included tariff distance, time tariff and minimum fare', () => {
  assert.equal(calculateFare(tariff, 0, 0), 80);
  assert.equal(calculateFare(tariff, 2_000, 120), 84);
});

test('uses the initial allowance across time and distance instead of applying it twice', () => {
  const withoutMinimum = { ...tariff, minimumFare: 0 };
  assert.equal(calculateFare(withoutMinimum, 0, 6 * 60), 60);
  assert.equal(calculateFare(withoutMinimum, 500, 3 * 60), 60);
  assert.equal(calculateFare(withoutMinimum, 1_000, 6 * 60), 78);
});

test('keeps already travelled segments at their original rate after a zone switch', () => {
  const zoneOne = { ...tariff, currency: 'PLN' as const, baseFare: 9, includedKm: 0.2, minimumFare: 9, pricePerKm: 4 };
  const zoneTwo = { ...zoneOne, id: 'zone-two', pricePerKm: 8 };
  const trip: Trip = {
    id: 'trip', tariff: zoneTwo, initialTariff: zoneOne, status: 'active', startedAt: zoneOne.createdAt,
    distanceMeters: 2_000, chargedDistanceMeters: 2_000, waitingSeconds: 0, total: 0, points: [],
    tariffSegments: [
      { id: 'one', tariff: zoneOne, startedAt: zoneOne.createdAt, chargedDistanceMeters: 1_000, waitingSeconds: 0 },
      { id: 'two', tariff: zoneTwo, startedAt: zoneOne.createdAt, chargedDistanceMeters: 1_000, waitingSeconds: 0 },
    ],
  };
  // 9 zł start + 4 zł + 8 zł - 0.8 zł included initial segment.
  assert.equal(calculateTripFare(trip), 20.2);
});

test('preserves the full price when returning to an earlier tariff', () => {
  const zoneOne = { ...tariff, currency: 'PLN' as const, baseFare: 9, includedKm: 0.2, minimumFare: 9, pricePerKm: 4 };
  const zoneTwo = { ...zoneOne, id: 'zone-two', pricePerKm: 8 };
  const trip: Trip = {
    id: 'trip', tariff: zoneOne, initialTariff: zoneOne, status: 'active', startedAt: zoneOne.createdAt,
    distanceMeters: 3_000, chargedDistanceMeters: 3_000, waitingSeconds: 0, total: 0, points: [],
    tariffSegments: [
      { id: 'one', tariff: zoneOne, startedAt: zoneOne.createdAt, chargedDistanceMeters: 1_000, waitingSeconds: 0 },
      { id: 'two', tariff: zoneTwo, startedAt: zoneOne.createdAt, chargedDistanceMeters: 1_000, waitingSeconds: 0 },
      { id: 'three', tariff: zoneOne, startedAt: zoneOne.createdAt, chargedDistanceMeters: 1_000, waitingSeconds: 0 },
    ],
  };
  assert.equal(calculateTripFare(trip), 24.2);
});
