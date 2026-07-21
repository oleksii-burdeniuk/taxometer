import type { ExternalTripSnapshot } from '@/lib/external-trip';
import type { Language } from '@/types';

export async function startExternalTripDisplay(_snapshot: ExternalTripSnapshot) {
  return false;
}

export async function updateExternalTripDisplay(_snapshot: ExternalTripSnapshot) {}

export async function endExternalTripDisplay(_language?: Language) {}

export async function canUseTripOverlay() {
  return false;
}

export async function isTripOverlayEnabled() {
  return false;
}

export async function setTripOverlayEnabled(_enabled: boolean) {
  return false;
}

export async function requestTripOverlayPermission() {
  return false;
}
