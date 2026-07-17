import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { formatDuration, formatMoney, getTripFareBreakdown } from '@/lib/meter';
import { Trip } from '@/types';

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);

export type ReceiptLabels = {
  receipt: string; rideReceipt: string; receiptNumber: string; started: string; finished: string;
  tariff: string; distance: string; time: string; waiting: string; total: string;
  baseCharge: string; distanceCharge: string; waitingCharge: string; minimumAdjustment: string;
  includedAllowance: string; meteredFare: string; agreedFare: string; discount: string;
  pickupAddress: string; dropoffAddress: string; fixedPriceRide: string;
  thankYou: string; notFiscal: string;
};

export async function createReceipt(trip: Trip, locale: string, labels: ReceiptLabels) {
  const start = new Date(trip.startedAt);
  const end = new Date(trip.endedAt ?? trip.startedAt);
  const duration = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const fare = getTripFareBreakdown(trip);
  const isMeteredRide = trip.meterEnabled !== false;
  const money = (value: number) => escapeHtml(formatMoney(value, trip.tariff.currency, locale));
  const segments = trip.tariffSegments ?? [];
  const tariffNames = segments.map((segment) => segment.tariff.name);
  const distanceDetail = segments.length
    ? segments.filter((segment) => segment.chargedDistanceMeters > 0).map((segment) => `${escapeHtml(segment.tariff.name)}: ${(segment.chargedDistanceMeters / 1000).toFixed(2)} km × ${money(segment.tariff.pricePerKm)}`).join(' · ')
    : `${fare.tariffDistanceKm.toFixed(2)} km × ${money(trip.tariff.pricePerKm)}`;
  const waitingDetail = segments.length
    ? segments.filter((segment) => segment.waitingSeconds > 0).map((segment) => `${escapeHtml(segment.tariff.name)}: ${(segment.waitingSeconds / 60).toFixed(1)} min × ${money(segment.tariff.waitingPerMinute)}`).join(' · ')
    : `${fare.waitingMinutes.toFixed(1)} min × ${money(trip.tariff.waitingPerMinute)}`;
  const number = escapeHtml(trip.id.slice(-8).toUpperCase());
  const barcode = trip.id.replace(/[^a-z0-9]/gi, '').slice(-22).split('').map((char, index) => {
    const width = (char.charCodeAt(0) + index) % 3 + 1;
    return `<i style="width:${width}px"></i>`;
  }).join('');
  const minimumRow = fare.minimumAdjustment > 0
    ? `<div class="line"><span>${escapeHtml(labels.minimumAdjustment)}</span><b>${money(fare.minimumAdjustment)}</b></div>`
    : '';
  const allowanceRow = fare.includedAllowance > 0
    ? `<div class="line"><span>${escapeHtml(labels.includedAllowance)}</span><b>−${money(fare.includedAllowance)}</b></div>`
    : '';
  const meteredTotal = trip.meteredTotal ?? trip.total;
  const adjustedPriceRows = `${isMeteredRide && (trip.agreedFare !== undefined || (trip.discountAmount ?? 0) > 0)
    ? `<div class="line emphasis"><span>${escapeHtml(labels.meteredFare)}</span><b>${money(meteredTotal)}</b></div>`
    : ''}${trip.agreedFare !== undefined
    ? `<div class="line emphasis"><span>${escapeHtml(labels.agreedFare)}</span><b>${money(trip.agreedFare)}</b></div>`
    : ''}${(trip.discountAmount ?? 0) > 0
    ? `<div class="line discount"><span>${escapeHtml(labels.discount)}${trip.discountPercent !== undefined ? ` (${trip.discountPercent}%)` : ''}</span><b>−${money(trip.discountAmount ?? 0)}</b></div>`
    : ''}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
  @page{margin:0}*{box-sizing:border-box}body{margin:0;background:#ececec;color:#17191c;font-family:"Courier New",monospace;padding:28px}.paper{width:370px;max-width:100%;margin:auto;background:#fff;padding:34px 28px;box-shadow:0 8px 30px rgba(0,0,0,.10)}.brand{text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:24px;font-weight:900;letter-spacing:-1px}.brand-mark{display:inline-block;background:#ffcc00;border-radius:10px;padding:7px 10px;margin-right:7px}.kind{text-align:center;font-size:13px;font-weight:700;letter-spacing:2px;margin-top:12px}.muted{text-align:center;color:#666;font-size:11px;margin-top:5px}.cut{border:0;border-top:1px dashed #777;margin:22px 0}.meta{font-size:12px;line-height:1.8}.meta-row,.line,.total{display:flex;justify-content:space-between;gap:16px}.meta-row b,.line b{text-align:right}.line{font-size:12px;padding:6px 0}.line.emphasis{font-weight:700}.line.discount b{color:#b42318}.detail{color:#666;font-size:10px;padding:0 0 7px}.total{align-items:flex-end;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-weight:800}.total strong{font-size:27px;letter-spacing:-1px}.thanks{text-align:center;font-weight:700;font-size:13px;margin-top:23px}.fiscal{text-align:center;color:#777;font-size:9px;margin-top:6px}.barcode{height:34px;display:flex;align-items:stretch;justify-content:center;gap:2px;margin:22px auto 5px}.barcode i{display:block;background:#17191c}.barcode-number{text-align:center;font-size:9px;letter-spacing:3px}.summary{display:flex;justify-content:space-between;text-align:center;font-size:10px}.summary b{display:block;font-size:13px;margin-bottom:3px}@media print{body{background:#fff;padding:0}.paper{box-shadow:none;width:100%}}</style></head><body><main class="paper">
  <div class="brand"><span class="brand-mark">T</span>TAXOMETER</div>
  <div class="kind">${escapeHtml(labels.rideReceipt)}</div>
  <div class="muted">${escapeHtml(labels.receiptNumber)} #${number}</div>
  <hr class="cut">
  <section class="meta">
    <div class="meta-row"><span>${escapeHtml(labels.started)}</span><b>${escapeHtml(start.toLocaleString(locale))}</b></div>
    <div class="meta-row"><span>${escapeHtml(labels.finished)}</span><b>${escapeHtml(end.toLocaleString(locale))}</b></div>
    <div class="meta-row"><span>${escapeHtml(isMeteredRide ? labels.tariff : labels.fixedPriceRide)}</span><b>${escapeHtml(isMeteredRide ? (tariffNames.length ? tariffNames : [trip.tariff.name]).join(' → ') : labels.agreedFare)}</b></div>
    ${trip.pickupAddress ? `<div class="meta-row"><span>${escapeHtml(labels.pickupAddress)}</span><b>${escapeHtml(trip.pickupAddress)}</b></div>` : ''}
    ${trip.dropoffAddress ? `<div class="meta-row"><span>${escapeHtml(labels.dropoffAddress)}</span><b>${escapeHtml(trip.dropoffAddress)}</b></div>` : ''}
  </section>
  <hr class="cut">
  <div class="summary">${isMeteredRide ? `<span><b>${(trip.distanceMeters / 1000).toFixed(2)} km</b>${escapeHtml(labels.distance)}</span>` : ''}<span><b>${formatDuration(duration)}</b>${escapeHtml(labels.time)}</span>${isMeteredRide ? `<span><b>${formatDuration(trip.waitingSeconds)}</b>${escapeHtml(labels.waiting)}</span>` : ''}</div>
  <hr class="cut">
  ${isMeteredRide ? `<div class="line"><span>${escapeHtml(labels.baseCharge)}</span><b>${money(fare.baseCharge)}</b></div>
  <div class="line"><span>${escapeHtml(labels.distanceCharge)}</span><b>${money(fare.distanceCharge)}</b></div>
  <div class="detail">${distanceDetail}</div>
  <div class="line"><span>${escapeHtml(labels.waitingCharge)}</span><b>${money(fare.waitingCharge)}</b></div>
  <div class="detail">${waitingDetail}</div>
  ${allowanceRow}${minimumRow}` : ''}${adjustedPriceRows}<hr class="cut">
  <div class="total"><span>${escapeHtml(labels.total).toUpperCase()}</span><strong>${money(trip.total)}</strong></div>
  <div class="barcode">${barcode}</div><div class="barcode-number">${number}</div>
  <div class="thanks">${escapeHtml(labels.thankYou)}</div><div class="fiscal">${escapeHtml(labels.notFiscal)}</div>
  </main></body></html>`;

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: labels.receipt });
  }
}
