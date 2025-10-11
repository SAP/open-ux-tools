import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { writeFileSync, mkdirSync } from 'node:fs';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { generateCf } from '../../../src/writer/cf';
import { AppRouterType, FlexLayer, type CfAdpWriterConfig } from '../../../src/types';

jest.mock('../../../src/cf/services/api', () => ({
    createServices: jest.fn().mockResolvedValue(undefined)
}));

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
        businessSolutionName: 'test-solution'
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

            await generateCf(projectDir, createConfigWithProjectPath(projectDir), mockLogger, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        test('config with managed approuter', async () => {
            const projectDir = join(outputDir, 'managed-approuter');
            mkdirSync(projectDir, { recursive: true });
            writeFileSync(join(projectDir, 'mta.yaml'), originalMtaYaml);

            const customConfig = createConfigWithProjectPath(projectDir);
            customConfig.cf.approuter = AppRouterType.MANAGED;

            await generateCf(projectDir, customConfig, mockLogger, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        test('config with options', async () => {
            const projectDir = join(outputDir, 'options');
            mkdirSync(projectDir, { recursive: true });
            writeFileSync(join(projectDir, 'mta.yaml'), originalMtaYaml);

            const customConfig = createConfigWithProjectPath(projectDir);
            customConfig.options = {
                addStandaloneApprouter: true,
                addSecurity: true
            };

            await generateCf(projectDir, customConfig, mockLogger, fs);

            expect(fs.dump(projectDir)).toMatchSnapshot();
        });
    });
});
