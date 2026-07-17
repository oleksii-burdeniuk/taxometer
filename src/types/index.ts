export type Language = 'uk' | 'en' | 'pl';
export type ThemePreference = 'system' | 'light' | 'dark';
export type TariffKind = 'single' | 'zoned';
export type TariffScheduleKind = 'always' | 'weekday' | 'nightHoliday';

export type TariffSchedule = {
  kind: TariffScheduleKind;
  startMinutes: number;
  endMinutes: number;
};

export type Tariff = {
  id: string;
  name: string;
  currency: string;
  baseFare: number;
  includedKm: number;
  pricePerKm: number;
  waitingPerMinute: number;
  minimumFare: number;
  isDefault: boolean;
  createdAt: string;
  city?: string;
  tariffNumber?: 1 | 2 | 3 | 4;
  zone?: string;
  period?: 'day' | 'night';
  variantLabel?: string;
  schedule?: TariffSchedule;
  showOnHome?: boolean;
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
  /** Fixed price agreed with the passenger before the ride. */
  agreedFare?: number;
  /** False when a fixed-price ride is recorded without GPS taximeter billing. */
  meterEnabled?: boolean;
  pickupAddress?: string;
  dropoffAddress?: string;
  /** Taximeter result before an agreed price or discount was applied. */
  meteredTotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  points: TripPoint[];
  trackingResumedAt?: number;
  pausedAt?: number;
  initialTariff?: Tariff;
  tariffSegments?: TripTariffSegment[];
  trackingWarning?: 'gps';
  zoneMode?: 'single' | 'cross';
};
