import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { writeFileSync, mkdirSync } from 'node:fs';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { generateCf, generateCfConfig } from '../../../src/writer/cf';
import { AppRouterType, FlexLayer, type CfAdpWriterConfig, type CfConfig } from '../../../src/types';
import {
    getOrCreateServiceInstanceKeys,
    addServeStaticMiddleware,
    addBackendProxyMiddleware,
    getProjectNameForXsSecurity
} from '../../../src/cf';
import { runBuild } from '../../../src/base/project-builder';
import { readUi5Yaml } from '@sap-ux/project-access';
import { downloadUi5AppInfo } from '../../../src/cf/project/ui5-app-info';

jest.mock('../../../src/cf');
jest.mock('../../../src/base/project-builder');
jest.mock('@sap-ux/project-access');
jest.mock('../../../src/cf/project/ui5-app-info', () => ({
    ...jest.requireActual('../../../src/cf/project/ui5-app-info'),
    downloadUi5AppInfo: jest.fn()
}));

const mockGetOrCreateServiceInstanceKeys = getOrCreateServiceInstanceKeys as jest.MockedFunction<
    typeof getOrCreateServiceInstanceKeys
>;
const mockAddServeStaticMiddleware = addServeStaticMiddleware as jest.MockedFunction<typeof addServeStaticMiddleware>;
const mockAddBackendProxyMiddleware = addBackendProxyMiddleware as jest.MockedFunction<
    typeof addBackendProxyMiddleware
>;
const mockRunBuild = runBuild as jest.MockedFunction<typeof runBuild>;
const mockReadUi5Yaml = readUi5Yaml as jest.MockedFunction<typeof readUi5Yaml>;
const mockGetProjectNameForXsSecurity = getProjectNameForXsSecurity as jest.MockedFunction<
    typeof getProjectNameForXsSecurity
>;
const mockDownloadUi5AppInfo = downloadUi5AppInfo as jest.MockedFunction<typeof downloadUi5AppInfo>;

const mockServiceKeys = [
    {
        credentials: {
            uaa: {} as any,
            uri: 'test-uri',
            endpoints: {},
            'html5-apps-repo': {
                app_host_id: 'host-123'
            }
        }
    }
];

const config: CfAdpWriterConfig = {
    app: {
        id: 'my.test.cf.app',
        title: 'Test CF App',
        layer: FlexLayer.CUSTOMER_BASE,
        namespace: 'test.namespace',
        manifest: {
            'sap.app': {
                id: 'my.test.cf.app',
                title: 'Test CF App'
            },
            'sap.ui5': {
                flexEnabled: true
            }
        } as unknown as Manifest
    },
    baseApp: {
        appId: 'base-app-id',
        appName: 'Base App',
        appVersion: '1.0.0',
        appHostId: 'app-host-id',
        serviceName: 'base-service',
        title: 'Base App Title'
    },
    cf: {
        url: '/test.cf.com',
        org: { GUID: 'org-guid', Name: 'test-org' },
        space: { GUID: 'space-guid', Name: 'test-space' },
        html5RepoRuntimeGuid: 'runtime-guid',
        approuter: AppRouterType.STANDALONE,
        businessService: 'test-service',
        businessSolutionName: 'test-solution',
        serviceInfo: {
            serviceKeys: mockServiceKeys,
            serviceInstance: { guid: 'service-guid', name: 'service-name' }
        },
        spaceGuid: 'space-guid'
    },
    project: {
        name: 'test-cf-project',
        path: '/test/cf/path',
        folder: '' // This will be set in each test
    },
    ui5: {
        version: '1.120.0'
    },
    options: {
        addStandaloneApprouter: false,
        addSecurity: false
    }
};

function createConfigWithProjectPath(projectDir: string): CfAdpWriterConfig {
    return {
        ...config,
        project: {
            ...config.project,
            folder: join(projectDir, 'test-cf-project')
        }
    };
}

describe('CF Writer', () => {
    const fs = create(createStorage());
    const debug = true || !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '../../fixtures/test-output');

    describe('generateCf', () => {
        const mtaProjectDir = join(__dirname, '../../fixtures/mta-project');
        const originalMtaYaml = fs.read(join(mtaProjectDir, 'mta.yaml'));

        const mockLogger = {
            debug: jest.fn()
        } as unknown as ToolsLogger;

        beforeAll(async () => {
            await rimraf(outputDir);
        }, 10000);

        afterAll(() => {
            return new Promise((resolve) => {
                // write out the files for debugging
                if (debug) {
                    fs.commit(resolve);
                } else {
                    resolve(true);
                }
            });
        });

        beforeEach(() => {
            jest.spyOn(Date, 'now').mockReturnValue(1234567890);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        test('minimal config', async () => {
            const projectDir = join(outputDir, 'minimal-cf');
            mkdirSync(projectDir, { recursive: true });
            writeFileSync(join(projectDir, 'mta.yaml'), originalMtaYaml);

            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');

            await generateCf(projectDir, createConfigWithProjectPath(projectDir), mockLogger, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        test('config with managed approuter', async () => {
            const projectDir = join(outputDir, 'managed-approuter');
            mkdirSync(projectDir, { recursive: true });
            writeFileSync(join(projectDir, 'mta.yaml'), originalMtaYaml);

            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');

            const customConfig = createConfigWithProjectPath(projectDir);
            customConfig.cf.approuter = AppRouterType.MANAGED;

            await generateCf(projectDir, customConfig, mockLogger, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        test('config with options', async () => {
            const projectDir = join(outputDir, 'options');
            mkdirSync(projectDir, { recursive: true });
            writeFileSync(join(projectDir, 'mta.yaml'), originalMtaYaml);

            mockGetProjectNameForXsSecurity.mockReturnValue('test_project_1234567890');

            const customConfig = createConfigWithProjectPath(projectDir);
            customConfig.options = {
                addStandaloneApprouter: true,
                addSecurity: true
            };

            await generateCf(projectDir, customConfig, mockLogger, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
        });
    });

    describe('generateCfConfig', () => {
        const mockLogger = {
            info: jest.fn(),
            error: jest.fn()
        } as unknown as ToolsLogger;

        const mockCfConfig: CfConfig = {
            url: '/test.cf.com',
            org: { GUID: 'org-guid', Name: 'test-org' },
            space: { GUID: 'space-guid', Name: 'test-space' },
            token: 'test-token'
        };

        const mockUi5Config = {
            findCustomTask: jest.fn(),
            toString: jest.fn().mockReturnValue('ui5-config-content')
        };

        beforeEach(() => {
            mockReadUi5Yaml.mockResolvedValue(mockUi5Config as any);
            mockGetOrCreateServiceInstanceKeys.mockResolvedValue({
                serviceKeys: mockServiceKeys,
                serviceInstance: { guid: 'service-guid', name: 'service-name' }
            });
            mockDownloadUi5AppInfo.mockResolvedValue(undefined);
            mockAddServeStaticMiddleware.mockResolvedValue(undefined);
            mockAddBackendProxyMiddleware.mockReturnValue(undefined);
            mockRunBuild.mockResolvedValue(undefined);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        test('should generate CF config successfully', async () => {
            const projectDir = join(outputDir, 'cf-config');
            mkdirSync(projectDir, { recursive: true });

            mockUi5Config.findCustomTask.mockReturnValue({
                configuration: { serviceInstanceName: 'test-service', space: 'space-guid' }
            });

            const fs = await generateCfConfig(projectDir, 'ui5.yaml', mockCfConfig, mockLogger);

            expect(mockGetOrCreateServiceInstanceKeys).toHaveBeenCalledWith(
                { names: ['test-service'], spaceGuids: ['space-guid'] },
                mockLogger
            );
            expect(mockDownloadUi5AppInfo).toHaveBeenCalledWith(projectDir, mockCfConfig, mockLogger);
            expect(mockAddServeStaticMiddleware).toHaveBeenCalledWith(projectDir, mockUi5Config, mockLogger);
            expect(mockRunBuild).toHaveBeenCalledWith(projectDir, { ADP_BUILDER_MODE: 'preview' });
            expect(mockAddBackendProxyMiddleware).toHaveBeenCalledWith(
                projectDir,
                mockUi5Config,
                mockServiceKeys,
                mockLogger
            );
            expect(fs).toBeDefined();
        });

        test('should throw error when serviceInstanceName not found', async () => {
            const projectDir = join(outputDir, 'cf-config-no-service');
            mkdirSync(projectDir, { recursive: true });

            mockUi5Config.findCustomTask.mockReturnValue(undefined);

            await expect(generateCfConfig(projectDir, 'ui5.yaml', mockCfConfig, mockLogger)).rejects.toThrow(
                'No serviceInstanceName found in app-variant-bundler-build configuration'
            );
        });

        test('should throw error when no service keys found', async () => {
            const projectDir = join(outputDir, 'cf-config-no-keys');
            mkdirSync(projectDir, { recursive: true });

            mockUi5Config.findCustomTask.mockReturnValue({
                configuration: { serviceInstanceName: 'test-service', space: 'space-guid' }
            });

            mockGetOrCreateServiceInstanceKeys.mockResolvedValue(null);

            await expect(generateCfConfig(projectDir, 'ui5.yaml', mockCfConfig, mockLogger)).rejects.toThrow(
                'No service keys found for service instance: test-service'
            );
        });
    });
});
