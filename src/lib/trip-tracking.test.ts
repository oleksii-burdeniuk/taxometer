import assert from 'node:assert/strict';
import test from 'node:test';
import type * as Location from 'expo-location';
import { applyLocationToTrip } from '@/lib/trip-tracking';
import type { Tariff, Trip } from '@/types';

const tariff: Tariff = {
  id: 'test', name: 'Test', currency: 'UAH', baseFare: 0, includedKm: 0,
  pricePerKm: 18, waitingPerMinute: 3, minimumFare: 0, isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const trip = (): Trip => ({
  id: 'trip', tariff, status: 'active', startedAt: '2026-01-01T00:00:00.000Z',
  distanceMeters: 0, chargedDistanceMeters: 0, waitingSeconds: 0, total: 0, points: [],
});

const location = (timestamp: number, longitude: number, speed: number | null, accuracy = 5): Location.LocationObject => ({
  timestamp,
  coords: { latitude: 0, longitude, altitude: null, accuracy, altitudeAccuracy: null, heading: null, speed },
});

const closeTo = (actual: number, expected: number, tolerance = 0.02) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test('charges only time while stopped or below the 10 km/h cross-over speed', () => {
  let current = applyLocationToTrip(trip(), location(1_000, 0, 0));
  current = applyLocationToTrip(current, location(11_000, 0, 0));
  assert.equal(current.waitingSeconds, 10);
  assert.equal(current.chargedDistanceMeters, 0);
  closeTo(current.total, 0.5);
});

test('charges only distance above the cross-over speed', () => {
  let current = applyLocationToTrip(trip(), location(1_000, 0, 10));
  current = applyLocationToTrip(current, location(11_000, 0.00089932, 10));
  assert.equal(current.waitingSeconds, 0);
  closeTo(current.chargedDistanceMeters ?? 0, 100, 0.2);
  closeTo(current.total, 1.8);
});

test('never charges time and distance for the same interval in mode S', () => {
  let current = applyLocationToTrip(trip(), location(1_000, 0, 0));
  current = applyLocationToTrip(current, location(11_000, 0, 0));
  current = applyLocationToTrip(current, location(21_000, 0.00089932, 20));
  assert.equal(current.waitingSeconds, 10);
  closeTo(current.chargedDistanceMeters ?? 0, 100, 0.2);
  closeTo(current.total, 2.3);
});

test('does not charge across a manual pause boundary', () => {
  let current = applyLocationToTrip(trip(), location(1_000, 0, 0));
  current = { ...current, trackingResumedAt: 20_000 };
  current = applyLocationToTrip(current, location(21_000, 0.001, 10));
  assert.equal(current.waitingSeconds, 0);
  assert.equal(current.chargedDistanceMeters, 0);
});

test('rejects distance from a low-quality GPS point', () => {
  let current = applyLocationToTrip(trip(), location(1_000, 0, 10));
  current = applyLocationToTrip(current, location(11_000, 0.00089932, 10, 100));
  assert.equal(current.distanceMeters, 0);
  assert.equal(current.chargedDistanceMeters, 0);
  assert.equal(current.waitingSeconds, 0);
});

test('does not charge time from a low-quality GPS point', () => {
  let current = applyLocationToTrip(trip(), location(1_000, 0, 0));
  current = applyLocationToTrip(current, location(11_000, 0, 0, 100));
  assert.equal(current.waitingSeconds, 0);
  assert.equal(current.trackingWarning, 'gps');
});

test('does not charge an unverified gap longer than 30 seconds', () => {
  let current = applyLocationToTrip(trip(), location(1_000, 0, 0));
  current = applyLocationToTrip(current, location(61_000, 0, 0));
  assert.equal(current.waitingSeconds, 0);
  assert.equal(current.trackingWarning, 'gps');
});
