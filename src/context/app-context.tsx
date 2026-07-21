import * as Location from 'expo-location';
import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, PermissionsAndroid, Platform } from 'react-native';
import { krakowTariffs, mergeKrakowDefaults } from '@/constants/krakow-tariffs';
import { useI18n } from '@/i18n';
import { createExternalTripSnapshot } from '@/lib/external-trip';
import { calculateFare, createId } from '@/lib/meter';
import { storage } from '@/lib/storage';
import { createReceiptTaxiProfile, DEFAULT_TAXI_DATA_PREFERENCES, DEFAULT_TAXI_PROFILE_METADATA, normalizeTaxiProfile, resolveTaxiDataAccess } from '@/lib/taxi-profile';
import { applyLocationToTrip, projectTripTime } from '@/lib/trip-tracking';
import { resolveStartingTariff } from '@/lib/tariff-period';
import { appendTariffSegment } from '@/lib/tariff-switch';
import { taxiProfileRepository } from '@/repositories/taxi-profile-repository';
import {
  endExternalTripDisplay,
  startExternalTripDisplay,
  updateExternalTripDisplay,
} from '@/services/external-trip-display';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  subscribeToBackgroundLocation,
} from '@/services/background-location';
import { Tariff, TaxiDataAccess, TaxiDataPreferences, TaxiProfile, TaxiProfileMetadata, Trip } from '@/types';

const defaultTariffs = krakowTariffs;

type AppValue = {
  ready: boolean; tariffs: Tariff[]; trips: Trip[]; activeTrip: Trip | null;
  selectedTariffId: string; elapsedSeconds: number;
  displayTrip: Trip | null;
  gpsStale: boolean;
  recommendedTariffId: string | null;
  taxiProfile: TaxiProfile;
  taxiProfileMetadata: TaxiProfileMetadata;
  taxiDataPreferences: TaxiDataPreferences;
  taxiDataAccess: TaxiDataAccess;
  saveTaxiProfile: (profile: TaxiProfile) => Promise<boolean>;
  setTaxiDataPreference: <K extends keyof TaxiDataPreferences>(key: K, value: TaxiDataPreferences[K]) => Promise<void>;
  setSelectedTariffId: (id: string) => void; saveTariff: (tariff: Tariff) => void;
  saveTariffs: (tariffs: Tariff[]) => void;
  deleteTariff: (id: string) => boolean; setDefaultTariff: (id: string) => void;
  deleteTariffGroup: (groupId: string) => boolean;
  setTariffVisibility: (id: string, visible: boolean) => boolean;
  setTariffGroupVisibility: (groupId: string, visible: boolean) => boolean;
  deleteTrip: (id: string) => Promise<void>;
  switchTripTariff: (tariffId: string) => Promise<boolean>;
  startTrip: (options?: { agreedFare?: number; pickupAddress?: string; dropoffAddress?: string; meterEnabled?: boolean }) => Promise<boolean>; togglePause: () => Promise<void>; finishTrip: (discount?: { percent?: number; finalPrice?: number }) => Promise<Trip | null>;
};

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const { t, language } = useI18n();
  const [ready, setReady] = useState(false);
  const [tariffs, setTariffs] = useState<Tariff[]>(defaultTariffs);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [selectedTariffId, setSelectedTariffId] = useState('krakow-t1');
  const [taxiProfile, setTaxiProfile] = useState<TaxiProfile>({});
  const [taxiProfileMetadata, setTaxiProfileMetadata] = useState<TaxiProfileMetadata>(DEFAULT_TAXI_PROFILE_METADATA);
  const [taxiDataPreferences, setTaxiDataPreferences] = useState<TaxiDataPreferences>(DEFAULT_TAXI_DATA_PREFERENCES);
  const taxiDataAccess = resolveTaxiDataAccess(taxiDataPreferences);
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

  const startTracking = async (tripForDisplay = activeTrip) => {
    const externalStarted = tripForDisplay
      ? await startExternalTripDisplay(createExternalTripSnapshot(tripForDisplay, Date.now(), language))
      : false;
    const backgroundStarted = await startBackgroundLocation(
      t('appName'),
      t('trackingNotification'),
      Platform.OS === 'android' && externalStarted,
    );
    if (!backgroundStarted) await beginForegroundFallback();
  };

  useEffect(() => {
    Promise.all([storage.getTariffs(defaultTariffs), storage.getTrips(), storage.getActiveTrip(), storage.getDefaultTariffId(), taxiProfileRepository.load()])
      .then(([storedTariffs, storedTrips, storedActive, defaultTariffId, workProfile]) => {
        const migratedTariffs = mergeKrakowDefaults(storedTariffs, defaultTariffId);
        const homeTariffs = migratedTariffs.filter((tariff) => tariff.showOnHome !== false);
        setTariffs(migratedTariffs); setTrips(storedTrips); setActiveTrip(storedActive);
        setTaxiProfile(workProfile.profile);
        setTaxiDataPreferences(workProfile.preferences);
        setTaxiProfileMetadata(workProfile.metadata);
        setSelectedTariffId(storedActive?.tariff.id ?? homeTariffs.find((item) => item.isDefault)?.id ?? homeTariffs[0]?.id ?? migratedTariffs[0].id);
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
    if (activeTripStatus !== 'active' || activeTrip?.meterEnabled === false) return;
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
    if (!ready || activeTripStatus !== 'active' || activeTrip?.meterEnabled === false) return;
    Location.getForegroundPermissionsAsync().then(({ granted }) => {
      if (granted) return startTracking(activeTrip).catch(() => undefined);
      return undefined;
    });
    return () => { foregroundSubscription.current?.remove(); foregroundSubscription.current = null; };
    // Tracking is restarted only when the ride identity or status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeTripStatus, activeTripId]);

  useEffect(() => {
    if (!ready || !activeTrip || activeTrip.status !== 'paused') return;
    void startExternalTripDisplay(createExternalTripSnapshot(activeTrip, activeTrip.pausedAt ?? Date.now(), language));
  }, [ready, activeTrip, activeTripId, language]);

  useEffect(() => {
    if (!ready || activeTrip) return;
    void endExternalTripDisplay(language);
  }, [ready, activeTrip, language]);

  useEffect(() => () => foregroundSubscription.current?.remove(), []);

  const confirmBackgroundPermission = () => new Promise<boolean>((resolve) => {
    Alert.alert(t('backgroundPermissionTitle'), t('backgroundPermissionBody'), [
      { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: t('continue'), onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

  const chooseStartingTariff = (selected: Tariff, recommended: Tariff) => {
    if (selected.id === recommended.id) return Promise.resolve<Tariff | null>(selected);
    const selectedName = selected.variantLabel ?? selected.name;
    const recommendedName = recommended.variantLabel ?? recommended.name;
    return new Promise<Tariff | null>((resolve) => {
      Alert.alert(
        t('startTariffTitle'),
        `${t('startTariffBody')}\n\n${t('selectedTariffLabel')}: ${selectedName}\n${t('recommendedTariffLabel')}: ${recommendedName}`,
        [
          { text: t('cancel'), style: 'cancel', onPress: () => resolve(null) },
          { text: t('keepSelectedTariff'), onPress: () => resolve(selected) },
          { text: t('useRecommendedTariff'), onPress: () => resolve(recommended) },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    });
  };

  const requestLocationPermissions = async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (!foreground.granted) {
      Alert.alert(t('locationTitle'), t('locationBody')); return false;
    }
    if (Platform.OS === 'web') return true;
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      // The ride can still be recorded when this is denied, but Android 13+
      // hides the persistent foreground-service notification from the drawer.
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
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
    if (!taxiDataAccess.canManageTariffs) return;
    setTariffs((current) => {
      const exists = current.some((item) => item.id === tariff.id);
      const next = exists ? current.map((item) => item.id === tariff.id ? tariff : item) : [...current, tariff];
      void storage.setTariffs(next); return next;
    });
  };
  const saveTaxiProfile = async (profile: TaxiProfile) => {
    if (!taxiDataAccess.canEditProfile) return false;
    const normalized = normalizeTaxiProfile(profile);
    const metadata: TaxiProfileMetadata = {
      source: 'local',
      revision: taxiProfileMetadata.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    setTaxiProfile(normalized);
    setTaxiProfileMetadata(metadata);
    await taxiProfileRepository.saveProfile(normalized, metadata);
    return true;
  };
  const setTaxiDataPreference = async <K extends keyof TaxiDataPreferences>(key: K, preference: TaxiDataPreferences[K]) => {
    const next = { ...taxiDataPreferences, [key]: preference };
    setTaxiDataPreferences(next);
    await taxiProfileRepository.savePreferences(next);
  };
  const saveTariffs = (items: Tariff[]) => {
    if (!taxiDataAccess.canManageTariffs) return;
    const ids = new Set(items.map((item) => item.id));
    const groupIds = new Set(items.map((item) => item.groupId).filter((id): id is string => !!id));
    const next = [...tariffs.filter((item) => !ids.has(item.id) && (!item.groupId || !groupIds.has(item.groupId))), ...items];
    setTariffs(next);
    void storage.setTariffs(next);
    if (!activeTrip && !next.some((tariff) => tariff.id === selectedTariffId && tariff.showOnHome !== false)) {
      const replacement = next.find((tariff) => tariff.isDefault && tariff.showOnHome !== false)
        ?? next.find((tariff) => tariff.showOnHome !== false);
      if (replacement) setSelectedTariffId(replacement.id);
    }
  };
  const setDefaultTariff = (id: string) => {
    if (!taxiDataAccess.canManageTariffs) return;
    setTariffs((current) => {
      const next = current.map((item) => ({ ...item, isDefault: item.id === id, showOnHome: item.id === id ? true : item.showOnHome }));
      void storage.setTariffs(next); return next;
    });
    setSelectedTariffId(id);
    void storage.setDefaultTariffId(id);
  };
  const deleteTariffGroup = (groupId: string) => {
    if (!taxiDataAccess.canManageTariffs) return false;
    const targets = tariffs.filter((tariff) => tariff.groupId === groupId);
    if (!targets.length || targets.some((tariff) => tariff.isDefault || tariff.isOfficial)) return false;
    const next = tariffs.filter((tariff) => tariff.groupId !== groupId);
    setTariffs(next); void storage.setTariffs(next);
    if (targets.some((tariff) => tariff.id === selectedTariffId)) {
      const replacement = next.find((tariff) => tariff.isDefault && tariff.showOnHome !== false) ?? next.find((tariff) => tariff.showOnHome !== false);
      if (replacement) setSelectedTariffId(replacement.id);
    }
    return true;
  };
  const deleteTariff = (id: string) => {
    if (!taxiDataAccess.canManageTariffs) return false;
    const target = tariffs.find((item) => item.id === id);
    if (!target || target.isDefault) return false;
    const next = tariffs.filter((item) => item.id !== id);
    setTariffs(next); void storage.setTariffs(next);
    if (id === selectedTariffId) {
      const replacement = next.find((tariff) => tariff.isDefault && tariff.showOnHome !== false) ?? next.find((tariff) => tariff.showOnHome !== false);
      if (replacement) setSelectedTariffId(replacement.id);
    }
    return true;
  };
  const setTariffVisibility = (id: string, visible: boolean) => {
    if (!taxiDataAccess.canManageTariffs) return false;
    const target = tariffs.find((tariff) => tariff.id === id);
    if (!target) return false;
    const visibleCount = tariffs.filter((tariff) => tariff.showOnHome !== false).length;
    if (!visible && target.showOnHome !== false && visibleCount <= 1) return false;
    const next = tariffs.map((tariff) => tariff.id === id ? { ...tariff, showOnHome: visible } : tariff);
    setTariffs(next);
    void storage.setTariffs(next);
    if (!visible && selectedTariffId === id) {
      const replacement = next.find((tariff) => tariff.showOnHome !== false && tariff.isDefault)
        ?? next.find((tariff) => tariff.showOnHome !== false);
      if (replacement) setSelectedTariffId(replacement.id);
    }
    return true;
  };
  const setTariffGroupVisibility = (groupId: string, visible: boolean) => {
    if (!taxiDataAccess.canManageTariffs) return false;
    const targets = tariffs.filter((tariff) => tariff.groupId === groupId);
    if (!targets.length) return false;
    const targetIds = new Set(targets.map((tariff) => tariff.id));
    const next = tariffs.map((tariff) => targetIds.has(tariff.id) ? { ...tariff, showOnHome: visible } : tariff);
    setTariffs(next);
    void storage.setTariffs(next);
    if (!visible && targetIds.has(selectedTariffId)) {
      const replacement = next.find((tariff) => tariff.showOnHome !== false && tariff.isDefault)
        ?? next.find((tariff) => tariff.showOnHome !== false);
      if (replacement) setSelectedTariffId(replacement.id);
    } else if (visible && !next.some((tariff) => tariff.id === selectedTariffId && tariff.showOnHome !== false)) {
      const replacement = targets.find((tariff) => tariff.isDefault) ?? targets[0];
      setSelectedTariffId(replacement.id);
    }
    return true;
  };
  const performStartTrip = async (options: { agreedFare?: number; pickupAddress?: string; dropoffAddress?: string; meterEnabled?: boolean } = {}) => {
    const selectedTariff = tariffs.find((item) => item.id === selectedTariffId && item.showOnHome !== false)
      ?? tariffs.find((item) => item.isDefault && item.showOnHome !== false)
      ?? tariffs.find((item) => item.showOnHome !== false);
    if (!selectedTariff) return false;
    const meterEnabled = options.meterEnabled !== false;
    const recommendedTariff = resolveStartingTariff(tariffs, selectedTariff, new Date());
    const tariff = meterEnabled ? await chooseStartingTariff(selectedTariff, recommendedTariff) : selectedTariff;
    if (!tariff) return false;
    if (meterEnabled && !(await requestLocationPermissions())) return false;
    if (tariff.id !== selectedTariffId) setSelectedTariffId(tariff.id);
    const trip: Trip = {
      id: createId(), tariff: { ...tariff }, status: 'active', startedAt: new Date().toISOString(),
      distanceMeters: 0, chargedDistanceMeters: 0, waitingSeconds: 0,
      total: meterEnabled ? calculateFare(tariff, 0, 0) : (options.agreedFare ?? 0), points: [],
      agreedFare: options.agreedFare,
      meterEnabled,
      pickupAddress: options.pickupAddress?.trim() || undefined,
      dropoffAddress: options.dropoffAddress?.trim() || undefined,
      trackingResumedAt: Date.now(),
      initialTariff: meterEnabled ? { ...tariff } : undefined,
      tariffSegments: meterEnabled ? [{
        id: createId(), tariff: { ...tariff }, startedAt: new Date().toISOString(),
        chargedDistanceMeters: 0, waitingSeconds: 0,
      }] : undefined,
    };
    await storage.setActiveTrip(trip);
    setActiveTrip(trip);
    try {
      if (meterEnabled) await startTracking(trip);
      else await startExternalTripDisplay(createExternalTripSnapshot(trip, Date.now(), language));
    }
    catch {
      setActiveTrip(null);
      await Promise.allSettled([storage.setActiveTrip(null), endExternalTripDisplay(language)]);
      throw new Error('Location tracking failed');
    }
    return true;
  };
  const startTrip = async (options?: { agreedFare?: number; pickupAddress?: string; dropoffAddress?: string; meterEnabled?: boolean }) => {
    if (tripStartPromise.current) return tripStartPromise.current;
    tripStartPromise.current = performStartTrip(options);
    try { return await tripStartPromise.current; }
    finally { tripStartPromise.current = null; }
  };
  const performTariffSwitch = async (tariffId: string) => {
    if (!activeTrip || activeTrip.status !== 'active' || activeTrip.meterEnabled === false) return false;
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
      await startTracking(optimisticTrip).catch(() => undefined);
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
    if (nextStatus === 'paused' && activeTrip.meterEnabled !== false) {
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
      pausedAt: nextStatus === 'paused' ? transitionTimestamp : undefined,
    };
    await storage.setActiveTrip(next); setActiveTrip(next);
    await updateExternalTripDisplay(createExternalTripSnapshot(next, transitionTimestamp, language));
    if (next.status === 'active' && next.meterEnabled !== false) await startTracking(next);
  };
  const finishTrip = async (discount: { percent?: number; finalPrice?: number } = {}) => {
    if (!activeTrip) return null;
    foregroundSubscription.current?.remove(); foregroundSubscription.current = null;
    if (activeTrip.meterEnabled !== false) await stopBackgroundLocation();
    const stored = await storage.getActiveTrip();
    const endedAtTimestamp = Date.now();
    const persistedTrip = stored?.id === activeTrip.id ? stored : activeTrip;
    const latest = persistedTrip.meterEnabled === false ? persistedTrip : projectTripTime(persistedTrip, endedAtTimestamp);
    const endedAt = new Date(endedAtTimestamp).toISOString();
    const meteredTotal = latest.meterEnabled === false ? undefined : latest.total;
    const priceBeforeDiscount = latest.agreedFare ?? meteredTotal ?? latest.total;
    const usesFinalPrice = Number.isFinite(discount.finalPrice);
    const discountPercent = Number.isFinite(discount.percent)
      ? Math.min(100, Math.max(0, Math.round((discount.percent ?? 0) * 100) / 100))
      : undefined;
    const requestedFinalPrice = Math.round((discount.finalPrice ?? priceBeforeDiscount) * 100) / 100;
    const total = usesFinalPrice
      ? Math.min(priceBeforeDiscount, Math.max(0, requestedFinalPrice))
      : Math.round(priceBeforeDiscount * (100 - (discountPercent ?? 0))) / 100;
    const discountAmount = Math.round((priceBeforeDiscount - total) * 100) / 100;
    const receiptTaxiProfile = createReceiptTaxiProfile(taxiProfile, taxiDataPreferences.includeOnReceipt);
    const finished: Trip = {
      ...latest, status: 'completed', endedAt, meteredTotal, total,
      discountPercent,
      discountAmount,
      tariffSegments: latest.tariffSegments?.map((segment, index, all) => index === all.length - 1 ? { ...segment, endedAt } : segment),
      receiptTaxiProfile,
      receiptTaxiProfileMetadata: receiptTaxiProfile ? { ...taxiProfileMetadata } : undefined,
    };
    const nextTrips = [finished, ...trips];
    setTrips(nextTrips); setActiveTrip(null);
    await Promise.allSettled([storage.setTrips(nextTrips), storage.setActiveTrip(null), endExternalTripDisplay(language)]);
    return finished;
  };
  const deleteTrip = async (id: string) => {
    if (!taxiDataAccess.canDeleteReceipts) return;
    const nextTrips = trips.filter((trip) => trip.id !== id);
    setTrips(nextTrips);
    await storage.setTrips(nextTrips);
  };

  const elapsedSeconds = activeTrip
    ? Math.max(0, Math.floor(((activeTrip.status === 'paused' ? activeTrip.pausedAt ?? now : now) - new Date(activeTrip.startedAt).getTime()) / 1000))
    : 0;
  const lastPointTimestamp = activeTrip?.points.at(-1)?.timestamp;
  const gpsReferenceTimestamp = lastPointTimestamp ?? (activeTrip ? new Date(activeTrip.startedAt).getTime() : undefined);
  const gpsStale = activeTrip?.meterEnabled !== false && activeTrip?.status === 'active' && !!gpsReferenceTimestamp && now > 0 && now - gpsReferenceTimestamp > 30_000;
  const displayTrip = activeTrip ? (activeTrip.meterEnabled === false ? activeTrip : projectTripTime(activeTrip, now)) : null;
  useEffect(() => {
    if (!ready || !displayTrip) return;
    void updateExternalTripDisplay(createExternalTripSnapshot(displayTrip, now, language));
  }, [ready, displayTrip, now, language]);
  const recommendedTariffId = now > 0 && activeTrip?.status === 'active' && activeTrip.meterEnabled !== false
    ? resolveStartingTariff(tariffs, activeTrip.tariff, new Date(now)).id
    : null;
  const value: AppValue = ({ ready, tariffs, trips, activeTrip, displayTrip, selectedTariffId, elapsedSeconds, gpsStale, recommendedTariffId, taxiProfile, taxiProfileMetadata, taxiDataPreferences, taxiDataAccess,
    saveTaxiProfile, setTaxiDataPreference,
    setSelectedTariffId, saveTariff, saveTariffs, deleteTariff, deleteTariffGroup, setDefaultTariff, setTariffVisibility, setTariffGroupVisibility, deleteTrip, switchTripTariff, startTrip, togglePause, finishTrip,
  });
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
