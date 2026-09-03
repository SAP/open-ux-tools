// Manual mock for @sap-ux/feature-toggle

export const isInternalFeaturesSettingEnabled = jest.fn(() => false);
export const getFeatureToggleSettings = jest.fn(() => ({}));
