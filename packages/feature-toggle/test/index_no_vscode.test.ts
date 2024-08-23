import { isFeatureEnabled, isInternalFeaturesSettingEnabled } from '../src';

describe('Feature Toggle Tests - ENV', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.doMock('vscode', () => undefined);
    });
    test('Feature Toggle Tests - getFeatureToggle - enabled', () => {
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle,otherToggle';
        const featureToggle = isFeatureEnabled(`otherToggle`);
        expect(featureToggle).toBeTruthy();
    });
    test('Feature Toggle Tests - getFeatureToggle - enabled', () => {
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle';
        const featureToggle = isFeatureEnabled(`dummy.testToggle`);
        expect(featureToggle).toBeTruthy();
    });

    test('Feature Toggle Tests - isInternalFeaturesSettingEnabled - enabled', () => {
        process.env.TOOLSUITE_INTERNAL = 'true';
        const isInternal = isInternalFeaturesSettingEnabled();
        expect(isInternal).toBeTruthy();
    });
});

describe('Feature Toggle Tests - ENV - Negative', () => {
    beforeEach(() => {
        jest.dontMock('vscode');
        jest.resetModules();
    });
    test('Feature Toggle Tests - getFeatureToggle - notEnabled', () => {
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle,otherToggle';
        const featureToggle = isFeatureEnabled(`otherToggleNotDefined`);
        expect(featureToggle).toBeFalsy();
    });
    test('Feature Toggle Tests - isInternalFeaturesSettingEnabled - notEnabled', () => {
        process.env.TOOLSUITE_INTERNAL = 'false';
        const isInternal = isInternalFeaturesSettingEnabled();
        expect(isInternal).toBeFalsy();
    });
    test('Feature Toggle Tests - isInternalFeaturesSettingEnabled - notEnabled', () => {
        const isInternal = isInternalFeaturesSettingEnabled();
        expect(isInternal).toBeFalsy();
    });
});
