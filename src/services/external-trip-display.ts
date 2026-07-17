import type { ExternalTripSnapshot } from '@/lib/external-trip';

export async function startExternalTripDisplay(_snapshot: ExternalTripSnapshot) {
  return false;
}

export async function updateExternalTripDisplay(_snapshot: ExternalTripSnapshot) {}

export async function endExternalTripDisplay() {}

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
