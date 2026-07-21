import { TaxiDataAccess, TaxiDataPreferences, TaxiProfile, TaxiProfileMetadata } from '@/types';

export const DEFAULT_TAXI_DATA_PREFERENCES: TaxiDataPreferences = {
  includeOnReceipt: true,
  allowProfileEditing: true,
  allowReceiptDeletion: true,
  managedMode: false,
};

export const DEFAULT_TAXI_PROFILE_METADATA: TaxiProfileMetadata = {
  source: 'local',
  revision: 0,
};

export function resolveTaxiDataAccess(preferences: TaxiDataPreferences): TaxiDataAccess {
  if (preferences.managedMode) return { canEditProfile: false, canManageTariffs: false, canDeleteReceipts: false };
  return {
    canEditProfile: preferences.allowProfileEditing,
    canManageTariffs: true,
    canDeleteReceipts: preferences.allowReceiptDeletion,
  };
}

export function normalizeTaxiProfile(profile: TaxiProfile): TaxiProfile {
  const normalized = Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, value?.trim() || undefined]),
  ) as TaxiProfile;
  if (normalized.vehicleRegistrationNumber) normalized.vehicleRegistrationNumber = normalized.vehicleRegistrationNumber.toUpperCase();
  if (normalized.vehicleVin) normalized.vehicleVin = normalized.vehicleVin.toUpperCase();
  return normalized;
}

export function hasTaxiProfileData(profile: TaxiProfile) {
  return Object.values(profile).some((value) => Boolean(value?.trim()));
}

export function createReceiptTaxiProfile(profile: TaxiProfile, includeOnReceipt: boolean) {
  if (!includeOnReceipt) return undefined;
  const normalized = normalizeTaxiProfile(profile);
  return hasTaxiProfileData(normalized) ? { ...normalized } : undefined;
}

export function isValidPolishNip(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return true;
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const checksum = weights.reduce((sum, weight, index) => sum + weight * Number(digits[index]), 0) % 11;
  return checksum !== 10 && checksum === Number(digits[9]);
}

export type LicenseExpiryStatus = 'valid' | 'expiring' | 'expired' | 'invalid';

export function getLicenseExpiryStatus(value: string | undefined, now = new Date()): LicenseExpiryStatus | null {
  if (!value?.trim()) return null;
  const input = value.trim();
  const european = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(input);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const year = Number(european?.[3] ?? iso?.[1]);
  const month = Number(european?.[2] ?? iso?.[2]);
  const day = Number(european?.[1] ?? iso?.[3]);
  if (!year || !month || !day) return 'invalid';
  const expiry = new Date(year, month - 1, day);
  if (expiry.getFullYear() !== year || expiry.getMonth() !== month - 1 || expiry.getDate() !== day) return 'invalid';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysRemaining = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'expiring';
  return 'valid';
}
