# TestFlight release checklist

## Build configuration

- App version: `1.0.0`
- iOS bundle identifier: `com.oleksiiburdeniuk.taxometer`
- EAS profile: `production` with remote build-number auto-increment
- Export compliance: the app does not implement non-exempt encryption
- App Privacy: location and trip data stay on the device; no analytics, ads, account, or backend is used

Before the first cloud build, select the correct Expo owner and create or link the EAS project:

```bash
npx eas-cli@latest init
npx eas-cli@latest config --platform ios --profile production
npx eas-cli@latest build --platform ios --profile production
```

Create the App Store Connect app record with the same bundle identifier before submitting:

```bash
npx eas-cli@latest submit --platform ios --profile production
```

Do not run `eas init` until the intended Expo owner and final bundle identifier are confirmed. The current Expo login has access to more than one owner account.

## Suggested TestFlight information

Beta description:

> Taxometer is an offline multilingual GPS taximeter for testing Kraków tariff calculations, zone and day/night switching, trip history, and PDF receipts. It stores trip data only on the device.

What to test:

> Start a ride with the official Kraków preset. Verify the initial fee, distance/time charging around the cross-over speed, background tracking with the screen locked, pause/resume, zone I/II and day/night switching, GPS-loss warning, final summary, PDF receipt sharing, trip deletion, and all three UI/receipt languages.

Review note:

> Background location is used only while a ride is active so the app can continue calculating distance and fare when the screen is locked. No location or trip data is uploaded to a server. This is a software GPS taximeter and not a certified fiscal or metrological device.

## Real-device smoke test

1. Install the production build on a physical iPhone.
2. Start a ride and grant precise foreground and Always location permissions.
3. Lock the screen for at least 10 minutes while driving and verify that distance continues to update.
4. Pause for two minutes and confirm no time or distance is billed during the pause.
5. Resume and test zone I/II plus day/night switches; each switch must create one receipt segment.
6. Disable Location Services long enough to trigger the GPS warning; confirm billing pauses for invalid or unverified intervals.
7. Finish the ride, share the PDF receipt, relaunch the app, and verify history persistence.
8. Repeat one short ride in Ukrainian, English, and Polish and check receipt-language independence.

## App Store Connect answers

- Export compliance: No non-exempt encryption (`ITSAppUsesNonExemptEncryption = NO`).
- Data collection: none transmitted off-device by the app. Location and trip records are processed and stored locally.
- Tracking: no.
- Advertising: no.
- Location purpose: fare and distance calculation during an active ride, including while the app is in the background.
- External testers: the first external build may require TestFlight Beta App Review.

Add a real feedback email, support URL, hosted privacy-policy URL, beta screenshots, and the App Store Connect Apple ID before inviting external testers.
