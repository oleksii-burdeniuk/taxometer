// Re-export the native module. On web, it will be resolved to TaxometerExternalDisplayModule.web.ts
// and on native platforms to TaxometerExternalDisplayModule.ts
export { default } from './src/TaxometerExternalDisplayModule';
export * from './src/TaxometerExternalDisplay.types';
