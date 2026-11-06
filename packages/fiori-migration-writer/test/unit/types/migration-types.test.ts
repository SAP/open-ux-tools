import {
    CapType,
    DatasourceType,
    neoAppJsonRouteTargetTypes,
    SapSystemSourceType,
    TemplateDataKey
} from '../../../src/migration-types.js';

describe('migration type constants', () => {
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

    it('preserves template, CAP, API Hub, and SAP system values', () => {
        expect(TemplateDataKey).toEqual({
            project: 'project',
            service: 'service',
            ui5Yaml: 'ui5Yaml',
            packageJson: 'packageJson'
        });
        expect(CapType).toEqual({ NODE_JS: 'Node.js', JAVA: 'Java' });
        expect(SapSystemSourceType).toEqual({
            SCP: 'SCP',
            ON_PREM: 'ON_PREM',
            S4HC: 'S4HC'
        });
    });
});
