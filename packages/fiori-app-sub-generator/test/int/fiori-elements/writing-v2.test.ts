import '@sap-ux/jest-file-matchers';
import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { readdirSync } from 'node:fs';
import cloneDeep from 'lodash/cloneDeep';
import { join } from 'node:path';
import type { Project, Service, State } from '../../../src/types';
import { ApiHubType, FloorplanFE } from '../../../src/types';
import {
    cleanTestDir,
    getTestData,
    getTestDir,
    ignoreMatcherOpts,
    originalCwd,
    runWritingPhaseGen
} from '../test-utils';
import { baseTestProject, getExpectedOutputPath, v2EntityConfig, v2Service } from './test-utils';
import { url } from 'node:inspector';

jest.mock('@sap-ux/fiori-generator-shared', () => {
    const fioriGenShared = jest.requireActual('@sap-ux/fiori-generator-shared');
    return {
        ...fioriGenShared,
        sendTelemetry: jest.fn()
    };
});

describe('Generate v2 apps', () => {
    let testProjectName: string;
    const testDir: string = getTestDir('generate_v2');
    const v2Project: Partial<Project> = cloneDeep({
        ...baseTestProject(testDir)
    });
    const fixturesPath = join(__dirname, './fixtures');

    beforeAll(() => {
        console.warn = () => {}; // Suppress warning messages from generator caching
        console.log(`Removing test output folder: ${testDir}`);
        cleanTestDir(testDir);
    });

    afterAll(() => {
        // Remove the test folder if the folder is empty (i.e. no failed tests)
        try {
            if (readdirSync(testDir).length === 0) {
                console.log(`Removing test output folder: ${testDir}`);
                cleanTestDir(testDir);
            }
            console.log(`Restoring cwd: ${originalCwd}`);
            process.chdir(originalCwd);
            // eslint-disable-next-line no-empty
        } catch {}
    });

    it('LROP v2 - URL', async () => {
        testProjectName = 'lrop_v2';

        const testState: State = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: v2Service,
            entityRelatedConfig: v2EntityConfig
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v2 - destination', async () => {
        testProjectName = 'lrop_v2_dest';

        const destService: Service = {
            localEdmxFilePath: '',
            serviceId: 'ABCD_MOCKSERVICE_O2',
            servicePath: v2Service.servicePath,
            version: v2Service.version,
            host: v2Service.host!,
            edmx: v2Service.edmx!,
            destinationName: 'mta-U1Y010-noauth-010',
            source: DatasourceType.projectSpecificDestination,
            annotations: v2Service.annotations
        };

        const testState: Partial<State> = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: destService,
            entityRelatedConfig: v2EntityConfig,
            appGenInfo: {
                externalParameters: {
                    'abapCSN': {
                        services: [
                            { type: 'abapCSN', runtimeName: 'ABCD_MockService_O1', csnServiceName: 'MockService' },
                            { type: 'abapCSN', runtimeName: 'ABCD_MockService_O2', csnServiceName: 'MockService2' },
                            { type: 'abapCSN', runtimeName: 'ABCD_MockService_O3', csnServiceName: 'MockService3' }
                        ],
                        csnName: 'MOCKCSN55.abap.csn',
                        packageUri: 'abapfs:/BAS_DEST/MOCK_CSN_TEST1'
                    }
                }
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v2 - destination auth type SAML_ASSERTION', async () => {
        testProjectName = 'lrop_v2_dest_saml_assertion';

        const destService: Service = {
            localEdmxFilePath: '',
            servicePath: v2Service.servicePath,
            version: v2Service.version,
            host: v2Service.host!,
            edmx: v2Service.edmx!,
            destinationName: 'mock_saml_assertion_dest',
            destinationAuthType: 'SAMLAssertion',
            source: DatasourceType.sapSystem,
            annotations: v2Service.annotations
        };

        const testState: State = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: destService,
            entityRelatedConfig: v2EntityConfig
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v2 - metadata file', async () => {
        testProjectName = 'lrop_v2_file';

        const testState: State = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: Object.assign({}, v2Service, {
                edmx: v2Service.edmx,
                source: DatasourceType.metadataFile,
                servicePath: undefined,
                client: undefined,
                host: undefined,
                localEdmxFilePath: '/some/file/path/SEPMRA_PROD_MAN$metadata.xml',
                annotations: undefined
            }),
            entityRelatedConfig: v2EntityConfig
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v2 - SAP System', async () => {
        testProjectName = 'lrop_v2_sap_system';

        const testState: Partial<State> = {
            project: Object.assign({}, v2Project, {
                name: testProjectName,
                enableVirtualEndpoints: true
            }) as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: Object.assign({}, v2Service, {
                edmx: v2Service.edmx,
                source: DatasourceType.sapSystem,
                connectedSystem: {
                    backendSystem: {
                        url: 'https://abap.cloud.host',
                        serviceKeys: 'aServiceKey',
                        authenticationType: 'reentranceTicket',
                        name: 'aSystemName',
                        systemType: 'AbapCloud',
                        connectionType: 'abap_catalog'
                    }
                },
                host: 'https://abap.cloud.host',
                client: undefined,
                annotations: undefined
            } as Partial<Service>),
            entityRelatedConfig: v2EntityConfig
        };

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v2 - API HUB', async () => {
        testProjectName = 'lrop_v2_api_hub';

        const testState: State = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: Object.assign({}, v2Service, {
                edmx: v2Service.edmx,
                source: DatasourceType.businessHub,
                host: 'https://abap.cloud.host',
                apiHubConfig: {
                    apiHubKey: '*thisisnotarealapihubkey*',
                    apiHubType: ApiHubType.apiHubEnterprise
                },
                annotations: undefined
            }),
            entityRelatedConfig: v2EntityConfig
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('ALP v2', async () => {
        testProjectName = 'alp_v2';

        // ALP requires specific entity relationships so using a specific service
        const alpService: Service = {
            servicePath: '/sap/opu/odata/sap/SEPMRA_ALP_SO_ANA_SRV',
            host: 'https://sap-ux-mock-services-v2-alp.cfapps.us10.hana.ondemand.com',
            version: OdataVersion.v2,
            edmx: getTestData(fixturesPath, 'sepmra_so_ana_alp_v2', 'metadata'),
            annotations: [
                {
                    TechnicalName: 'SEPMRA_ALP_SO_ANA_SRV',
                    Definitions: getTestData(fixturesPath, 'sepmra_so_ana_alp_v2', 'annotations'),
                    Version: '2.0',
                    Uri: ''
                }
            ],
            source: DatasourceType.odataServiceUrl
        };

        const testState: State = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_ALP,
            service: alpService,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'SEPMRA_C_ALP_SlsOrdItemCubeALPResults',
                    entitySetType: 'SEPMRA_ALP_SO_ANA_SRV.SEPMRA_C_ALP_SlsOrdItemCubeALPResult'
                },
                navigationEntity: {
                    entitySetName: 'SEPMRA_C_ALP_SalesOrderItem',
                    navigationPropertyName: 'to_SalesOrderItem'
                },
                tableType: 'GridTable',
                presentationQualifier: 'DefaultVariant',
                tableMultiSelect: true,
                tableAutoHide: true,
                tableSelectionMode: 'None',
                smartVariantManagement: true
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));

        // Ensure writing success without alpOptions, no options will be written
        delete testState.entityRelatedConfig?.presentationQualifier;
        delete testState.entityRelatedConfig?.tableMultiSelect;
        delete testState.entityRelatedConfig?.tableAutoHide;
        delete testState.entityRelatedConfig?.tableSelectionMode;
        delete testState.entityRelatedConfig?.smartVariantManagement;
        testState.entityRelatedConfig!.tableType = undefined;

        testProjectName = `${testProjectName}_no_opts`;
        testState.project!.name = testProjectName;

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('OVP v2', async () => {
        testProjectName = 'ovp_v2';

        const ovpService: Service = {
            servicePath: '/sap/opu/odata/sap/GWSAMPLE_BASIC',
            host: 'https://sap-ux-mock-services-v2-ovp.cfapps.us10.hana.ondemand.com',
            version: OdataVersion.v2,
            edmx: getTestData(fixturesPath, 'gwsample_basic_v2', 'metadata'),
            annotations: [
                {
                    TechnicalName: 'GWSAMPLE_BASIC',
                    Definitions: getTestData(fixturesPath, 'gwsample_basic_v2', 'annotations'),
                    Version: '2.0',
                    Uri: ''
                }
            ],
            source: DatasourceType.odataServiceUrl
        };

        const testState: State = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_OVP,
            service: ovpService,
            entityRelatedConfig: {
                filterEntitySet: {
                    entitySetName: 'GlobalFilters',
                    entitySetType: 'GlobalFilters'
                }
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('Worklist v2', async () => {
        testProjectName = 'worklist_v2';

        const testState: State = cloneDeep({
            project: Object.assign({}, v2Project, {
                name: testProjectName
            }) as Project,
            floorplan: FloorplanFE.FE_WORKLIST,
            service: {
                ...v2Service,
                client: undefined,
                ignoreCertError: true,
                previewSettings: {
                    scp: true
                }
            },
            entityRelatedConfig: v2EntityConfig
        });

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });
});
