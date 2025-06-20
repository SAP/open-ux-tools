import { FlexLayer } from '@sap-ux/adp-tooling';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';

import { getFlexLayer } from '../../src/app/layer';

jest.mock('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: jest.fn()
}));

const isFeatureEnabledMock = isInternalFeaturesSettingEnabled as jest.Mock;

describe('getFlexLayer', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should return FlexLayer.VENDOR if internal usage is true', async () => {
        isFeatureEnabledMock.mockReturnValue(true);

        const layer = await getFlexLayer();

        expect(layer).toBe(FlexLayer.VENDOR);
    });

    it('should return FlexLayer.CUSTOMER_BASE if internal usage is false', async () => {
        isFeatureEnabledMock.mockReturnValue(false);

        const layer = await getFlexLayer();

        expect(layer).toBe(FlexLayer.CUSTOMER_BASE);
    });
});
