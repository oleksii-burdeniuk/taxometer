import * as Location from 'expo-location';
import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { krakowTariffs, mergeKrakowDefaults } from '@/constants/krakow-tariffs';
import { useI18n } from '@/i18n';
import { calculateFare, createId } from '@/lib/meter';
import { storage } from '@/lib/storage';
import { applyLocationToTrip, projectTripTime } from '@/lib/trip-tracking';
import { getKrakowTariffPeriod, resolveStartingTariff } from '@/lib/tariff-period';
import { appendTariffSegment } from '@/lib/tariff-switch';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  subscribeToBackgroundLocation,
} from '@/services/background-location';
import { Tariff, Trip } from '@/types';

const defaultTariffs = krakowTariffs;

type AppValue = {
  ready: boolean; tariffs: Tariff[]; trips: Trip[]; activeTrip: Trip | null;
  selectedTariffId: string; elapsedSeconds: number;
  displayTrip: Trip | null;
  gpsStale: boolean;
  recommendedPeriod: 'day' | 'night' | null;
  zoneMode: 'single' | 'cross'; setZoneMode: (mode: 'single' | 'cross') => void;
  setSelectedTariffId: (id: string) => void; saveTariff: (tariff: Tariff) => void;
  saveTariffs: (tariffs: Tariff[]) => void;
  deleteTariff: (id: string) => boolean; setDefaultTariff: (id: string) => void;
  deleteTariffGroup: (groupId: string) => boolean;
  deleteTrip: (id: string) => Promise<void>;
  switchTripTariff: (tariffId: string) => Promise<boolean>;
  startTrip: () => Promise<boolean>; togglePause: () => Promise<void>; finishTrip: () => Promise<Trip | null>;
};

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [tariffs, setTariffs] = useState<Tariff[]>(defaultTariffs);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [selectedTariffId, setSelectedTariffId] = useState('krakow-t1');
  const [zoneMode, setZoneMode] = useState<'single' | 'cross'>('single');
  const [now, setNow] = useState(Date.now);
  const foregroundSubscription = useRef<Location.LocationSubscription | null>(null);
  const tariffSwitchPromise = useRef<Promise<boolean> | null>(null);
  const tripStartPromise = useRef<Promise<boolean> | null>(null);
  const locationRecoveryInFlight = useRef(false);
  const lastLocationRecoveryAt = useRef(0);
  const activeTripStatus = activeTrip?.status;
  const activeTripId = activeTrip?.id;

  const beginForegroundFallback = async () => {
    foregroundSubscription.current?.remove();
    foregroundSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
      (location) => {
        setActiveTrip((current) => {
          if (!current || current.status !== 'active') return current;
          const next = applyLocationToTrip(current, location);
          void storage.setActiveTrip(next);
          return next;
        });
      },
    );
  };

  const startTracking = async () => {
    const backgroundStarted = await startBackgroundLocation(t('appName'), t('trackingNotification'));
    if (!backgroundStarted) await beginForegroundFallback();
  };

  useEffect(() => {
    Promise.all([storage.getTariffs(defaultTariffs), storage.getTrips(), storage.getActiveTrip(), storage.getDefaultTariffId()])
      .then(([storedTariffs, storedTrips, storedActive, defaultTariffId]) => {
        const migratedTariffs = mergeKrakowDefaults(storedTariffs, defaultTariffId);
        setTariffs(migratedTariffs); setTrips(storedTrips); setActiveTrip(storedActive);
        setSelectedTariffId(storedActive?.tariff.id ?? migratedTariffs.find((item) => item.isDefault)?.id ?? migratedTariffs[0].id);
        void storage.setTariffs(migratedTariffs);
        const migratedDefault = migratedTariffs.find((tariff) => tariff.isDefault);
        if (migratedDefault) void storage.setDefaultTariffId(migratedDefault.id);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const locationListener = subscribeToBackgroundLocation((updatedTrip) => {
      // Do not let an in-flight background update temporarily roll back an
      // optimistic tariff switch shown on the meter screen.
      if (tariffSwitchPromise.current) return;
      setActiveTrip((current) => current?.id === updatedTrip.id ? updatedTrip : current);
    });
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      storage.getActiveTrip().then((stored) => {
        if (stored) setActiveTrip(stored);
      });
    });
    return () => { locationListener.remove(); appStateListener.remove(); };
  }, []);

  useEffect(() => {
    if (activeTripStatus !== 'active') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeTripStatus, activeTripId]);

  useEffect(() => {
    if (activeTripStatus !== 'active') return;
    const referenceTimestamp = activeTrip?.points.at(-1)?.timestamp ?? new Date(activeTrip?.startedAt ?? 0).getTime();
    const updateDelay = now - referenceTimestamp;
    if (updateDelay < 12_000 || now - lastLocationRecoveryAt.current < 12_000 || locationRecoveryInFlight.current) return;
    locationRecoveryInFlight.current = true;
    lastLocationRecoveryAt.current = now;
    const recoveryTripId = activeTrip?.id;
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })
      .then((location) => {
        setActiveTrip((current) => {
          if (!current || current.id !== recoveryTripId || current.status !== 'active') return current;
          const next = applyLocationToTrip(current, location);
          if (next === current) return current;
          void storage.setActiveTrip(next);
          return next;
        });
      })
      .catch(() => undefined)
      .finally(() => { locationRecoveryInFlight.current = false; });
  }, [activeTrip, activeTripStatus, now]);

  useEffect(() => {
    if (!ready || activeTripStatus !== 'active') return;
    Location.getForegroundPermissionsAsync().then(({ granted }) => {
      if (granted) return startTracking().catch(() => undefined);
      return undefined;
    });
    return () => { foregroundSubscription.current?.remove(); foregroundSubscription.current = null; };
    // Tracking is restarted only when the ride identity or status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeTripStatus, activeTripId]);

  useEffect(() => () => foregroundSubscription.current?.remove(), []);

  const confirmBackgroundPermission = () => new Promise<boolean>((resolve) => {
    Alert.alert(t('backgroundPermissionTitle'), t('backgroundPermissionBody'), [
      { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: t('continue'), onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

  const requestLocationPermissions = async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) {
      Alert.alert(t('locationTitle'), t('locationBody')); return false;
    }
    if (Platform.OS === 'web') return true;
    const existingBackground = await Location.getBackgroundPermissionsAsync();
    if (existingBackground.granted) return true;
    if (!(await confirmBackgroundPermission())) return false;
    const background = await Location.requestBackgroundPermissionsAsync();
    if (!background.granted) {
      Alert.alert(t('backgroundPermissionTitle'), t('backgroundPermissionDenied')); return false;
    }
    return true;
  };

  const saveTariff = (tariff: Tariff) => {
    setTariffs((current) => {
      const exists = current.some((item) => item.id === tariff.id);
      const next = exists ? current.map((item) => item.id === tariff.id ? tariff : item) : [...current, tariff];
      void storage.setTariffs(next); return next;
    });
  };
  const saveTariffs = (items: Tariff[]) => {
    setTariffs((current) => {
      const ids = new Set(items.map((item) => item.id));
      const next = [...current.filter((item) => !ids.has(item.id)), ...items];
      void storage.setTariffs(next);
      return next;
    });
  };
  const setDefaultTariff = (id: string) => {
    setTariffs((current) => {
      const next = current.map((item) => ({ ...item, isDefault: item.id === id }));
      void storage.setTariffs(next); return next;
    });
    setSelectedTariffId(id);
    void storage.setDefaultTariffId(id);
  };
  const deleteTariffGroup = (groupId: string) => {
    const targets = tariffs.filter((tariff) => tariff.groupId === groupId);
    if (!targets.length || targets.some((tariff) => tariff.isDefault || tariff.isOfficial)) return false;
    const next = tariffs.filter((tariff) => tariff.groupId !== groupId);
    setTariffs(next); void storage.setTariffs(next); return true;
  };
  const deleteTariff = (id: string) => {
    const target = tariffs.find((item) => item.id === id);
    if (!target || target.isDefault) return false;
    const next = tariffs.filter((item) => item.id !== id);
    setTariffs(next); void storage.setTariffs(next); return true;
  };
  const performStartTrip = async () => {
    if (!(await requestLocationPermissions())) return false;
    const selectedTariff = tariffs.find((item) => item.id === selectedTariffId) ?? tariffs[0];
    const tariff = resolveStartingTariff(tariffs, selectedTariff, new Date());
    if (tariff.id !== selectedTariffId) setSelectedTariffId(tariff.id);
    const trip: Trip = {
      id: createId(), tariff: { ...tariff }, status: 'active', startedAt: new Date().toISOString(),
      distanceMeters: 0, chargedDistanceMeters: 0, waitingSeconds: 0,
      total: calculateFare(tariff, 0, 0), points: [],
      trackingResumedAt: Date.now(),
      zoneMode: tariff.kind === 'zoned' ? zoneMode : 'single',
      initialTariff: { ...tariff },
      tariffSegments: [{
        id: createId(), tariff: { ...tariff }, startedAt: new Date().toISOString(),
        chargedDistanceMeters: 0, waitingSeconds: 0,
      }],
    };
    await storage.setActiveTrip(trip);
    setActiveTrip(trip);
    try { await startTracking(); }
    catch {
      setActiveTrip(null); await storage.setActiveTrip(null); throw new Error('Location tracking failed');
    }
    return true;
  };
  const startTrip = async () => {
    if (tripStartPromise.current) return tripStartPromise.current;
    tripStartPromise.current = performStartTrip();
    try { return await tripStartPromise.current; }
    finally { tripStartPromise.current = null; }
  };
  const performTariffSwitch = async (tariffId: string) => {
    if (!activeTrip || activeTrip.status !== 'active') return false;
    if (activeTrip.tariff.id === tariffId) return true;
    const nextTariff = tariffs.find((tariff) => tariff.id === tariffId);
    if (!nextTariff) return false;
    if (nextTariff.currency !== activeTrip.tariff.currency) return false;
    if (activeTrip.tariff.groupId && nextTariff.groupId !== activeTrip.tariff.groupId) return false;
    const changedAt = new Date().toISOString();
    const optimisticTrip = appendTariffSegment(activeTrip, nextTariff, changedAt);
    // Update the controls immediately. Stopping/restarting the native location
    // service is only synchronization work and must not block visual feedback.
    setActiveTrip(optimisticTrip);
    foregroundSubscription.current?.remove(); foregroundSubscription.current = null;
    try {
      await stopBackgroundLocation();
      const storedTrip = await storage.getActiveTrip();
      const latestTrip = storedTrip?.id === activeTrip.id ? storedTrip : activeTrip;
      const alreadySwitched = latestTrip.tariff.id === nextTariff.id
        && latestTrip.tariffSegments?.at(-1)?.tariff.id === nextTariff.id;
      const next = alreadySwitched ? latestTrip : appendTariffSegment(latestTrip, nextTariff, changedAt);
      await storage.setActiveTrip(next);
      setActiveTrip(next);
      return true;
    } catch {
      setActiveTrip(activeTrip);
      return false;
    } finally {
      await startTracking().catch(() => undefined);
    }
  };
  const switchTripTariff = async (tariffId: string) => {
    if (tariffSwitchPromise.current) return tariffSwitchPromise.current;
    tariffSwitchPromise.current = performTariffSwitch(tariffId);
    try { return await tariffSwitchPromise.current; }
    finally { tariffSwitchPromise.current = null; }
  };
  const togglePause = async () => {
    if (!activeTrip) return;
    const nextStatus = activeTrip.status === 'paused' ? 'active' : 'paused';
    const transitionTimestamp = Date.now();
    if (nextStatus === 'paused') {
      foregroundSubscription.current?.remove(); foregroundSubscription.current = null;
      await stopBackgroundLocation();
    }
    const storedTrip = nextStatus === 'paused' ? await storage.getActiveTrip() : null;
    const persistedTrip = storedTrip?.id === activeTrip.id ? storedTrip : activeTrip;
    const latestTrip = nextStatus === 'paused' ? projectTripTime(persistedTrip, transitionTimestamp) : persistedTrip;
    const next: Trip = {
      ...latestTrip,
      status: nextStatus,
      trackingResumedAt: nextStatus === 'active' ? Date.now() : latestTrip.trackingResumedAt,
    };
    await storage.setActiveTrip(next); setActiveTrip(next);
    if (next.status === 'active') await startTracking();
  };
  const finishTrip = async () => {
    if (!activeTrip) return null;
    foregroundSubscription.current?.remove(); foregroundSubscription.current = null;
    await stopBackgroundLocation();
    const stored = await storage.getActiveTrip();
    const endedAtTimestamp = Date.now();
    const persistedTrip = stored?.id === activeTrip.id ? stored : activeTrip;
    const latest = projectTripTime(persistedTrip, endedAtTimestamp);
    const endedAt = new Date(endedAtTimestamp).toISOString();
    const finished: Trip = {
      ...latest, status: 'completed', endedAt,
      tariffSegments: latest.tariffSegments?.map((segment, index, all) => index === all.length - 1 ? { ...segment, endedAt } : segment),
    };
    const nextTrips = [finished, ...trips];
    setTrips(nextTrips); setActiveTrip(null);
    await Promise.allSettled([storage.setTrips(nextTrips), storage.setActiveTrip(null)]);
    return finished;
  };
  const deleteTrip = async (id: string) => {
    const nextTrips = trips.filter((trip) => trip.id !== id);
    setTrips(nextTrips);
    await storage.setTrips(nextTrips);
  };

  const elapsedSeconds = activeTrip ? Math.max(0, Math.floor((now - new Date(activeTrip.startedAt).getTime()) / 1000)) : 0;
  const lastPointTimestamp = activeTrip?.points.at(-1)?.timestamp;
  const gpsReferenceTimestamp = lastPointTimestamp ?? (activeTrip ? new Date(activeTrip.startedAt).getTime() : undefined);
  const gpsStale = activeTrip?.status === 'active' && !!gpsReferenceTimestamp && now > 0 && now - gpsReferenceTimestamp > 30_000;
  const displayTrip = activeTrip ? projectTripTime(activeTrip, now) : null;
  const recommendedPeriod = now > 0 ? getKrakowTariffPeriod(new Date(now)) : null;
  const value: AppValue = ({ ready, tariffs, trips, activeTrip, displayTrip, selectedTariffId, elapsedSeconds, gpsStale, recommendedPeriod, zoneMode, setZoneMode,
    setSelectedTariffId, saveTariff, saveTariffs, deleteTariff, deleteTariffGroup, setDefaultTariff, deleteTrip, switchTripTariff, startTrip, togglePause, finishTrip,
  });
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
