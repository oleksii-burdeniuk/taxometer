import { TaxiProfile } from '@/types';

export type TaxiProfileReceiptLabels = {
  companyData: string;
  companyName: string;
  companyNip: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyRegistry: string;
  driverData: string;
  driverName: string;
  driverIdentifier: string;
  driverPhone: string;
  vehicleData: string;
  vehicleMake: string;
  vehicleModel: string;
  registrationNumber: string;
  vehicleVin: string;
  vehicleSideNumber: string;
  taxiLicense: string;
  licenseHolderName: string;
  licenseNumber: string;
  licenseExtractNumber: string;
  issuingAuthority: string;
  licenseArea: string;
  licenseValidUntil: string;
};

export type TaxiProfileReceiptSection = {
  title: string;
  rows: { label: string; value: string }[];
};

export function getTaxiProfileReceiptSections(profile: TaxiProfile | undefined, labels: TaxiProfileReceiptLabels): TaxiProfileReceiptSection[] {
  if (!profile) return [];
  const section = (title: string, rows: { label: string; value?: string }[]): TaxiProfileReceiptSection | null => {
    const availableRows = rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
    return availableRows.length ? { title, rows: availableRows } : null;
  };
  return [
    section(labels.companyData, [
      { label: labels.companyName, value: profile.companyName },
      { label: labels.companyNip, value: profile.companyNip },
      { label: labels.companyRegistry, value: [profile.companyRegistryType, profile.companyRegistryNumber].filter(Boolean).join(' ') || undefined },
      { label: labels.companyAddress, value: profile.companyAddress },
      { label: labels.companyPhone, value: profile.companyPhone },
      { label: labels.companyEmail, value: profile.companyEmail },
    ]),
    section(labels.driverData, [
      { label: labels.driverName, value: profile.driverName },
      { label: labels.driverIdentifier, value: profile.driverIdentifier },
      { label: labels.driverPhone, value: profile.driverPhone },
    ]),
    section(labels.vehicleData, [
      { label: labels.vehicleMake, value: profile.vehicleMake },
      { label: labels.vehicleModel, value: profile.vehicleModel },
      { label: labels.registrationNumber, value: profile.vehicleRegistrationNumber },
      { label: labels.vehicleVin, value: profile.vehicleVin },
      { label: labels.vehicleSideNumber, value: profile.vehicleSideNumber },
    ]),
    section(labels.taxiLicense, [
      { label: labels.licenseHolderName, value: profile.licenseHolderName },
      { label: labels.licenseNumber, value: profile.licenseNumber },
      { label: labels.licenseExtractNumber, value: profile.licenseExtractNumber },
      { label: labels.issuingAuthority, value: profile.licenseIssuingAuthority },
      { label: labels.licenseArea, value: profile.licenseArea },
      { label: labels.licenseValidUntil, value: profile.licenseValidUntil },
    ]),
  ].filter((item): item is TaxiProfileReceiptSection => Boolean(item));
}
