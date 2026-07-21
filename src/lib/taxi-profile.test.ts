import assert from 'node:assert/strict';
import test from 'node:test';
import { createReceiptTaxiProfile, getLicenseExpiryStatus, isValidPolishNip, normalizeTaxiProfile, resolveTaxiDataAccess } from '@/lib/taxi-profile';

test('normalizes taxi details before saving or copying to a receipt', () => {
  assert.deepEqual(normalizeTaxiProfile({
    driverName: '  Oleksii  ',
    vehicleRegistrationNumber: 'kr 1234a',
    vehicleVin: 'abc123',
    licenseNumber: '   ',
  }), {
    driverName: 'Oleksii',
    vehicleRegistrationNumber: 'KR 1234A',
    vehicleVin: 'ABC123',
    licenseNumber: undefined,
  });
});

test('captures an independent receipt snapshot only when enabled', () => {
  const profile = { driverName: 'Oleksii', vehicleRegistrationNumber: 'kr 1' };
  const snapshot = createReceiptTaxiProfile(profile, true);
  assert.deepEqual(snapshot, { driverName: 'Oleksii', vehicleRegistrationNumber: 'KR 1' });
  profile.driverName = 'Changed';
  assert.equal(snapshot?.driverName, 'Oleksii');
  assert.equal(createReceiptTaxiProfile(profile, false), undefined);
  assert.equal(createReceiptTaxiProfile({}, true), undefined);
});

test('managed mode centrally locks profile, tariffs and receipt deletion', () => {
  assert.deepEqual(resolveTaxiDataAccess({ includeOnReceipt: true, allowProfileEditing: true, allowReceiptDeletion: true, managedMode: true }), {
    canEditProfile: false,
    canManageTariffs: false,
    canDeleteReceipts: false,
  });
  assert.deepEqual(resolveTaxiDataAccess({ includeOnReceipt: true, allowProfileEditing: true, allowReceiptDeletion: false, managedMode: false }), {
    canEditProfile: true,
    canManageTariffs: true,
    canDeleteReceipts: false,
  });
});

test('validates Polish NIP checksum while allowing an empty optional field', () => {
  assert.equal(isValidPolishNip(''), true);
  assert.equal(isValidPolishNip('5260250995'), true);
  assert.equal(isValidPolishNip('5260250994'), false);
  assert.equal(isValidPolishNip('123'), false);
});

test('classifies licence expiry dates without requiring the optional field', () => {
  const now = new Date(2026, 6, 21);
  assert.equal(getLicenseExpiryStatus(undefined, now), null);
  assert.equal(getLicenseExpiryStatus('20.07.2026', now), 'expired');
  assert.equal(getLicenseExpiryStatus('15.08.2026', now), 'expiring');
  assert.equal(getLicenseExpiryStatus('2027-07-21', now), 'valid');
  assert.equal(getLicenseExpiryStatus('31.02.2027', now), 'invalid');
});
