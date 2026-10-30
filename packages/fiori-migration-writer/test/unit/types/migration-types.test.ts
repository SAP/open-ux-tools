import {
    ApiHubType,
    CapType,
    DatasourceType,
    neoAppJsonRouteTargetTypes,
    ODataVersion,
    SapSystemSourceType,
    TemplateDataKey
} from '../../../src/migration-types.js';

describe('migration type constants', () => {
    it('preserves the public OData values', () => {
        expect(ODataVersion).toEqual({ v2: '2', v4: '4' });
        // SapUxLayer const was removed - it's now just a type alias to UI5FlexLayer
        // Tests for the values moved to constants.test.ts using string literals
    });

    it('preserves datasource and route target values', () => {
        expect(DatasourceType).toEqual({
            FILE: 'File',
            URL: 'OData Url',
            CAP: 'Local Cap',
            SAP_SYSTEM: 'SAP System',
            API_HUB: 'SAP Business Accelerator Hub',
            MTA_FILE: 'MTA File',
            NONE: 'None'
        });
        expect(neoAppJsonRouteTargetTypes).toEqual({ application: 'application', destination: 'destination' });
    });

    it('preserves template, API Hub, and SAP system values', () => {
        expect(TemplateDataKey).toEqual({
            project: 'project',
            service: 'service',
            ui5Yaml: 'ui5Yaml',
            packageJson: 'packageJson'
        });
        // CapType const was removed - it's now just a type alias to CapRuntime
        // Tests for the values moved to constants.test.ts using string literals
        expect(ApiHubType).toEqual({ apiHub: 'API_HUB', apiHubEnterprise: 'API_HUB_ENTERPRISE' });
        expect(SapSystemSourceType).toEqual({
            SCP: 'SCP',
            ON_PREM: 'ON_PREM',
            S4HC: 'S4HC'
        });
    });
});
