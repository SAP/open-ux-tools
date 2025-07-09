import { t } from '../../../src/utils/i18n';
import { transformExtState } from '../../../src/app-headless/transforms';
import type { FFAppConfig } from '../../../src/types';
import {
    appConfigInvalidCapServiceName,
    appConfigInvalidEdmx,
    appConfigNotSupportedVersion,
    appConfigDest
} from './test-data/testHeadlessAppConfigs';

/**
 * Most coverage is achieved via the @sap/fiori-elements-generator integration tests currently.
 *
 */
describe('Test headless', () => {
    test('Test headless validation exceptions', () => {
        expect(() => {
            transformExtState(appConfigNotSupportedVersion as FFAppConfig);
        }).toThrow(t('error.appConfigVersion', { versions: '0.2' }));

        expect(() => {
            transformExtState(appConfigInvalidEdmx as FFAppConfig);
        }).toThrow(t('error.appConfigUnparseableEdmx'));

        expect(() => {
            transformExtState(appConfigInvalidCapServiceName as unknown as FFAppConfig);
        }).toThrow(t('error.appConfigMissingRequiredProperty', { propertyName: 'capService.serviceName' }));

        // Should include destination name if specified but not `ConnectedSystem`
        expect(transformExtState(appConfigDest as unknown as FFAppConfig)).toEqual({
            floorplan: 'basic',
            project: {
                description: 'An SAP Fiori application.',
                enableCodeAssist: false,
                enableEslint: false,
                enableTypeScript: false,
                flpAppId: '',
                localUI5Version: '1.88.1',
                name: 'simple',
                namespace: '',
                sapux: false,
                skipAnnotations: false,
                targetFolder:
                    '/Users/Projects/tools-suite/packages/app-generator/fiori-freestyle/test/test-output/app-headless-test',
                title: 'App Title',
                ui5Theme: 'sap_fiori_3',
                ui5Version: '1.88.1'
            },
            service: {
                client: undefined,
                destinationName: 'SomeDestinationName',
                edmx: expect.stringContaining(
                    '<?xml version="1.0" encoding="utf-8" ?><edmx:DataServices m:DataServiceVersion="2.0"></edmx:DataServices><edmx:Edmx Version="1.0"'
                ),
                host: undefined,
                servicePath: undefined,
                source: 'sapSystem',
                version: '2'
            },
            viewName: 'view1'
        });
    });
});
