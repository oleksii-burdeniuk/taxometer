import TaxometerExternalDisplay from '../../modules/taxometer-external-display';
import { getTripHomeWidgetIdleCopy, type ExternalTripSnapshot } from '@/lib/external-trip';
import type { Language } from '@/types';

export async function startExternalTripDisplay(snapshot: ExternalTripSnapshot) {
  try {
    await TaxometerExternalDisplay.startAsync(JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export async function updateExternalTripDisplay(snapshot: ExternalTripSnapshot) {
  try { await TaxometerExternalDisplay.updateAsync(JSON.stringify(snapshot)); } catch {}
}

export async function endExternalTripDisplay(_language?: Language) {
  const language = _language ?? 'en';
  const idle = JSON.stringify({
    active: false,
    idle: getTripHomeWidgetIdleCopy(language),
    openUrl: 'taxometer://',
  });
  try { await TaxometerExternalDisplay.stopAsync(idle); } catch {}
}

export async function canUseTripOverlay() {
  try { return await TaxometerExternalDisplay.canDrawOverlaysAsync(); } catch { return false; }
}

export async function isTripOverlayEnabled() {
  try { return await TaxometerExternalDisplay.isOverlayEnabledAsync(); } catch { return false; }
}

export async function setTripOverlayEnabled(enabled: boolean) {
  try { await TaxometerExternalDisplay.setOverlayEnabledAsync(enabled); return true; } catch { return false; }
}

export async function requestTripOverlayPermission() {
  try { await TaxometerExternalDisplay.requestOverlayPermissionAsync(); return true; } catch { return false; }
}
