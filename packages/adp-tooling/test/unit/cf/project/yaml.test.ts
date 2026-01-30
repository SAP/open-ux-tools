import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

import type { ToolsLogger } from '@sap-ux/logger';
import type { UI5Config } from '@sap-ux/ui5-config';

import {
    isMtaProject,
    getSAPCloudService,
    getRouterType,
    getAppParamsFromUI5Yaml,
    adjustMtaYaml,
    addServeStaticMiddleware,
    addBackendProxyMiddleware
} from '../../../../src/cf/project/yaml';
import { AppRouterType } from '../../../../src/types';
import type { MtaYaml, CfUI5Yaml } from '../../../../src/types';
import { createServices } from '../../../../src/cf/services/api';
import { getProjectNameForXsSecurity, getYamlContent } from '../../../../src/cf/project/yaml-loader';
import { getBackendUrlsWithPaths } from '../../../../src/cf/app/discovery';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('../../../../src/cf/services/api', () => ({
    createServices: jest.fn()
}));

jest.mock('../../../../src/cf/project/yaml-loader', () => ({
    getProjectNameForXsSecurity: jest.fn(),
    getYamlContent: jest.fn()
}));

jest.mock('../../../../src/cf/app/discovery', () => ({
    getBackendUrlsWithPaths: jest.fn()
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockCreateServices = createServices as jest.MockedFunction<typeof createServices>;
const mockGetYamlContent = getYamlContent as jest.MockedFunction<typeof getYamlContent>;
const mockGetProjectNameForXsSecurity = getProjectNameForXsSecurity as jest.MockedFunction<
    typeof getProjectNameForXsSecurity
>;
const mockGetBackendUrlsWithPaths = getBackendUrlsWithPaths as jest.MockedFunction<typeof getBackendUrlsWithPaths>;

describe('YAML Project Functions', () => {
    const mockLogger = {
        debug: jest.fn()
    } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isMtaProject', () => {
        const selectedPath = '/test/project';
        const mtaYamlPath = join(selectedPath, 'mta.yaml');

        test('should return true when mta.yaml exists', () => {
            mockExistsSync.mockReturnValue(true);

            const result = isMtaProject(selectedPath);

            expect(mockExistsSync).toHaveBeenCalledWith(mtaYamlPath);
            expect(result).toBe(true);
        });
    });

    describe('getSAPCloudService', () => {
        test('should return SAP cloud service from destination', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-destination-content',
                        type: 'com.sap.application.content',
                        parameters: {
                            content: {
                                instance: {
                                    destinations: [
                                        {
                                            Name: 'test-html_repo_host',
                                            ServiceInstanceName: 'test-instance',
                                            ServiceKeyName: 'test-key',
                                            'sap.cloud.service': 'my_service_name'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            };

            const result = getSAPCloudService(yamlContent);

            expect(result).toBe('my.service.name');
        });

        test('should return empty string when no destination found', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: []
            };

            const result = getSAPCloudService(yamlContent);

            expect(result).toBe('');
        });

        test('should return empty string when no html_repo_host destination', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-destination-content',
                        type: 'com.sap.application.content',
                        parameters: {
                            content: {
                                instance: {
                                    destinations: [
                                        {
                                            Name: 'other-destination',
                                            ServiceInstanceName: 'other-instance',
                                            ServiceKeyName: 'other-key',
                                            'sap.cloud.service': 'other_service'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            };

            const result = getSAPCloudService(yamlContent);

            expect(result).toBe('');
        });
    });

    describe('getRouterType', () => {
        test('should return STANDALONE when approuter module exists', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-approuter',
                        type: 'some.approuter'
                    }
                ]
            };

            const result = getRouterType(yamlContent);

            expect(result).toBe(AppRouterType.STANDALONE);
        });

        test('should return MANAGED when destination-content module exists', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-destination-content',
                        type: 'some.sap.application.content'
                    }
                ]
            };

            const result = getRouterType(yamlContent);

            expect(result).toBe(AppRouterType.MANAGED);
        });

        test('should return MANAGED when no approuter modules exist', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'other-module',
                        type: 'html5'
                    }
                ]
            };

            const result = getRouterType(yamlContent);

            expect(result).toBe(AppRouterType.MANAGED);
        });
    });

    describe('getAppParamsFromUI5Yaml', () => {
        const projectPath = '/test/project';
        const ui5YamlPath = join(projectPath, 'ui5.yaml');

        test('should return app params from UI5 YAML', () => {
            const mockUI5Yaml: CfUI5Yaml = {
                specVersion: '3.0',
                type: 'application',
                metadata: {
                    name: 'test-app'
                },
                builder: {
                    customTasks: [
                        {
                            name: 'test-task',
                            configuration: {
                                appHostId: 'test-app-host-id',
                                appName: 'test-app',
                                appVersion: '1.0.0',
                                moduleName: 'test-module',
                                org: 'test-org',
                                space: 'test-space-guid',
                                html5RepoRuntime: 'test-runtime',
                                sapCloudService: 'test-service',
                                serviceInstanceName: 'test-service-instance-name',
                                serviceInstanceGuid: 'test-service-instance-guid'
                            }
                        }
                    ]
                }
            };

            mockGetYamlContent.mockReturnValue(mockUI5Yaml);

            const result = getAppParamsFromUI5Yaml(projectPath);

            expect(mockGetYamlContent).toHaveBeenCalledWith(ui5YamlPath);
            expect(result).toEqual({
                appHostId: 'test-app-host-id',
                appName: '1.0.0',
                appVersion: '1.0.0',
                spaceGuid: 'test-space-guid'
            });
        });

        test('should return empty strings when configuration is missing', () => {
            const mockUI5Yaml: CfUI5Yaml = {
                specVersion: '3.0',
                type: 'application',
                metadata: {
                    name: 'test-app'
                },
                builder: {
                    customTasks: []
                }
            };

            mockGetYamlContent.mockReturnValue(mockUI5Yaml);

            const result = getAppParamsFromUI5Yaml(projectPath);

            expect(mockGetYamlContent).toHaveBeenCalledWith(ui5YamlPath);
            expect(result).toEqual({
                appHostId: '',
                appName: '',
                appVersion: '',
                spaceGuid: ''
            });
        });
    });

    describe('adjustMtaYaml', () => {
        const projectPath = '/test/project';
        const moduleName = 'test-module';
        const businessSolutionName = 'test.solution';
        const businessService = 'test-service';
        const spaceGuid = 'test-space-guid';

        // Mock mem-fs editor
        let mockMemFs: jest.MockedObject<Editor>;

        beforeEach(() => {
            jest.spyOn(Date, 'now').mockReturnValue(1234567890);
            mockMemFs = {
                write: jest.fn()
            } as jest.MockedObject<Editor>;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('should adjust MTA YAML for standalone approuter', async () => {
            const mtaYamlPath = join(projectPath, 'mta.yaml');
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);

            await adjustMtaYaml(
                {
                    projectPath,
                    moduleName,
                    appRouterType: AppRouterType.STANDALONE,
                    businessSolutionName,
                    businessService
                },
                mockMemFs,
                undefined,
                mockLogger
            );

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaYamlPath);
            expect(mockCreateServices).toHaveBeenCalled();
            expect(mockMemFs.write).toHaveBeenCalledWith(mtaYamlPath, expect.any(String));
        });

        test('should adjust MTA YAML for managed approuter', async () => {
            const mtaYamlPath = join(projectPath, 'mta.yaml');
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);

            await adjustMtaYaml(
                {
                    projectPath,
                    moduleName,
                    appRouterType: AppRouterType.MANAGED,
                    businessSolutionName,
                    businessService
                },
                mockMemFs,
                undefined,
                mockLogger
            );

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaYamlPath);
            expect(mockCreateServices).toHaveBeenCalled();
            expect(mockMemFs.write).toHaveBeenCalledWith(mtaYamlPath, expect.any(String));
        });

        test('should auto-detect approuter type when not provided', async () => {
            const mtaYamlPath = join(projectPath, 'mta.yaml');
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-approuter',
                        type: 'some.approuter'
                    }
                ],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);

            await adjustMtaYaml(
                {
                    projectPath,
                    moduleName,
                    appRouterType: null as unknown as AppRouterType,
                    businessSolutionName,
                    businessService
                },
                mockMemFs,
                undefined,
                mockLogger
            );

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaYamlPath);
            expect(mockCreateServices).toHaveBeenCalled();
            expect(mockMemFs.write).toHaveBeenCalledWith(mtaYamlPath, expect.any(String));
        });

        test('should throw error when file write fails', async () => {
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);
            mockMemFs.write.mockImplementation(() => {
                throw new Error('Write failed');
            });

            await expect(
                adjustMtaYaml(
                    {
                        projectPath,
                        moduleName,
                        appRouterType: AppRouterType.STANDALONE,
                        businessSolutionName,
                        businessService
                    },
                    mockMemFs,
                    undefined,
                    mockLogger
                )
            ).rejects.toThrow('Write failed');
        });

        test('should handle existing approuter module for managed approuter', async () => {
            const mtaYamlPath = join(projectPath, 'mta.yaml');
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-project-destination-content',
                        type: 'com.sap.application.content',
                        parameters: {
                            content: {
                                instance: {
                                    destinations: [
                                        {
                                            Name: 'existing-destination',
                                            ServiceInstanceName: 'existing-instance',
                                            ServiceKeyName: 'existing-key',
                                            'sap.cloud.service': 'existing.service'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);

            await adjustMtaYaml(
                {
                    projectPath,
                    moduleName,
                    appRouterType: AppRouterType.MANAGED,
                    businessSolutionName,
                    businessService
                },
                mockMemFs,
                undefined,
                mockLogger
            );

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaYamlPath);
            expect(mockCreateServices).toHaveBeenCalled();
            expect(mockMemFs.write).toHaveBeenCalledWith(mtaYamlPath, expect.any(String));
        });

        test('should add required modules and move FLP module to last position', async () => {
            const mtaYamlPath = join(projectPath, 'mta.yaml');
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'other-module',
                        type: 'html5'
                    },
                    {
                        name: 'test-flp-module',
                        type: 'com.sap.application.content',
                        requires: [
                            {
                                name: 'portal_resources_test-project',
                                parameters: {
                                    'service-key': {
                                        name: 'content-deploy-key'
                                    }
                                }
                            }
                        ]
                    },
                    {
                        name: 'another-module',
                        type: 'html5'
                    }
                ],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);

            await adjustMtaYaml(
                {
                    projectPath,
                    moduleName,
                    appRouterType: AppRouterType.MANAGED,
                    businessSolutionName,
                    businessService
                },
                mockMemFs,
                undefined,
                mockLogger
            );

            // Verify the FLP module was moved to the last position
            const lastModule = mockYamlContent.modules![mockYamlContent.modules!.length - 1];
            expect(lastModule.name).toBe('test-flp-module');

            // Verify required modules were added to the FLP module
            const flpModule = mockYamlContent.modules!.find((m) => m.name === 'test-flp-module');
            expect(flpModule?.requires).toHaveLength(4);
            expect(flpModule?.requires?.map((r) => r.name)).toContain('portal_resources_test-project');
            expect(flpModule?.requires?.map((r) => r.name)).toContain('test-project_html_repo_host');
            expect(flpModule?.requires?.map((r) => r.name)).toContain('test-project_ui_deployer');
            expect(flpModule?.requires?.map((r) => r.name)).toContain('test-service');

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaYamlPath);
            expect(mockCreateServices).toHaveBeenCalled();
            expect(mockMemFs.write).toHaveBeenCalledWith(mtaYamlPath, expect.any(String));
        });

        test('should not modify FLP modules with wrong service-key name', async () => {
            const mtaYamlPath = join(projectPath, 'mta.yaml');
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-flp-module',
                        type: 'com.sap.application.content',
                        requires: [
                            {
                                name: 'portal_resources_test-project',
                                parameters: {
                                    'service-key': {
                                        name: 'wrong-key' // Wrong key name
                                    }
                                }
                            }
                        ]
                    }
                ],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);

            await adjustMtaYaml(
                {
                    projectPath,
                    moduleName,
                    appRouterType: AppRouterType.MANAGED,
                    businessSolutionName,
                    businessService
                },
                mockMemFs,
                undefined,
                mockLogger
            );

            // Verify the FLP module was not modified (no additional requires added)
            const flpModule = mockYamlContent.modules!.find((m) => m.name === 'test-flp-module');
            expect(flpModule?.requires).toHaveLength(1); // Only the original portal_resources
            expect(flpModule?.requires?.map((r) => r.name)).toContain('portal_resources_test-project');
            expect(flpModule?.requires?.map((r) => r.name)).not.toContain('test-project_html_repo_host');
            expect(flpModule?.requires?.map((r) => r.name)).not.toContain('test-project_ui_deployer');
            expect(flpModule?.requires?.map((r) => r.name)).not.toContain('test-service');

            // But managed approuter modules should still be added
            expect(mockYamlContent.modules).toHaveLength(4); // original + destination-content + ui-deployer + html5 module

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaYamlPath);
            expect(mockCreateServices).toHaveBeenCalled();
            expect(mockMemFs.write).toHaveBeenCalledWith(mtaYamlPath, expect.any(String));
        });

        test('should not add duplicate modules when they already exist', async () => {
            const mtaYamlPath = join(projectPath, 'mta.yaml');
            const mockYamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: [
                    {
                        name: 'test-flp-module',
                        type: 'com.sap.application.content',
                        requires: [
                            {
                                name: 'portal_resources_test-project',
                                parameters: {
                                    'service-key': {
                                        name: 'content-deploy-key'
                                    }
                                }
                            },
                            { name: 'test-project_html_repo_host' } // Already exists
                        ]
                    }
                ],
                resources: []
            };

            mockGetYamlContent.mockReturnValue(mockYamlContent);
            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');
            mockCreateServices.mockResolvedValue(undefined);

            await adjustMtaYaml(
                {
                    projectPath,
                    moduleName,
                    appRouterType: AppRouterType.MANAGED,
                    businessSolutionName,
                    businessService
                },
                mockMemFs,
                undefined,
                mockLogger
            );

            // Verify required modules were added but no duplicates
            const flpModule = mockYamlContent.modules!.find((m) => m.name === 'test-flp-module');
            expect(flpModule?.requires).toHaveLength(4); // original 2 + 2 new (no duplicate)
            expect(flpModule?.requires?.map((r) => r.name)).toContain('portal_resources_test-project');
            expect(flpModule?.requires?.map((r) => r.name)).toContain('test-project_html_repo_host');
            expect(flpModule?.requires?.map((r) => r.name)).toContain('test-project_ui_deployer');
            expect(flpModule?.requires?.map((r) => r.name)).toContain('test-service');

            // Verify no duplicate html_repo_host was added
            const htmlRepoHostCount = flpModule?.requires?.filter(
                (r) => r.name === 'test-project_html_repo_host'
            ).length;
            expect(htmlRepoHostCount).toBe(1);

            expect(mockGetYamlContent).toHaveBeenCalledWith(mtaYamlPath);
            expect(mockCreateServices).toHaveBeenCalled();
            expect(mockMemFs.write).toHaveBeenCalledWith(mtaYamlPath, expect.any(String));
        });
    });

    describe('addServeStaticMiddleware', () => {
        const basePath = '/test/project';
        const mockLogger = {
            warn: jest.fn(),
            info: jest.fn()
        } as unknown as ToolsLogger;

        let mockUi5Config: UI5Config;

        beforeEach(() => {
            mockUi5Config = {
                findCustomMiddleware: jest.fn().mockReturnValue(true),
                removeCustomMiddleware: jest.fn(),
                addCustomMiddleware: jest.fn()
            } as unknown as UI5Config;
        });

        test('should add fiori-tools-servestatic middleware with reusable libraries', async () => {
            const ui5AppInfo = {
                asyncHints: {
                    libs: [
                        {
                            name: 'my.reusable.lib',
                            html5AppName: 'myreusablelib',
                            url: { url: 'https://example.com/resources/my/reusable/lib' }
                        },
                        {
                            name: 'another.lib',
                            html5AppName: 'anotherlib',
                            url: { url: 'https://example.com/resources/another/lib' }
                        }
                    ]
                }
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

            await addServeStaticMiddleware(basePath, mockUi5Config, mockLogger);

            expect(mockUi5Config.removeCustomMiddleware).toHaveBeenCalledWith('fiori-tools-servestatic');
            expect(mockUi5Config.addCustomMiddleware).toHaveBeenCalledWith([
                {
                    name: 'fiori-tools-servestatic',
                    beforeMiddleware: 'compression',
                    configuration: {
                        paths: [
                            {
                                path: '/resources/my/reusable/lib',
                                src: './.adp/reuse/myreusablelib',
                                fallthrough: false
                            },
                            {
                                path: '/resources/another/lib',
                                src: './.adp/reuse/anotherlib',
                                fallthrough: false
                            }
                        ]
                    }
                }
            ]);
        });

        test('should skip configuration when ui5AppInfo.json does not exist', async () => {
            mockExistsSync.mockReturnValue(false);

            await addServeStaticMiddleware(basePath, mockUi5Config, mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'ui5AppInfo.json not found in project root, skipping fiori-tools-servestatic configuration'
            );
            expect(mockUi5Config.addCustomMiddleware).not.toHaveBeenCalled();
        });

        test('should skip configuration when no reusable libraries found', async () => {
            const ui5AppInfo = {
                asyncHints: {
                    libs: [{ name: 'sap.m' }, { name: 'sap.ui.core' }]
                }
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

            await addServeStaticMiddleware(basePath, mockUi5Config, mockLogger);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'No reusable libraries found in ui5AppInfo.json, skipping fiori-tools-servestatic configuration'
            );
            expect(mockUi5Config.addCustomMiddleware).not.toHaveBeenCalled();
        });

        test('should throw and warn on error', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockImplementation(() => {
                throw new Error('Read error');
            });

            await expect(addServeStaticMiddleware(basePath, mockUi5Config, mockLogger)).rejects.toThrow('Read error');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not add fiori-tools-servestatic configuration: Read error'
            );
        });
    });

    describe('addBackendProxyMiddleware', () => {
        const basePath = '/test/project';
        const mockLogger = {
            warn: jest.fn(),
            info: jest.fn()
        } as unknown as ToolsLogger;

        let mockUi5Config: UI5Config;
        const mockServiceKeys = [
            {
                credentials: {
                    uaa: {} as any,
                    uri: 'https://backend.example.com',
                    endpoints: {
                        'odata-v2': 'https://backend.example.com/odata/v2'
                    },
                    'html5-apps-repo': {}
                }
            }
        ];

        beforeEach(() => {
            mockUi5Config = {
                findCustomMiddleware: jest.fn().mockReturnValue(true),
                removeCustomMiddleware: jest.fn(),
                addCustomMiddleware: jest.fn()
            } as unknown as UI5Config;
        });

        test('should add backend-proxy-middleware-cf with backend URLs', async () => {
            const urlsWithPaths = [
                { url: 'https://backend.example.com', paths: ['/backend'] },
                { url: 'https://api.example.com', paths: ['/api'] }
            ];

            mockGetBackendUrlsWithPaths.mockReturnValue(urlsWithPaths);

            await addBackendProxyMiddleware(basePath, mockUi5Config, mockServiceKeys, mockLogger);

            expect(mockUi5Config.removeCustomMiddleware).toHaveBeenCalledWith('backend-proxy-middleware-cf');
            expect(mockUi5Config.addCustomMiddleware).toHaveBeenCalledWith([
                {
                    name: 'backend-proxy-middleware-cf',
                    afterMiddleware: 'compression',
                    configuration: {
                        backends: urlsWithPaths
                    }
                }
            ]);
        });

        test('should skip configuration when no backend URLs found', async () => {
            mockGetBackendUrlsWithPaths.mockReturnValue([]);

            await addBackendProxyMiddleware(basePath, mockUi5Config, mockServiceKeys, mockLogger);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'No backend URLs with paths found. Skipping backend-proxy-middleware-cf configuration.'
            );
            expect(mockUi5Config.addCustomMiddleware).not.toHaveBeenCalled();
        });

        test('should warn on error', async () => {
            mockGetBackendUrlsWithPaths.mockImplementation(() => {
                throw new Error('Discovery error');
            });

            await addBackendProxyMiddleware(basePath, mockUi5Config, mockServiceKeys, mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Could not add backend-proxy-middleware-cf configuration: Discovery error'
            );
            expect(mockUi5Config.addCustomMiddleware).not.toHaveBeenCalled();
        });
    });
});
