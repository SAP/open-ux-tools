import { t } from '../../../src/utils/i18n';
import { transformExtState } from '../../../src/app-headless/transforms';
import type { FFAppConfig } from '../../../src/types';
import {
    appConfigInvalidCapServiceName,
    appConfigInvalidEdmx,
    appConfigNotSupportedVersion
} from './test-data/testHeadlessAppConfigs';

/**
 * Most coverage is achieved via the @sap/fiori-elements-generator integration tests currently.
 *
 */
describe('Test headless', () => {
    test('Test headless validation exceptions', () => {
        expect(() => {
            transformExtState(appConfigNotSupportedVersion as FFAppConfig);
        }).toThrow(t('error.appConfigVersion', { version: '0.2' }));

        expect(() => {
            transformExtState(appConfigInvalidEdmx as FFAppConfig);
        }).toThrow(t('error.appConfigUnparseableEdmx'));

        expect(() => {
            transformExtState(appConfigInvalidCapServiceName as unknown as FFAppConfig);
        }).toThrow(t('error.appConfigMissingRequiredProperty', { propertyName: 'capService.serviceName' }));
    });
});
