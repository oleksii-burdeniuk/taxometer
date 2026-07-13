import assert from 'node:assert/strict';
import test from 'node:test';
import { krakowTariffs, mergeKrakowDefaults } from '@/constants/krakow-tariffs';
import { getKrakowTariffPeriod, isPolishPublicHoliday, resolveStartingTariff } from '@/lib/tariff-period';
import type { Tariff } from '@/types';

const custom: Tariff = {
  id: 'custom', name: 'Custom', currency: 'PLN', baseFare: 10, includedKm: 0,
  pricePerKm: 5, waitingPerMinute: 1, minimumFare: 10, isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z', kind: 'single',
};

test('preserves a custom default tariff during Krakow preset migration', () => {
  const merged = mergeKrakowDefaults([custom], custom.id);
  assert.equal(merged.find((tariff) => tariff.id === custom.id)?.isDefault, true);
  assert.equal(merged.find((tariff) => tariff.id === 'krakow-t1')?.isDefault, false);
});

test('restores the official preset values instead of persisted edits', () => {
  const edited = { ...mergeKrakowDefaults([])[0], pricePerKm: 999 };
  assert.equal(mergeKrakowDefaults([edited])[0].pricePerKm, 4);
});

test('selects night tariff at night, on Sundays and Polish public holidays', () => {
  assert.equal(getKrakowTariffPeriod(new Date(2026, 6, 13, 12)), 'day');
  assert.equal(getKrakowTariffPeriod(new Date(2026, 6, 13, 23)), 'night');
  assert.equal(getKrakowTariffPeriod(new Date(2026, 6, 12, 12)), 'night');
  assert.equal(isPolishPublicHoliday(new Date(2026, 11, 25, 12)), true);
  assert.equal(isPolishPublicHoliday(new Date(2026, 3, 6, 12)), true);
});

test('starts a zoned ride with the matching day or night variant', () => {
  const selected = krakowTariffs.find((tariff) => tariff.id === 'krakow-t1')!;
  assert.equal(resolveStartingTariff(krakowTariffs, selected, new Date(2026, 6, 13, 12)).id, 'krakow-t1');
  assert.equal(resolveStartingTariff(krakowTariffs, selected, new Date(2026, 6, 13, 23)).id, 'krakow-t2');
});
