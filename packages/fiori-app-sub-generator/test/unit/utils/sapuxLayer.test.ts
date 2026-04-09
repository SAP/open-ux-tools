import { jest } from '@jest/globals';

const mockIsInternalFeaturesSettingEnabled = jest.fn();

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: mockIsInternalFeaturesSettingEnabled
}));

const { assignSapUxLayerValue } = await import('../../../src/utils/sapuxLayer');

describe('sapuxLayer - assignSapUxLayerValue', () => {
    test('should return undefined for CAP projects', () => {
        expect(assignSapUxLayerValue(true)).toBeUndefined();
    });

    test('should return VENDOR when internal features are enabled for EDMXBackend', () => {
        mockIsInternalFeaturesSettingEnabled.mockReturnValueOnce(true);
        expect(assignSapUxLayerValue(false)).toEqual('VENDOR');
    });

    test('should return CUSTOMER_BASE when internal features are disabled for EDMXBackend', () => {
        mockIsInternalFeaturesSettingEnabled.mockReturnValueOnce(false);
        expect(assignSapUxLayerValue(false)).toEqual('CUSTOMER_BASE');
    });
});
