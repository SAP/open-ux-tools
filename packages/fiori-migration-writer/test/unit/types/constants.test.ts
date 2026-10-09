import {
    ODataVersion,
    DatasourceType,
    SapUxLayer,
    CapType,
    ApiHubType,
    SapSystemSourceType,
    neoAppJsonRouteTargetTypes,
    TemplateDataKey,
    sapWattCommonSetting
} from '../../../src/types/constants.js';

describe('Constants', () => {
    describe('ODataVersion', () => {
        test('should have v2 version', () => {
            expect(ODataVersion.v2).toBe('2');
        });

        test('should have v4 version', () => {
            expect(ODataVersion.v4).toBe('4');
        });
    });

    describe('DatasourceType', () => {
        test('should have FILE type', () => {
            expect(DatasourceType.FILE).toBe('File');
        });

        test('should have URL type', () => {
            expect(DatasourceType.URL).toBe('OData Url');
        });

        test('should have CAP type', () => {
            expect(DatasourceType.CAP).toBe('Local Cap');
        });

        test('should have SAP_SYSTEM type', () => {
            expect(DatasourceType.SAP_SYSTEM).toBe('SAP System');
        });

        test('should have API_HUB type', () => {
            expect(DatasourceType.API_HUB).toBe('SAP Business Accelerator Hub');
        });

        test('should have MTA_FILE type', () => {
            expect(DatasourceType.MTA_FILE).toBe('MTA File');
        });

        test('should have NONE type', () => {
            expect(DatasourceType.NONE).toBe('None');
        });
    });

    describe('SapUxLayer', () => {
        test('should have VENDOR layer', () => {
            expect(SapUxLayer.VENDOR).toBe('VENDOR');
        });

        test('should have CUSTOMER_BASE layer', () => {
            expect(SapUxLayer.CUSTOMER_BASE).toBe('CUSTOMER_BASE');
        });
    });

    describe('CapType', () => {
        test('should have NODE_JS type', () => {
            expect(CapType.NODE_JS).toBe('Node.js');
        });

        test('should have JAVA type', () => {
            expect(CapType.JAVA).toBe('Java');
        });
    });

    describe('ApiHubType', () => {
        test('should have apiHub type', () => {
            expect(ApiHubType.apiHub).toBe('API_HUB');
        });

        test('should have apiHubEnterprise type', () => {
            expect(ApiHubType.apiHubEnterprise).toBe('API_HUB_ENTERPRISE');
        });
    });

    describe('SapSystemSourceType', () => {
        test('should have SCP type', () => {
            expect(SapSystemSourceType.SCP).toBe('SCP');
        });

        test('should have ON_PREM type', () => {
            expect(SapSystemSourceType.ON_PREM).toBe('ON_PREM');
        });

        test('should have S4HC type', () => {
            expect(SapSystemSourceType.S4HC).toBe('S4HC');
        });
    });

    describe('neoAppJsonRouteTargetTypes', () => {
        test('should have application type', () => {
            expect(neoAppJsonRouteTargetTypes.application).toBe('application');
        });

        test('should have destination type', () => {
            expect(neoAppJsonRouteTargetTypes.destination).toBe('destination');
        });
    });

    describe('TemplateDataKey', () => {
        test('should have project key', () => {
            expect(TemplateDataKey.project).toBe('project');
        });

        test('should have service key', () => {
            expect(TemplateDataKey.service).toBe('service');
        });

        test('should have ui5Yaml key', () => {
            expect(TemplateDataKey.ui5Yaml).toBe('ui5Yaml');
        });

        test('should have packageJson key', () => {
            expect(TemplateDataKey.packageJson).toBe('packageJson');
        });
    });

    describe('sapWattCommonSetting', () => {
        test('should have correct value', () => {
            expect(sapWattCommonSetting).toBe('sap.watt.common.setting');
        });
    });
});
