import assert from 'node:assert/strict';
import test from 'node:test';
import { createExternalTripSnapshot } from '@/lib/external-trip';
import type { Tariff, Trip } from '@/types';

const tariff: Tariff = {
  id: 'krakow-t1', name: 'Kraków', variantLabel: 'Taryfa 1 · Strefa I · Dzień',
  currency: 'PLN', baseFare: 9, includedKm: 0.2, pricePerKm: 4,
  waitingPerMinute: 55 / 60, minimumFare: 9, isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function trip(status: Trip['status'] = 'active'): Trip {
  return {
    id: 'ride id', tariff, status, startedAt: '2026-07-17T10:00:00.000Z',
    distanceMeters: 1_234, waitingSeconds: 30, total: 17.5, points: [],
    pausedAt: status === 'paused' ? Date.parse('2026-07-17T10:02:00.000Z') : undefined,
  };
}

test('external display uses the calculated trip total without recalculating the fare', () => {
  const snapshot = createExternalTripSnapshot(trip(), Date.parse('2026-07-17T10:03:00.000Z'), 'en');
  assert.equal(snapshot.amountText, 'PLN 17.50');
  assert.equal(snapshot.distanceText, '1.23 km');
  assert.equal(snapshot.durationText, '00:03:00');
  assert.equal(snapshot.tariffName, tariff.variantLabel);
  assert.match(snapshot.controlUrl, /action=pause/);
  assert.match(snapshot.controlUrl, /tripId=ride%20id/);
});

test('paused snapshot freezes time and changes the external control to resume', () => {
  const snapshot = createExternalTripSnapshot(trip('paused'), Date.parse('2026-07-17T10:10:00.000Z'), 'pl');
  assert.equal(snapshot.durationText, '00:02:00');
  assert.equal(snapshot.status, 'paused');
  assert.equal(snapshot.labels.resume, 'Wznów');
  assert.match(snapshot.controlUrl, /action=resume/);
});
