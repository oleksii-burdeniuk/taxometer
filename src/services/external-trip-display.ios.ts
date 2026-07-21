import TripLiveActivity from '@/widgets/trip-live-activity';
import TripHomeWidget, { type TripHomeWidgetProps } from '@/widgets/trip-home-widget';
import { getTripHomeWidgetIdleCopy, type ExternalTripSnapshot } from '@/lib/external-trip';
import type { Language } from '@/types';

let lastWidgetUpdateAt = 0;
let lastWidgetState = '';

function updateHomeWidget(snapshot: ExternalTripSnapshot, force = false) {
  const state = [snapshot.tripId, snapshot.status, snapshot.amountText, snapshot.distanceText, snapshot.durationText, snapshot.tariffName].join('|');
  const now = Date.now();
  if (!force && state === lastWidgetState) return;
  if (!force && now - lastWidgetUpdateAt < 5_000) return;
  const props: TripHomeWidgetProps = {
    active: true,
    snapshot,
    idle: getTripHomeWidgetIdleCopy('en'),
    openUrl: snapshot.openUrl,
    updatedAtMs: now,
  };
  try {
    TripHomeWidget.updateSnapshot(props);
    lastWidgetState = state;
    lastWidgetUpdateAt = now;
  } catch {}
}

function setHomeWidgetIdle(language: Language) {
  const now = Date.now();
  try {
    TripHomeWidget.updateSnapshot({
      active: false,
      idle: getTripHomeWidgetIdleCopy(language),
      openUrl: 'taxometer://',
      updatedAtMs: now,
    });
    lastWidgetState = 'idle';
    lastWidgetUpdateAt = now;
  } catch {}
}

export async function startExternalTripDisplay(snapshot: ExternalTripSnapshot) {
  try {
    updateHomeWidget(snapshot, true);
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
    updateHomeWidget(snapshot);
    await Promise.all(TripLiveActivity.getInstances().map((instance) => instance.update(snapshot)));
  } catch {}
}

export async function endExternalTripDisplay(language: Language = 'en') {
  try {
    setHomeWidgetIdle(language);
    await Promise.all(TripLiveActivity.getInstances().map((instance) => instance.end('immediate')));
  } catch {}
}

export async function canUseTripOverlay() { return false; }
export async function isTripOverlayEnabled() { return false; }
export async function setTripOverlayEnabled(_enabled: boolean) { return false; }
export async function requestTripOverlayPermission() { return false; }
