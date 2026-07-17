import type * as Location from 'expo-location';
import { calculateFare, calculateTripFare, distanceBetween, getCrossoverSpeedKmh } from '@/lib/meter';
import { Trip, TripPoint } from '@/types';

const MAX_GPS_ACCURACY_METERS = 50;
const MAX_SEGMENT_METERS = 500;
const MAX_PLAUSIBLE_SPEED_MPS = 60;
const STATIONARY_SPEED_MPS = 0.5;
const STATIONARY_JITTER_METERS = 3;
const MAX_CHARGEABLE_GAP_SECONDS = 30;

export function locationToPoint(location: Location.LocationObject): TripPoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    speed: location.coords.speed,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  };
}

const validSpeed = (speed: number | null | undefined): speed is number =>
  typeof speed === 'number' && Number.isFinite(speed) && speed >= 0;

export function applyLocationToTrip(trip: Trip, location: Location.LocationObject): Trip {
  if (trip.status !== 'active' || trip.meterEnabled === false) return trip;
  const point = locationToPoint(location);
  const previous = trip.points.at(-1);
  if (previous && point.timestamp <= previous.timestamp) return trip;
  const crossedPauseBoundary = !!previous && !!trip.trackingResumedAt && previous.timestamp < trip.trackingResumedAt;
  const elapsedSeconds = previous && !crossedPauseBoundary
    ? Math.max(0, (point.timestamp - previous.timestamp) / 1000)
    : 0;
  const rawSegment = previous && elapsedSeconds > 0 ? distanceBetween(previous, point) : 0;
  const calculatedSpeed = elapsedSeconds > 0 ? rawSegment / elapsedSeconds : 0;
  const reportedSpeeds = [previous?.speed, point.speed].filter(validSpeed);
  const effectiveSpeedMps = reportedSpeeds.length
    ? reportedSpeeds.reduce((sum, speed) => sum + speed, 0) / reportedSpeeds.length
    : calculatedSpeed;
  const hasAcceptableAccuracy = point.accuracy === null || point.accuracy === undefined || point.accuracy <= MAX_GPS_ACCURACY_METERS;
  const previousHasAcceptableAccuracy = !previous || previous.accuracy === null || previous.accuracy === undefined || previous.accuracy <= MAX_GPS_ACCURACY_METERS;
  const hasValidTiming = elapsedSeconds > 0 && elapsedSeconds <= MAX_CHARGEABLE_GAP_SECONDS;
  const validMeasurement = hasValidTiming && hasAcceptableAccuracy && previousHasAcceptableAccuracy;
  const validSegment = validMeasurement && rawSegment < MAX_SEGMENT_METERS && calculatedSpeed < MAX_PLAUSIBLE_SPEED_MPS;
  const isStationaryJitter = effectiveSpeedMps < STATIONARY_SPEED_MPS && rawSegment < STATIONARY_JITTER_METERS;
  const acceptedSegment = validSegment && !isStationaryJitter ? rawSegment : 0;
  const crossoverSpeedMps = getCrossoverSpeedKmh(trip.tariff) / 3.6;
  const usesTimeTariff = !!previous && !crossedPauseBoundary && validMeasurement && effectiveSpeedMps < crossoverSpeedMps;
  const chargedDistance = trip.chargedDistanceMeters ?? trip.distanceMeters;
  const nextChargedDistance = chargedDistance + (usesTimeTariff ? 0 : acceptedSegment);
  const next: Trip = {
    ...trip,
    points: [...trip.points, point],
    distanceMeters: trip.distanceMeters + acceptedSegment,
    // EU MI-007 / OIML R 21 mode S: time below cross-over speed, distance above it.
    chargedDistanceMeters: nextChargedDistance,
    waitingSeconds: trip.waitingSeconds + (usesTimeTariff ? elapsedSeconds : 0),
    trackingWarning: previous && !crossedPauseBoundary && !validMeasurement ? 'gps' : undefined,
  };
  if (next.tariffSegments?.length) {
    const lastIndex = next.tariffSegments.length - 1;
    next.tariffSegments = next.tariffSegments.map((segment, index) => index === lastIndex ? {
      ...segment,
      chargedDistanceMeters: segment.chargedDistanceMeters + (usesTimeTariff ? 0 : acceptedSegment),
      waitingSeconds: segment.waitingSeconds + (usesTimeTariff ? elapsedSeconds : 0),
    } : segment);
    next.total = calculateTripFare(next);
  } else {
    next.total = calculateFare(next.tariff, nextChargedDistance, next.waitingSeconds);
  }
  return next;
}

/**
 * Projects the time tariff between native GPS updates without adding a synthetic
 * route point. The projection is capped at the verified-gap limit used for billing.
 */
export function projectTripTime(trip: Trip, timestamp: number): Trip {
  if (trip.status !== 'active' || trip.meterEnabled === false) return trip;
  const point = trip.points.at(-1);
  if (!point || point.timestamp < (trip.trackingResumedAt ?? 0)) return trip;
  const accuracyIsAcceptable = point.accuracy === null || point.accuracy === undefined || point.accuracy <= MAX_GPS_ACCURACY_METERS;
  if (!accuracyIsAcceptable || !validSpeed(point.speed)) return trip;
  const crossoverSpeedMps = getCrossoverSpeedKmh(trip.tariff) / 3.6;
  if (point.speed >= crossoverSpeedMps) return trip;
  const secondsSincePoint = Math.max(0, (timestamp - point.timestamp) / 1000);
  const projectedSeconds = Math.min(secondsSincePoint, MAX_CHARGEABLE_GAP_SECONDS);
  if (projectedSeconds <= 0) return trip;
  const next: Trip = {
    ...trip,
    waitingSeconds: trip.waitingSeconds + projectedSeconds,
  };
  if (next.tariffSegments?.length) {
    const lastIndex = next.tariffSegments.length - 1;
    next.tariffSegments = next.tariffSegments.map((segment, index) => index === lastIndex
      ? { ...segment, waitingSeconds: segment.waitingSeconds + projectedSeconds }
      : segment);
    next.total = calculateTripFare(next);
  } else {
    next.total = calculateFare(next.tariff, next.chargedDistanceMeters ?? next.distanceMeters, next.waitingSeconds);
  }
  return next;
}
