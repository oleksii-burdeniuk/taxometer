import { storage } from '@/lib/storage';
import { DEFAULT_TAXI_DATA_PREFERENCES, DEFAULT_TAXI_PROFILE_METADATA, normalizeTaxiProfile } from '@/lib/taxi-profile';
import { TaxiDataPreferences, TaxiProfile, TaxiProfileMetadata } from '@/types';

export type TaxiWorkProfile = {
  profile: TaxiProfile;
  metadata: TaxiProfileMetadata;
  preferences: TaxiDataPreferences;
};

export interface TaxiProfileRepository {
  load(): Promise<TaxiWorkProfile>;
  saveProfile(profile: TaxiProfile, metadata: TaxiProfileMetadata): Promise<void>;
  savePreferences(preferences: TaxiDataPreferences): Promise<void>;
}

class LocalTaxiProfileRepository implements TaxiProfileRepository {
  async load() {
    const [profile, metadata, preferences] = await Promise.all([
      storage.getTaxiProfile(),
      storage.getTaxiProfileMetadata(),
      storage.getTaxiDataPreferences(),
    ]);
    return {
      profile: normalizeTaxiProfile(profile),
      metadata: { ...DEFAULT_TAXI_PROFILE_METADATA, ...metadata },
      preferences: { ...DEFAULT_TAXI_DATA_PREFERENCES, ...preferences },
    };
  }

  async saveProfile(profile: TaxiProfile, metadata: TaxiProfileMetadata) {
    await Promise.all([storage.setTaxiProfile(profile), storage.setTaxiProfileMetadata(metadata)]);
  }

  async savePreferences(preferences: TaxiDataPreferences) {
    await storage.setTaxiDataPreferences(preferences);
  }
}

// Replace this instance with an API-backed repository after authentication is added.
export const taxiProfileRepository: TaxiProfileRepository = new LocalTaxiProfileRepository();
