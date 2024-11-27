import { AdaptationProjectType } from '@sap-ux/axios-extension';
import * as serviceProviderUtils from '../../src/service-provider-utils';
import { isCloudPackage } from '../../src/prompts/validators';
import { ToolsLogger } from '@sap-ux/logger';
import { t } from '../../src/utils/i18n';

jest.mock('../../src/service-provider-utils', () => ({
    getSystemInfo: jest.fn()
}));

describe('Test validators', () => {
    const packageName = 'ZPACKAGE';
    const logger = new ToolsLogger();
    const systemConfig = {
        url: 'https://mock.url.target1.com',
        client: '000'
    };
    it('should return true when package is cloud', async () => {
        jest.spyOn(serviceProviderUtils, 'getSystemInfo').mockResolvedValueOnce({
            adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY],
            activeLanguages: []
        });
        const result = await isCloudPackage(packageName, systemConfig, logger);
        expect(result).toBe(true);
    });

    it('should return error message when package is not cloud', async () => {
        jest.spyOn(serviceProviderUtils, 'getSystemInfo').mockResolvedValueOnce({
            adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE],
            activeLanguages: []
        });
        const result = await isCloudPackage(packageName, systemConfig, logger);
        expect(result).toBe(t('errors.invalidCloudPackage'));
    });
});
