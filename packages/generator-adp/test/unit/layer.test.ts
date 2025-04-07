import { isFeatureEnabled } from '@sap-devx/feature-toggle-node';

import { isAppStudio } from '@sap-ux/btp-utils';
import { FlexLayer } from '@sap-ux/adp-tooling';

import { getFlexLayer, isInternalUsage } from '../../src/app/layer';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

jest.mock('@sap-devx/feature-toggle-node', () => ({
    isFeatureEnabled: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;
const isFeatureEnabledMock = isFeatureEnabled as jest.Mock;

describe('isInternalUsage', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should return true if running in AppStudio and feature is enabled', async () => {
        mockIsAppStudio.mockReturnValue(true);
        isFeatureEnabledMock.mockReturnValue(true);

        const result = await isInternalUsage();
        expect(result).toBe(true);
        expect(isFeatureEnabled).toHaveBeenCalledWith('adaptation-project', 'internal');
    });

    it('should return false if running in AppStudio but feature is disabled', async () => {
        mockIsAppStudio.mockReturnValue(true);
        isFeatureEnabledMock.mockReturnValue(false);

        const result = await isInternalUsage();
        expect(result).toBe(false);
    });

    it('should return false if not running in AppStudio', async () => {
        mockIsAppStudio.mockReturnValue(false);
        const result = await isInternalUsage();

        expect(result).toBe(false);

        expect(isFeatureEnabled).not.toHaveBeenCalled();
    });
});

describe('getFlexLayer', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should return FlexLayer.VENDOR if internal usage is true', async () => {
        mockIsAppStudio.mockReturnValue(true);
        isFeatureEnabledMock.mockReturnValue(true);

        const layer = await getFlexLayer();

        expect(layer).toBe(FlexLayer.VENDOR);
    });

    it('should return FlexLayer.CUSTOMER_BASE if internal usage is false', async () => {
        mockIsAppStudio.mockReturnValue(false);

        const layer = await getFlexLayer();

        expect(layer).toBe(FlexLayer.CUSTOMER_BASE);
    });
});
