import type { Tariff, Trip, TripPoint } from '@/types';

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceBetween(a: TripPoint, b: TripPoint) {
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function calculateFare(
  tariff: Tariff,
  chargedDistanceMeters: number,
  waitingSeconds: number,
) {
  const tariffDistanceKm = Math.max(0, chargedDistanceMeters / 1000);
  const distanceCharge = tariffDistanceKm * tariff.pricePerKm;
  const waitingCharge = (waitingSeconds / 60) * tariff.waitingPerMinute;
  const includedAllowance = Math.min(
    distanceCharge + waitingCharge,
    Math.max(0, tariff.includedKm * tariff.pricePerKm),
  );
  const calculated = tariff.baseFare + distanceCharge + waitingCharge - includedAllowance;
  return Math.round(Math.max(tariff.minimumFare, calculated) * 100) / 100;
}

export function getCrossoverSpeedKmh(tariff: Pick<Tariff, 'pricePerKm' | 'waitingPerMinute'>) {
  if (tariff.pricePerKm <= 0) return tariff.waitingPerMinute > 0 ? Number.POSITIVE_INFINITY : 0;
  return (tariff.waitingPerMinute * 60) / tariff.pricePerKm;
}

export function getFareBreakdown(
  tariff: Tariff,
  chargedDistanceMeters: number,
  waitingSeconds: number,
) {
  const tariffDistanceKm = Math.max(0, chargedDistanceMeters / 1000);
  const distanceCharge = tariffDistanceKm * tariff.pricePerKm;
  const waitingMinutes = waitingSeconds / 60;
  const waitingCharge = waitingMinutes * tariff.waitingPerMinute;
  const includedAllowance = Math.min(
    distanceCharge + waitingCharge,
    Math.max(0, tariff.includedKm * tariff.pricePerKm),
  );
  const subtotal = tariff.baseFare + distanceCharge + waitingCharge - includedAllowance;
  return {
    baseCharge: tariff.baseFare,
    tariffDistanceKm,
    distanceCharge,
    waitingMinutes,
    waitingCharge,
    includedAllowance,
    minimumAdjustment: Math.max(0, tariff.minimumFare - subtotal),
  };
}

export function getTripFareBreakdown(trip: Trip) {
  if (!trip.tariffSegments?.length) {
    return getFareBreakdown(trip.tariff, trip.chargedDistanceMeters ?? trip.distanceMeters, trip.waitingSeconds);
  }
  const initialTariff = trip.initialTariff ?? trip.tariffSegments[0].tariff;
  const distanceCharge = trip.tariffSegments.reduce(
    (sum, segment) => sum + (segment.chargedDistanceMeters / 1000) * segment.tariff.pricePerKm,
    0,
  );
  const waitingCharge = trip.tariffSegments.reduce(
    (sum, segment) => sum + (segment.waitingSeconds / 60) * segment.tariff.waitingPerMinute,
    0,
  );
  const includedAllowance = Math.min(
    distanceCharge + waitingCharge,
    Math.max(0, initialTariff.includedKm * initialTariff.pricePerKm),
  );
  const subtotal = initialTariff.baseFare + distanceCharge + waitingCharge - includedAllowance;
  return {
    baseCharge: initialTariff.baseFare,
    tariffDistanceKm: trip.tariffSegments.reduce((sum, segment) => sum + segment.chargedDistanceMeters, 0) / 1000,
    distanceCharge,
    waitingMinutes: trip.tariffSegments.reduce((sum, segment) => sum + segment.waitingSeconds, 0) / 60,
    waitingCharge,
    includedAllowance,
    minimumAdjustment: Math.max(0, initialTariff.minimumFare - subtotal),
  };
}

export function calculateTripFare(trip: Trip) {
  const fare = getTripFareBreakdown(trip);
  return Math.round((fare.baseCharge + fare.distanceCharge + fare.waitingCharge - fare.includedAllowance + fare.minimumAdjustment) * 100) / 100;
}

export const formatMoney = (value: number, currency: Tariff['currency'], locale: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':');
};

export const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
