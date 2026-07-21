import assert from 'node:assert/strict';
import test from 'node:test';
import { getTaxiProfileReceiptSections, TaxiProfileReceiptLabels } from '@/lib/receipt-profile';

const labels: TaxiProfileReceiptLabels = {
  companyData: 'Company', companyName: 'Name', companyNip: 'NIP', companyAddress: 'Address', companyPhone: 'Phone', companyEmail: 'Email', companyRegistry: 'Registry',
  driverData: 'Driver', driverName: 'Name', driverIdentifier: 'ID', driverPhone: 'Phone',
  vehicleData: 'Vehicle', vehicleMake: 'Make', vehicleModel: 'Model', registrationNumber: 'Registration', vehicleVin: 'VIN', vehicleSideNumber: 'Side number',
  taxiLicense: 'Licence', licenseHolderName: 'Holder', licenseNumber: 'Number', licenseExtractNumber: 'Extract', issuingAuthority: 'Authority', licenseArea: 'Area', licenseValidUntil: 'Valid until',
};

test('groups every available taxi field for the on-screen and PDF receipt', () => {
  const sections = getTaxiProfileReceiptSections({
    companyName: 'Taxi Company', companyNip: '5260250995', companyAddress: 'Kraków', companyPhone: '+48 2', companyEmail: 'taxi@example.pl', companyRegistryType: 'KRS', companyRegistryNumber: '1',
    driverName: 'Driver', driverIdentifier: 'D-1', driverPhone: '+48 1',
    vehicleMake: 'Toyota', vehicleModel: 'Corolla', vehicleRegistrationNumber: 'KR 1', vehicleVin: 'VIN1', vehicleSideNumber: '42',
    licenseHolderName: 'Company', licenseNumber: 'L-1', licenseExtractNumber: 'E-1', licenseIssuingAuthority: 'Kraków', licenseArea: 'Kraków', licenseValidUntil: '2030',
  }, labels);
  assert.equal(sections.length, 4);
  assert.equal(sections.flatMap((section) => section.rows).length, 20);
});

test('omits empty profile groups from the receipt', () => {
  const sections = getTaxiProfileReceiptSections({ vehicleRegistrationNumber: 'KR 1' }, labels);
  assert.deepEqual(sections, [{ title: 'Vehicle', rows: [{ label: 'Registration', value: 'KR 1' }] }]);
});
