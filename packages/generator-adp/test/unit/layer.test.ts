import { jest } from '@jest/globals';

const mockIsInternalFeaturesSettingEnabled = jest.fn();

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: mockIsInternalFeaturesSettingEnabled
}));

const { FlexLayer } = await import('@sap-ux/adp-tooling');
const { getFlexLayer } = await import('../../src/app/layer');

describe('getFlexLayer', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should return FlexLayer.VENDOR if internal usage is true', async () => {
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);

        const layer = await getFlexLayer();

        expect(layer).toBe(FlexLayer.VENDOR);
    });

    it('should return FlexLayer.CUSTOMER_BASE if internal usage is false', async () => {
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);

        const layer = await getFlexLayer();

        expect(layer).toBe(FlexLayer.CUSTOMER_BASE);
    });
});
