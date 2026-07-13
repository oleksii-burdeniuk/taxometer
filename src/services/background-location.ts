import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { DeviceEventEmitter, Platform } from 'react-native';
import { storage } from '@/lib/storage';
import { applyLocationToTrip } from '@/lib/trip-tracking';
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
    DeviceEventEmitter.emit(BACKGROUND_LOCATION_EVENT, trip);
  });
}

export async function startBackgroundLocation(
  notificationTitle: string,
  notificationBody: string,
) {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) return false;
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) return true;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.AutomotiveNavigation,
      distanceInterval: 5,
      timeInterval: 3000,
      deferredUpdatesDistance: 10,
      deferredUpdatesInterval: 5000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle,
        notificationBody,
        killServiceOnDestroy: false,
      },
    });
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
