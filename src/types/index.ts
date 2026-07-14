export type Language = 'uk' | 'en' | 'pl';
export type ThemePreference = 'system' | 'light' | 'dark';
export type TariffKind = 'single' | 'zoned';

export type Tariff = {
  id: string;
  name: string;
  currency: 'UAH' | 'PLN' | 'EUR' | 'USD';
  baseFare: number;
  includedKm: number;
  pricePerKm: number;
  waitingPerMinute: number;
  minimumFare: number;
  isDefault: boolean;
  createdAt: string;
  city?: 'Kraków';
  tariffNumber?: 1 | 2 | 3 | 4;
  zone?: 'I' | 'II';
  period?: 'day' | 'night';
  kind?: TariffKind;
  groupId?: string;
  groupName?: string;
  isOfficial?: boolean;
};

export type TripTariffSegment = {
  id: string;
  tariff: Tariff;
  startedAt: string;
  endedAt?: string;
  chargedDistanceMeters: number;
  waitingSeconds: number;
};

export type TripPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
  accuracy?: number | null;
};

export type TripStatus = 'active' | 'paused' | 'completed';

export type Trip = {
  id: string;
  tariff: Tariff;
  status: TripStatus;
  startedAt: string;
  endedAt?: string;
  distanceMeters: number;
  chargedDistanceMeters?: number;
  waitingSeconds: number;
  total: number;
  points: TripPoint[];
  trackingResumedAt?: number;
  initialTariff?: Tariff;
  tariffSegments?: TripTariffSegment[];
  trackingWarning?: 'gps';
  zoneMode?: 'single' | 'cross';
};
