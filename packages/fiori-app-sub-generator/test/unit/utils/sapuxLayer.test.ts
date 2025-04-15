import { assignSapUxLayerValue } from '../../../src/utils/sapuxLayer';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';

jest.mock('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: jest.fn()
}));

describe('sapuxLayer - assignSapUxLayerValue', () => {
    let mockIsInternalFeaturesEnabled: jest.Mock;

    beforeEach(() => {
        mockIsInternalFeaturesEnabled = isInternalFeaturesSettingEnabled as jest.Mock;
    });

    test('should return undefined for CAP projects', () => {
        expect(assignSapUxLayerValue(true)).toBeUndefined();
    });

    test('should return VENDOR when internal features are enabled for EDMXBackend', () => {
        mockIsInternalFeaturesEnabled.mockReturnValueOnce(true);
        expect(assignSapUxLayerValue(false)).toEqual('VENDOR');
    });

    test('should return CUSTOMER_BASE when internal features are disabled for EDMXBackend', () => {
        mockIsInternalFeaturesEnabled.mockReturnValueOnce(false);
        expect(assignSapUxLayerValue(false)).toEqual('CUSTOMER_BASE');
    });
});
