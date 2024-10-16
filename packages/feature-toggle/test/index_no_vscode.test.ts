import { isFeatureEnabled, isInternalFeaturesSettingEnabled, FeatureToggleAccess } from '../src';

describe('Feature Toggle Tests - ENV', () => {
    const originalEnv = { ...process.env };
    const originalVSCode = FeatureToggleAccess.vscode;

    beforeAll(() => {
        Object.defineProperty(FeatureToggleAccess, 'vscode', { value: undefined });
    });

    beforeEach(() => {
        jest.resetModules();
        jest.doMock('vscode', () => undefined);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    afterAll(() => {
        Object.defineProperty(FeatureToggleAccess, 'vscode', { value: originalVSCode });
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
    test('Feature Toggle Tests - getAllFeatureToggles', () => {
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle,otherToggle';
        const featureToggles = FeatureToggleAccess.getAllFeatureToggles();
        expect(featureToggles).toStrictEqual([
            {
                feature: 'dummy.testToggle',
                isEnabled: true
            },
            {
                feature: 'otherToggle',
                isEnabled: true
            }
        ]);
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
