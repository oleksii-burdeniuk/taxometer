import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { DeviceEventEmitter, Platform } from 'react-native';
import { createExternalTripSnapshot } from '@/lib/external-trip';
import { storage } from '@/lib/storage';
import { applyLocationToTrip } from '@/lib/trip-tracking';
import { updateExternalTripDisplay } from '@/services/external-trip-display';
import { Trip } from '@/types';

export const BACKGROUND_LOCATION_TASK = 'taxometer-background-location';
export const BACKGROUND_LOCATION_EVENT = 'taxometer-location-updated';
let startPromise: Promise<boolean> | null = null;

type LocationTaskData = { locations: Location.LocationObject[] };

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations.length) return;
    let trip = await storage.getActiveTrip();
    if (!trip || trip.status !== 'active') return;
    for (const location of data.locations) trip = applyLocationToTrip(trip, location);
    await storage.setActiveTrip(trip);
    const language = (await storage.getLanguage()) ?? 'uk';
    await updateExternalTripDisplay(createExternalTripSnapshot(trip, Date.now(), language));
    DeviceEventEmitter.emit(BACKGROUND_LOCATION_EVENT, trip);
  });
}

export async function startBackgroundLocation(
  notificationTitle: string,
  notificationBody: string,
  hasExternalAndroidForegroundService = false,
) {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) return false;
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) return true;
    const options: Location.LocationTaskOptions = {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.AutomotiveNavigation,
      // A taximeter also needs location timestamps while the car is stopped.
      // A distance filter would otherwise delay the time tariff on iOS.
      distanceInterval: 0,
      timeInterval: 1000,
      deferredUpdatesDistance: 0,
      deferredUpdatesInterval: 0,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    };
    if (!(Platform.OS === 'android' && hasExternalAndroidForegroundService)) {
      options.foregroundService = {
        notificationTitle,
        notificationBody,
        killServiceOnDestroy: false,
      };
    }
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, options);
    return true;
  })();
  try { return await startPromise; }
  finally { startPromise = null; }
}

export async function stopBackgroundLocation() {
  const stop = async () => {
    if (startPromise) await startPromise.catch(() => false);
    if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) return;
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  };
  // A stuck native location call must never prevent pausing or finishing a ride.
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    void stop().catch(() => undefined).finally(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

export function subscribeToBackgroundLocation(listener: (trip: Trip) => void) {
  return DeviceEventEmitter.addListener(BACKGROUND_LOCATION_EVENT, listener);
}
