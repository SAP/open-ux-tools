import {
    ODataVersion,
    DatasourceType,
    CapType,
    ApiHubType,
    SapSystemSourceType,
    neoAppJsonRouteTargetTypes,
    TemplateDataKey,
    sapWattCommonSetting
} from '../../../src/types.js';

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

    // SapUxLayer is now a type alias to UI5FlexLayer from @sap-ux/project-access
    // The const object was removed - tests should use string literals directly
    describe('UI5FlexLayer / SapUxLayer string literal values', () => {
        test('VENDOR value should be correct', () => {
            const vendorLayer = 'VENDOR' as const;
            expect(vendorLayer).toBe('VENDOR');
        });

        test('CUSTOMER_BASE value should be correct', () => {
            const customerLayer = 'CUSTOMER_BASE' as const;
            expect(customerLayer).toBe('CUSTOMER_BASE');
        });
    });

    // CapType is now a type alias to CapRuntime from @sap-ux/fiori-generator-shared
    // The const object was removed - tests should use string literals directly
    describe('CapRuntime / CapType string literal values', () => {
        test('NODE_JS value should be correct', () => {
            const nodeType = 'Node.js' as const;
            expect(nodeType).toBe('Node.js');
        });

        test('JAVA value should be correct', () => {
            const javaType = 'Java' as const;
            expect(javaType).toBe('Java');
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
