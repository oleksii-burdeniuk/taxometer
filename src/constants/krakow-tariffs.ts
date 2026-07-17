import type { Tariff } from '@/types';

const createdAt = '2022-07-29T00:00:00.000Z';
const common = {
  city: 'Kraków' as const,
  currency: 'PLN' as const,
  baseFare: 9,
  includedKm: 0.2,
  waitingPerMinute: 55 / 60,
  minimumFare: 9,
  createdAt,
  kind: 'zoned' as const,
  groupId: 'krakow-official',
  groupName: 'Kraków · taryfy maksymalne',
  isOfficial: true,
};

export const krakowTariffs: Tariff[] = [
  { ...common, id: 'krakow-t1', name: 'Taryfa 1 · Strefa I · Dzień', variantLabel: 'Taryfa 1 · Strefa I · Dzień', tariffNumber: 1, zone: 'I', period: 'day', schedule: { kind: 'weekday', startMinutes: 360, endMinutes: 1320 }, pricePerKm: 4, isDefault: true, showOnHome: true },
  { ...common, id: 'krakow-t2', name: 'Taryfa 2 · Strefa I · Noc/święta', variantLabel: 'Taryfa 2 · Strefa I · Noc/święta', tariffNumber: 2, zone: 'I', period: 'night', schedule: { kind: 'nightHoliday', startMinutes: 1320, endMinutes: 360 }, pricePerKm: 6, isDefault: false, showOnHome: true },
  { ...common, id: 'krakow-t3', name: 'Taryfa 3 · Strefa II · Dzień', variantLabel: 'Taryfa 3 · Strefa II · Dzień', tariffNumber: 3, zone: 'II', period: 'day', schedule: { kind: 'weekday', startMinutes: 360, endMinutes: 1320 }, pricePerKm: 8, isDefault: false, showOnHome: true },
  { ...common, id: 'krakow-t4', name: 'Taryfa 4 · Strefa II · Noc/święta', variantLabel: 'Taryfa 4 · Strefa II · Noc/święta', tariffNumber: 4, zone: 'II', period: 'night', schedule: { kind: 'nightHoliday', startMinutes: 1320, endMinutes: 360 }, pricePerKm: 12, isDefault: false, showOnHome: true },
];

export function mergeKrakowDefaults(stored: Tariff[], savedDefaultId?: string | null) {
  const officialIds = new Set(krakowTariffs.map((tariff) => tariff.id));
  const custom = stored.filter((tariff) => !officialIds.has(tariff.id) && tariff.id !== 'standard' && tariff.id !== 'comfort');
  const availableIds = new Set([...krakowTariffs, ...custom].map((tariff) => tariff.id));
  const storedDefaultId = savedDefaultId ?? stored.find((tariff) => tariff.isDefault)?.id;
  const defaultId = storedDefaultId && availableIds.has(storedDefaultId) ? storedDefaultId : 'krakow-t1';
  const storedById = new Map(stored.map((tariff) => [tariff.id, tariff]));
  const storedOfficial = stored.filter((tariff) => officialIds.has(tariff.id));
  const storedPresetVisibility = storedOfficial.length === krakowTariffs.length
    ? storedOfficial.some((tariff) => tariff.showOnHome !== false)
    : undefined;
  const official = krakowTariffs.map((tariff) => ({
    ...tariff,
    isDefault: tariff.id === defaultId,
    showOnHome: storedPresetVisibility ?? storedById.get(tariff.id)?.showOnHome ?? tariff.showOnHome,
  }));
  return [...official, ...custom.map((tariff) => ({ ...tariff, isDefault: tariff.id === defaultId, showOnHome: tariff.showOnHome ?? true }))];
}
