import { createId } from '@/lib/meter';
import type { Tariff, Trip } from '@/types';

export function appendTariffSegment(trip: Trip, nextTariff: Tariff, changedAt: string): Trip {
  const currentSegments = trip.tariffSegments?.length ? trip.tariffSegments : [{
    id: createId(), tariff: trip.tariff, startedAt: trip.startedAt,
    chargedDistanceMeters: trip.chargedDistanceMeters ?? trip.distanceMeters,
    waitingSeconds: trip.waitingSeconds,
  }];
  return {
    ...trip,
    tariff: { ...nextTariff },
    initialTariff: trip.initialTariff ?? trip.tariff,
    // Do not bill the whole GPS interval that straddles the tariff boundary
    // using either rate. The next accepted point starts a fresh interval.
    trackingResumedAt: new Date(changedAt).getTime(),
    tariffSegments: [
      ...currentSegments.slice(0, -1),
      { ...currentSegments.at(-1)!, endedAt: changedAt },
      { id: createId(), tariff: { ...nextTariff }, startedAt: changedAt, chargedDistanceMeters: 0, waitingSeconds: 0 },
    ],
  };
}
