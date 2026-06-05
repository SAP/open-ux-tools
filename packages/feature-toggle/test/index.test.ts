import { jest } from '@jest/globals';
import { when } from 'jest-when';

// Create a shared mock workspace object that tests can configure
const mockWorkspace = {
    getConfiguration: jest.fn()
};

// Mock vscode before importing the source module
jest.unstable_mockModule('vscode', () => ({
    workspace: mockWorkspace
}));

// Import source modules after mocking (dynamic import so mock is in place)
const { FeatureToggleAccess, FeatureToggleKey, isFeatureEnabled, isInternalFeaturesSettingEnabled, enableFeature } =
    await import('../src/index.js');

describe('Feature Toggle Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.TOOLSUITE_FEATURES;
    });

    test('Feature Toggle Tests - getFeatureToggle - disabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'someFeature' ? false : undefined;
            }
        }) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle(`dummy.test.${FeatureToggleKey}.someFeature`);
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeFalsy();
    });
    test('Feature Toggle Tests - getFeatureToggle - enabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'someFeature' ? true : undefined;
            }
        }) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle(`dummy.test.${FeatureToggleKey}.someFeature`);
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeTruthy();
    });
    test('Feature Toggle Tests - getFeatureToggle - undefined getConfiguration', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce(undefined) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle(`dummy.test.${FeatureToggleKey}.someFeature`);
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeFalsy();
    });
    test('Feature Toggle Tests - getFeatureToggle of token type - enabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'enableAppStudioGDContribution'
                    ? 'c8c52f0b-0d7d-4697-997a-d6f29814f42e'
                    : undefined;
            }
        }) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle(
            `sap.ux.help.${FeatureToggleKey}.enableAppStudioGDContribution`
        );
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeTruthy();
    });

    test('Feature Toggle Tests - getAllFeatureToggles', () => {
        mockWorkspace.getConfiguration = jest.fn() as any;
        when(mockWorkspace.getConfiguration as any)
            .calledWith(`sap.ux.serviceModeler.${FeatureToggleKey}`)
            .mockReturnValueOnce({
                feature1: true,
                feature2: true,
                feature3: false,
                get: (toggleId: string) => {
                    return toggleId === 'feature1' ? true : undefined;
                }
            })
            .mockReturnValueOnce({
                feature1: true,
                feature2: true,
                feature3: false,
                get: (toggleId: string) => {
                    return toggleId === 'feature1' ? true : undefined;
                }
            })
            .mockReturnValueOnce({
                feature1: true,
                feature2: true,
                feature3: false,
                get: (toggleId: string) => {
                    return toggleId === 'feature2' ? false : undefined;
                }
            })
            .mockReturnValueOnce({
                feature1: true,
                feature2: true,
                feature3: false,
                get: (toggleId: string) => {
                    return toggleId === 'feature3' ? false : undefined;
                }
            })
            .mockReturnValue({
                feature1: true,
                feature2: true,
                feature3: false,
                get: (toggleId: string) => {
                    return toggleId === 'feature3' ? true : undefined;
                }
            });
        const featureToggles = FeatureToggleAccess.getAllFeatureToggles();
        expect(featureToggles).toBeDefined();
        expect(featureToggles[0].isEnabled).toBeTruthy();
        expect(featureToggles[1].isEnabled).toBeFalsy();
        expect(featureToggles[2].isEnabled).toBeFalsy();
        expect(featureToggles.length).toEqual(3);
    });

    test('Feature Toggle Tests - isInternalFeaturesSettingEnabled - enabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'sap.ux.internal.enableInternalFeatures' ? true : undefined;
            }
        }) as any;
        const isInternal = isInternalFeaturesSettingEnabled();
        expect(isInternal).toBeTruthy();
    });
});

describe('Feature Toggle Tests - ENV', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Feature Toggle Tests - getFeatureToggle - enabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'someFeature' ? false : undefined;
            }
        }) as any;
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle,otherToggle';
        const featureToggle = isFeatureEnabled('otherToggle');
        expect(featureToggle).toBeTruthy();
    });
    test('Feature Toggle Tests - getFeatureToggle - enabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'someFeature' ? false : undefined;
            }
        }) as any;
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle';
        const featureToggle = isFeatureEnabled('dummy.testToggle');
        expect(featureToggle).toBeTruthy();
    });
    test('Feature Toggle Tests - getFeatureToggle - enabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'someFeature' ? false : undefined;
            }
        }) as any;
        process.env.TOOLSUITE_FEATURES = undefined;
        const featureToggle = isFeatureEnabled('dummy.testToggle');
        expect(featureToggle).toBeFalsy();
    });
});

describe('Feature Toggle Tests - ENV - Negative', () => {
    test('Feature Toggle Tests - getFeatureToggle - notEnabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'someFeature' ? false : undefined;
            }
        }) as any;
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle,otherToggle';
        const featureToggle = isFeatureEnabled('otherToggleNotDefined');
        expect(featureToggle).toBeFalsy();
    });
});
describe('Feature Toggle Tests - Negative', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.TOOLSUITE_FEATURES;
    });

    test('Feature Toggle Tests - getFeatureToggle - true', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'annotationView' ? true : undefined;
            }
        }) as any;
        const featureToggle = isFeatureEnabled(`dummy.test.${FeatureToggleKey}.annotationView`);
        expect(featureToggle).toBeTruthy();
    });
    test('Feature Toggle Tests - getFeatureToggle - not defined', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'annotationView' ? false : undefined;
            }
        }) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle(`dummy.test.${FeatureToggleKey}.someFeature`);
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeFalsy();
    });
    test('Feature Toggle Tests - getFeatureToggle - not valid FeatureToggleKey', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'annotationView' ? false : undefined;
            }
        }) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle('dummy.test.NOTAFeatureToggleKey.someFeature');
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeFalsy();
    });
    test('Feature Toggle Tests - getFeatureToggle of token type - disabled - bad token', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'enableAppStudioGDContribution' ? 'cmoz123-0d7d-4697-997a-d6f29814f42e' : undefined;
            }
        }) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle(
            `sap.ux.help.${FeatureToggleKey}.enableAppStudioGDContribution`
        );
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeFalsy();
    });
    test('Feature Toggle Tests - getFeatureToggle of token type - disabled - bad value', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValueOnce({
            get: (toggleId: string) => {
                return toggleId === 'enableAppStudioGDContribution' ? true : undefined;
            }
        }) as any;
        const featureToggle = FeatureToggleAccess.getFeatureToggle(
            `sap.ux.help.${FeatureToggleKey}.enableAppStudioGDContribution`
        );
        expect(featureToggle).toBeDefined();
        expect(featureToggle.isEnabled).toBeFalsy();
    });
});
describe('Feature Toggle Tests - enableFeature', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.TOOLSUITE_FEATURES;
    });

    test('Feature Toggle Tests - enableFeature - enabled', () => {
        mockWorkspace.getConfiguration = jest.fn().mockReturnValue({
            get: (toggleId: string) => {
                return toggleId === 'someFeature' ? true : false;
            }
        }) as any;
        process.env.TOOLSUITE_FEATURES = 'dummy.testToggle';
        expect(isFeatureEnabled('dummy.testToggle')).toBe(true);
        expect(isFeatureEnabled(`someModule.${FeatureToggleKey}.someFeature`)).toBe(true);
        expect(isFeatureEnabled('dummy.anotherTestToggle')).toBe(false);
        enableFeature('dummy.anotherTestToggle');
        expect(isFeatureEnabled('dummy.anotherTestToggle')).toBe(true);
        // Add again
        enableFeature('dummy.anotherTestToggle');
        expect(isFeatureEnabled('dummy.anotherTestToggle')).toBe(true);
        expect(process.env.TOOLSUITE_FEATURES).toEqual('dummy.testToggle,dummy.anotherTestToggle');
        delete process.env.TOOLSUITE_FEATURES;
        expect(isFeatureEnabled('dummy.anotherTestToggle')).toBe(false);
        enableFeature('dummy.anotherTestToggle');
        expect(isFeatureEnabled('dummy.anotherTestToggle')).toBe(true);
    });
});
