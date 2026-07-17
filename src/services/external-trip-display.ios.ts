import TripLiveActivity from '@/widgets/trip-live-activity';
import type { ExternalTripSnapshot } from '@/lib/external-trip';

export async function startExternalTripDisplay(snapshot: ExternalTripSnapshot) {
  try {
    const existing = TripLiveActivity.getInstances();
    if (existing.length) {
      await Promise.all(existing.map((instance) => instance.update(snapshot)));
    } else {
      TripLiveActivity.start(snapshot, snapshot.openUrl);
    }
    return true;
  } catch {
    return false;
  }
}

export async function updateExternalTripDisplay(snapshot: ExternalTripSnapshot) {
  try {
    await Promise.all(TripLiveActivity.getInstances().map((instance) => instance.update(snapshot)));
  } catch {}
}

export async function endExternalTripDisplay() {
  try {
    await Promise.all(TripLiveActivity.getInstances().map((instance) => instance.end('immediate')));
  } catch {}
}

export async function canUseTripOverlay() { return false; }
export async function isTripOverlayEnabled() { return false; }
export async function setTripOverlayEnabled(_enabled: boolean) { return false; }
export async function requestTripOverlayPermission() { return false; }
