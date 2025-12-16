import { TemplateTypeAttributes } from '@sap-ux/fiori-elements-writer';
import '@sap-ux/jest-file-matchers';
import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { copyFileSync, promises as fsPromise, mkdirSync, readdirSync } from 'node:fs';
import 'jest-extended';
import cloneDeep from 'lodash/cloneDeep';
import { join } from 'node:path';
import type { Project, Service, State } from '../../../src/types';
import { FloorplanFE } from '../../../src/types';
import {
    cleanTestDir,
    getTestData,
    getTestDir,
    ignoreMatcherOpts,
    originalCwd,
    runWritingPhaseGen
} from '../test-utils';
import { baseTestProject, getExpectedOutputPath, v4EntityConfig, v4Service } from './test-utils';

jest.mock('@sap-ux/fiori-generator-shared', () => {
    const fioriGenShared = jest.requireActual('@sap-ux/fiori-generator-shared');
    return {
        ...fioriGenShared,
        sendTelemetry: jest.fn()
    };
});

jest.mock('@sap/ux-specification', () => ({}));

describe('Generate v4 apps', () => {
    let testProjectName: string;
    let expectedOutputPath: string;
    const testDir: string = getTestDir('generate_v4');
    const fixturesPath = join(__dirname, './fixtures');
    const capAppFolder = 'app';

    beforeAll(async () => {
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

    jest.setTimeout(400000);

    it('ALP v4', async () => {
        testProjectName = 'alp_v4';
        expectedOutputPath = getExpectedOutputPath(testProjectName);
        // ALP requires specific entity relationships so using a specific service
        const alpServiceV4: Service = {
            servicePath: '/sap/opu/odata4/sap/c_salesordermanage_srv/srvd/sap/c_salesordermanage_sd_aggregate/0001/',
            host: 'https://sap-ux-mock-services-v4-alp.cfapps.us10.hana.ondemand.com',
            version: OdataVersion.v4,
            edmx: getTestData(fixturesPath, 'sales_order_manage_v4', 'metadata'),
            annotations: [],
            source: DatasourceType.odataServiceUrl
        };

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                ui5Version: '1.92.0' // ALP v4 restricted to 1.90 and above
            } as Project,
            floorplan: FloorplanFE.FE_ALP,
            service: alpServiceV4,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'SalesOrderItem',
                    entitySetType: 'SalesOrderItemType'
                },
                navigationEntity: {
                    entitySetName: 'MaterialDetails',
                    navigationPropertyName: '_MaterialDetails'
                },
                tableType: 'GridTable',
                tableSelectionMode: 'None'
            }
        });
        await runWritingPhaseGen(testState as Partial<State>);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v4 - invalid UI5 version specified', async () => {
        testProjectName = 'lrop_v4';
        expectedOutputPath = getExpectedOutputPath(testProjectName);

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                ui5Version: '1.82.2'
            } as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: v4Service,
            entityRelatedConfig: v4EntityConfig
        });

        await expect(() => runWritingPhaseGen(testState)).rejects.toThrow('ValidationError');
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v4', async () => {
        testProjectName = 'lrop_v4';
        expectedOutputPath = getExpectedOutputPath(testProjectName);

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                ui5Version: '1.84.0',
                manifestVersion: undefined // Allow default handling
            } as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: v4Service,
            entityRelatedConfig: v4EntityConfig
        });

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('FPM (v4 only)', async () => {
        testProjectName = 'fpm_v4';
        expectedOutputPath = getExpectedOutputPath(testProjectName);

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                ui5Version: TemplateTypeAttributes.fpm.minimumUi5Version['4'],
                manifestVersion: undefined // Allow default handling
            } as Project,
            floorplan: FloorplanFE.FE_FPM,
            service: v4Service,
            entityRelatedConfig: v4EntityConfig
        });
        expect(testState?.service?.edmx).toMatchSnapshot('fpm-v4-only-edmx');
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('Form Entry Object Page v4', async () => {
        testProjectName = 'form_entry_v4';
        expectedOutputPath = getExpectedOutputPath(testProjectName);

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                ui5Version: '1.90.0' // Even though the min version for FEOP is specified as 1.86 here: `MIN_UI5_VERSION_FORM_ENTRY_TEMPLATE`:'@sap/ux-ui5-info' it doesnt load.
            } as Project,
            floorplan: FloorplanFE.FE_FEOP,
            service: v4Service,
            entityRelatedConfig: v4EntityConfig
        });

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('Worklist v4', async () => {
        testProjectName = 'worklist_v4';
        expectedOutputPath = getExpectedOutputPath(testProjectName);

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                ui5Version: '1.99.0'
            } as Project,
            floorplan: FloorplanFE.FE_WORKLIST,
            service: v4Service,
            entityRelatedConfig: v4EntityConfig
        });

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('OVP v4', async () => {
        testProjectName = 'ovp_v4';

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName
            } as Project,
            floorplan: FloorplanFE.FE_OVP,
            service: v4Service,
            entityRelatedConfig: {
                filterEntitySet: {
                    entitySetName: 'Travel',
                    entitySetType: 'Travel'
                }
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
    });

    /**
     * Tests that apps generated for use within a CAP project only contain absolute ui5 lib URL references
     * including specific versions. ui5-tooling middlewares are not installed in CAP projects which are
     * otherwise used for loading libs with relative URL paths.
     *
     */
    it('LROP v4 - CAP', async () => {
        testProjectName = 'lrop_v4_cap';
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        copyFileSync(
            join(__dirname, './fixtures/cap-package-cds-dependency.json.test'),
            join(testDir, testProjectName, 'package.json')
        );
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                targetFolder: join(testDir, testProjectName, capAppFolder)
            } as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: {
                version: OdataVersion.v4,
                servicePath: '/admin/',
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    appPath: capAppFolder,
                    capType: 'Node.js'
                }
            },
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'Books',
                    entitySetType: 'BooksType'
                }
            }
        });

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(
            getExpectedOutputPath(join(testProjectName)),
            ignoreMatcherOpts
        );
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });

    /**
     * If UI5 version is not specified, set to 'Latest' or '', the default UI5 version rules should apply
     * assigning the mimimum supported ui5 version based on the floorplan and odata version.
     * This tests generation using adaptors and headless cases where a specific UI5 version is not specified.
     *
     */
    it('LROP v4 CAP - UI5 version not specified', async () => {
        testProjectName = 'lrop_v4_version_not_specified';
        expectedOutputPath = getExpectedOutputPath(join(testProjectName));
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        const sourcePackageJsonPath = join(__dirname, './fixtures/cap-package.json.test');
        const targetPackageJsonPath = join(testDir, testProjectName, 'package.json');
        copyFileSync(sourcePackageJsonPath, targetPackageJsonPath);
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                ui5Version: undefined,
                name: testProjectName,
                targetFolder: join(testDir, testProjectName, capAppFolder)
            } as unknown as Project,
            floorplan: FloorplanFE.FE_LROP,
            service: {
                version: OdataVersion.v4,
                servicePath: '/admin/',
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    appPath: capAppFolder,
                    capType: 'Node.js'
                }
            },
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'Books',
                    entitySetType: 'BooksType'
                }
            }
        });

        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });

    it('ALP v4 CAP', async () => {
        testProjectName = 'alp_v4_cap';
        expectedOutputPath = getExpectedOutputPath(join(testProjectName));
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        const sourcePackageJsonPath = join(__dirname, './fixtures/cap-package.json.test');
        const targetPackageJsonPath = join(testDir, testProjectName, 'package.json');
        copyFileSync(sourcePackageJsonPath, targetPackageJsonPath);
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                ui5Version: TemplateTypeAttributes.alp.minimumUi5Version['4'],
                name: testProjectName,
                targetFolder: join(testDir, testProjectName, capAppFolder)
            } as Project,
            service: {
                version: OdataVersion.v4,
                servicePath: '/admin/',
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    appPath: capAppFolder,
                    capType: 'Node.js'
                }
            },
            floorplan: FloorplanFE.FE_ALP,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'Books',
                    entitySetType: 'BooksType'
                },
                tableType: 'GridTable',
                presentationQualifier: '',
                tableMultiSelect: true,
                tableAutoHide: true,
                tableSelectionMode: 'None',
                smartVariantManagement: true
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });

    it('ALP v4 CAP with typescript', async () => {
        testProjectName = 'alp_v4_cap_typescript';
        expectedOutputPath = getExpectedOutputPath(join(testProjectName));
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        const sourcePackageJsonPath = join(__dirname, './fixtures/cap-package.json.test');
        const targetPackageJsonPath = join(testDir, testProjectName, 'package.json');
        copyFileSync(sourcePackageJsonPath, targetPackageJsonPath);
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                ui5Version: TemplateTypeAttributes.alp.minimumUi5Version['4'],
                name: testProjectName,
                targetFolder: join(testDir, testProjectName, capAppFolder),
                enableTypeScript: true,
                enableVirtualEndpoints: true
            } as Project,
            service: {
                version: OdataVersion.v4,
                servicePath: '/admin/',
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    appPath: capAppFolder,
                    capType: 'Node.js'
                }
            },
            floorplan: FloorplanFE.FE_ALP,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'Books',
                    entitySetType: 'BooksType'
                },
                tableType: 'GridTable',
                presentationQualifier: '',
                tableMultiSelect: true,
                tableAutoHide: true,
                tableSelectionMode: 'None',
                smartVariantManagement: true
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });

    it('Form Entry Object Page v4 CAP', async () => {
        testProjectName = 'feop_v4_cap';
        expectedOutputPath = getExpectedOutputPath(join(testProjectName));
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        const sourcePackageJsonPath = join(__dirname, './fixtures/cap-package.json.test');
        const targetPackageJsonPath = join(testDir, testProjectName, 'package.json');
        copyFileSync(sourcePackageJsonPath, targetPackageJsonPath);
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                ui5Version: TemplateTypeAttributes.feop.minimumUi5Version['4'],
                name: testProjectName,
                targetFolder: join(testDir, testProjectName, capAppFolder)
            } as Project,
            service: {
                version: OdataVersion.v4,
                servicePath: '/admin/',
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    appPath: capAppFolder,
                    capType: 'Node.js'
                }
            },
            floorplan: FloorplanFE.FE_FEOP,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'Books',
                    entitySetType: 'BooksType'
                }
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });

    it('FEOP v4 CAP - JAVA', async () => {
        testProjectName = 'lrop_v4_cap_java';
        expectedOutputPath = getExpectedOutputPath(join(testProjectName));
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        const sourcePackageJsonPath = join(__dirname, './fixtures/cap-package.json.test');
        const targetPackageJsonPath = join(testDir, testProjectName, 'package.json');
        copyFileSync(sourcePackageJsonPath, targetPackageJsonPath);
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                ui5Version: TemplateTypeAttributes.feop.minimumUi5Version['4'],
                name: testProjectName,
                targetFolder: join(testDir, testProjectName, capAppFolder)
            } as Project,
            service: {
                version: OdataVersion.v4,
                servicePath: '/admin/',
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    appPath: capAppFolder,
                    capType: 'Java'
                }
            },
            floorplan: FloorplanFE.FE_FEOP,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'Books',
                    entitySetType: 'BooksType'
                }
            }
        });
        await runWritingPhaseGen(testState);
        expect(join(testDir, testProjectName)).toMatchFolder(getExpectedOutputPath(testProjectName), ignoreMatcherOpts);
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });

    it('LROP v4 - CAP - ensure index.html is written when options.generateIndexHtml is false', async () => {
        testProjectName = 'lrop_v4_cap';
        // Copy fake package.json to mimic real CAP project
        mkdirSync(join(testDir, testProjectName), { recursive: true });
        copyFileSync(
            join(__dirname, './fixtures/cap-package-cds-dependency.json.test'),
            join(testDir, testProjectName, 'package.json')
        );
        const accessSpy = jest.spyOn(fsPromise, 'access').mockResolvedValue();

        const testState: State = cloneDeep({
            project: {
                ...baseTestProject(testDir),
                name: testProjectName,
                targetFolder: join(testDir, testProjectName, capAppFolder)
            } as Project,
            service: {
                version: OdataVersion.v4,
                servicePath: '/admin/',
                source: DatasourceType.capProject,
                capService: {
                    projectPath: join(testDir, testProjectName),
                    serviceName: 'AdminService',
                    serviceCdsPath: 'srv/admin-service',
                    appPath: capAppFolder,
                    capType: 'Node.js'
                }
            },
            floorplan: FloorplanFE.FE_LROP,
            entityRelatedConfig: {
                mainEntity: {
                    entitySetName: 'Books',
                    entitySetType: 'BooksType'
                }
            }
        });

        await runWritingPhaseGen(testState, { generateIndexHtml: true });
        expect(join(testDir, testProjectName)).toMatchFolder(
            getExpectedOutputPath(join(testProjectName)),
            ignoreMatcherOpts
        );
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });
});
