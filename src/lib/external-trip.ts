import { formatDuration } from '@/lib/meter';
import type { Language, Trip } from '@/types';

export type ExternalTripSnapshot = {
  tripId: string;
  status: 'active' | 'paused';
  amountText: string;
  distanceText: string;
  durationText: string;
  tariffName: string;
  startedAtMs: number;
  pausedAtMs?: number;
  updatedAtMs: number;
  labels: {
    appName: string;
    currentFare: string;
    distance: string;
    time: string;
    tariff: string;
    pause: string;
    resume: string;
    open: string;
    collapse: string;
    expand: string;
    active: string;
    paused: string;
    activeShort: string;
    pausedShort: string;
    fixedPrice: string;
  };
  openUrl: string;
  controlUrl: string;
};

export type TripHomeWidgetIdleCopy = {
  appName: string;
  title: string;
  hint: string;
  open: string;
};

const copy: Record<Language, ExternalTripSnapshot['labels']> = {
  uk: {
    appName: 'Таксометр', currentFare: 'Поточна ціна', distance: 'Відстань', time: 'Час', tariff: 'Тариф',
    pause: 'Пауза', resume: 'Продовжити', open: 'Відкрити', collapse: 'Згорнути', expand: 'Розгорнути',
    active: 'Поїздка триває', paused: 'Поїздку призупинено', activeShort: 'Активна', pausedShort: 'Пауза',
    fixedPrice: 'Узгоджена ціна',
  },
  en: {
    appName: 'Taxometer', currentFare: 'Current fare', distance: 'Distance', time: 'Time', tariff: 'Tariff',
    pause: 'Pause', resume: 'Resume', open: 'Open', collapse: 'Collapse', expand: 'Expand',
    active: 'Ride in progress', paused: 'Ride paused', activeShort: 'Active', pausedShort: 'Paused',
    fixedPrice: 'Fixed price',
  },
  pl: {
    appName: 'Taksometr', currentFare: 'Aktualna cena', distance: 'Dystans', time: 'Czas', tariff: 'Taryfa',
    pause: 'Pauza', resume: 'Wznów', open: 'Otwórz', collapse: 'Zwiń', expand: 'Rozwiń',
    active: 'Kurs trwa', paused: 'Kurs wstrzymany', activeShort: 'Aktywny', pausedShort: 'Pauza',
    fixedPrice: 'Cena umówiona',
  },
};

const idleWidgetCopy: Record<Language, TripHomeWidgetIdleCopy> = {
  uk: { appName: 'Таксометр', title: 'Готовий до нової поїздки', hint: 'Відкрийте застосунок, щоб почати', open: 'Відкрити' },
  en: { appName: 'Taxometer', title: 'Ready for a new trip', hint: 'Open the app to start', open: 'Open app' },
  pl: { appName: 'Taksometr', title: 'Gotowy na nowy kurs', hint: 'Otwórz aplikację, aby rozpocząć', open: 'Otwórz' },
};

export function getTripHomeWidgetIdleCopy(language: Language) {
  return idleWidgetCopy[language];
}

export function createExternalTripSnapshot(trip: Trip, now: number, language: Language): ExternalTripSnapshot {
  const startedAtMs = new Date(trip.startedAt).getTime();
  const effectiveNow = trip.status === 'paused' ? (trip.pausedAt ?? now) : now;
  const elapsedSeconds = Math.max(0, Math.floor((effectiveNow - startedAtMs) / 1000));
  const labels = copy[language];
  const action = trip.status === 'paused' ? 'resume' : 'pause';
  const query = `action=${action}&tripId=${encodeURIComponent(trip.id)}`;

  return {
    tripId: trip.id,
    status: trip.status === 'paused' ? 'paused' : 'active',
    amountText: `${trip.tariff.currency} ${trip.total.toFixed(2)}`,
    distanceText: trip.meterEnabled === false ? '—' : `${(trip.distanceMeters / 1000).toFixed(2)} km`,
    durationText: formatDuration(elapsedSeconds),
    tariffName: trip.meterEnabled === false
      ? [trip.pickupAddress, trip.dropoffAddress].filter(Boolean).join(' → ') || labels.fixedPrice
      : trip.tariff.variantLabel ?? trip.tariff.name,
    startedAtMs,
    pausedAtMs: trip.pausedAt,
    updatedAtMs: now,
    labels,
    openUrl: 'taxometer://active-trip',
    controlUrl: `taxometer://trip-control?${query}`,
  };
}
