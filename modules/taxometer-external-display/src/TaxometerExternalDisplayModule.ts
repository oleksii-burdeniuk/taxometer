import { NativeModule, requireNativeModule } from 'expo';

import { TaxometerExternalDisplayModuleEvents } from './TaxometerExternalDisplay.types';

declare class TaxometerExternalDisplayModule extends NativeModule<TaxometerExternalDisplayModuleEvents> {
  startAsync(snapshotJson: string): Promise<void>;
  updateAsync(snapshotJson: string): Promise<void>;
  stopAsync(idleJson?: string): Promise<void>;
  canDrawOverlaysAsync(): Promise<boolean>;
  requestOverlayPermissionAsync(): Promise<void>;
  isOverlayEnabledAsync(): Promise<boolean>;
  setOverlayEnabledAsync(enabled: boolean): Promise<void>;
}

export default requireNativeModule<TaxometerExternalDisplayModule>('TaxometerExternalDisplay');
