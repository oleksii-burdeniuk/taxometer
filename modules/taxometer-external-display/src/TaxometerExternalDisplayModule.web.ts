import { registerWebModule, NativeModule } from 'expo';

import { TaxometerExternalDisplayModuleEvents } from './TaxometerExternalDisplay.types';

// TaxometerExternalDisplayModule is not available on the web platform.
class TaxometerExternalDisplayModule extends NativeModule<TaxometerExternalDisplayModuleEvents> {
  async startAsync() {}
  async updateAsync() {}
  async stopAsync() {}
  async canDrawOverlaysAsync() { return false; }
  async requestOverlayPermissionAsync() {}
  async isOverlayEnabledAsync() { return false; }
  async setOverlayEnabledAsync() {}
}

export default registerWebModule(TaxometerExternalDisplayModule, 'TaxometerExternalDisplayModule');
