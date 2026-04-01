import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import { getCfDeploymentInfo, formatDeploymentSummary, findMtaRoot, deployCf } from '../../../src/cf/deploy';
import { initI18n, t } from '../../../src/i18n';
import type { CfDeploymentInfo, MtaYaml, CfConfig } from '../../../src/types';

jest.mock('../../../src/cf/project/yaml', () => ({
    isMtaProject: jest.fn()
}));

jest.mock('../../../src/cf/project/yaml-loader', () => ({
    getYamlContent: jest.fn()
}));

jest.mock('../../../src/cf/core/config', () => ({
    loadCfConfig: jest.fn()
}));

jest.mock('../../../src/cf/services/cli', () => ({
    isCfInstalled: jest.fn()
}));

jest.mock('../../../src/cf/core/auth', () => ({
    isLoggedInCf: jest.fn()
}));

jest.mock('@sap-ux/nodejs-utils', () => ({
    CommandRunner: jest.fn().mockImplementation(() => ({
        run: jest.fn()
    }))
}));

const { isMtaProject } = jest.requireMock('../../../src/cf/project/yaml') as { isMtaProject: jest.Mock };
const { getYamlContent } = jest.requireMock('../../../src/cf/project/yaml-loader') as {
    getYamlContent: jest.Mock;
};
const { loadCfConfig } = jest.requireMock('../../../src/cf/core/config') as { loadCfConfig: jest.Mock };
const { isCfInstalled } = jest.requireMock('../../../src/cf/services/cli') as { isCfInstalled: jest.Mock };
const { isLoggedInCf } = jest.requireMock('../../../src/cf/core/auth') as { isLoggedInCf: jest.Mock };
const { CommandRunner } = jest.requireMock('@sap-ux/nodejs-utils') as { CommandRunner: jest.Mock };

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const sampleMtaYaml: MtaYaml = {
    '_schema-version': '3.2.0',
    'ID': 'my-mta-project',
    'version': '1.0.0',
    'modules': [
        {
            name: 'my-app',
            type: 'html5',
            path: 'my-app'
        },
        {
            name: 'my-app-deployer',
            type: 'com.sap.application.content',
            path: 'my-app-deployer'
        }
    ],
    resources: [
        {
            name: 'my-html5-repo',
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                service: 'html5-apps-repo',
                'service-plan': 'app-host'
            }
        }
    ]
};

const sampleCfConfig: CfConfig = {
    org: { Name: 'my-org', GUID: 'org-guid' },
    space: { Name: 'dev', GUID: 'space-guid' },
    token: 'mock-token',
    url: 'eu10.hana.ondemand.com'
};

describe('CF Deploy', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCfDeploymentInfo', () => {
        test('should return deployment info when mta.yaml exists', () => {
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);
            loadCfConfig.mockReturnValue(sampleCfConfig);

            const result = getCfDeploymentInfo('/projects/my-mta');

            expect(result).toEqual({
                mtaProjectName: 'my-mta-project',
                mtaVersion: '1.0.0',
                space: 'dev',
                org: 'my-org',
                apiUrl: 'eu10.hana.ondemand.com',
                mtaRoot: '/projects/my-mta',
                modules: [
                    { name: 'my-app', type: 'html5', path: 'my-app' },
                    { name: 'my-app-deployer', type: 'com.sap.application.content', path: 'my-app-deployer' }
                ]
            });
            expect(getYamlContent).toHaveBeenCalledWith(path.join('/projects/my-mta', 'mta.yaml'));
        });

        test('should throw when mta.yaml does not exist', () => {
            isMtaProject.mockReturnValue(false);

            expect(() => getCfDeploymentInfo('/projects/no-mta')).toThrow(
                t('deploy.mtaNotFound', { projectPath: '/projects/no-mta' })
            );
        });

        test('should handle MTA yaml with no modules', () => {
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue({
                '_schema-version': '3.2.0',
                'ID': 'empty-project',
                'version': '0.1.0'
            });
            loadCfConfig.mockReturnValue(sampleCfConfig);

            const result = getCfDeploymentInfo('/projects/empty');

            expect(result.mtaProjectName).toBe('empty-project');
            expect(result.modules).toEqual([]);
        });

        test('should handle missing CF config fields gracefully', () => {
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);
            loadCfConfig.mockReturnValue({} as CfConfig);

            const result = getCfDeploymentInfo('/projects/my-mta');

            expect(result.space).toBe('');
            expect(result.org).toBe('');
            expect(result.apiUrl).toBe('');
        });
    });

    describe('formatDeploymentSummary', () => {
        test('should format deployment info correctly', () => {
            const info: CfDeploymentInfo = {
                mtaProjectName: 'my-mta-project',
                mtaVersion: '1.0.0',
                space: 'dev',
                org: 'my-org',
                apiUrl: 'eu10.hana.ondemand.com',
                mtaRoot: '/projects/my-mta',
                modules: [
                    { name: 'my-app', type: 'html5', path: 'my-app' },
                    { name: 'my-app-deployer', type: 'com.sap.application.content', path: 'my-app-deployer' }
                ]
            };

            const result = formatDeploymentSummary(info);

            expect(result).toContain('mta-project-name: my-mta-project');
            expect(result).toContain('mta-version: 1.0.0');
            expect(result).toContain('space: dev');
            expect(result).toContain('org: my-org');
            expect(result).toContain('api-url: eu10.hana.ondemand.com');
            expect(result).toContain('project name: my-app');
            expect(result).toContain('type: html5');
            expect(result).toContain('path: my-app');
            expect(result).toContain('project name: my-app-deployer');
            expect(result).toContain('type: com.sap.application.content');
            expect(result).toContain('------------------------------------');
            expect(result).toContain(t('deploy.confirmPrompt'));
        });

        test('should omit path when module has no path', () => {
            const info: CfDeploymentInfo = {
                mtaProjectName: 'test',
                mtaVersion: '1.0.0',
                space: 'dev',
                org: 'org',
                apiUrl: 'url',
                mtaRoot: '/path',
                modules: [{ name: 'mod', type: 'html5' }]
            };

            const result = formatDeploymentSummary(info);

            expect(result).not.toContain('path:');
        });

        test('should handle empty modules', () => {
            const info: CfDeploymentInfo = {
                mtaProjectName: 'test',
                mtaVersion: '1.0.0',
                space: 'dev',
                org: 'org',
                apiUrl: 'url',
                mtaRoot: '/path',
                modules: []
            };

            const result = formatDeploymentSummary(info);

            expect(result).toContain('mta-project-name: test');
            expect(result).not.toContain('project name:');
            expect(result).toContain(t('deploy.confirmPrompt'));
        });

        test('should produce consistent multi-line output', () => {
            const info: CfDeploymentInfo = {
                mtaProjectName: 'my-mta-project',
                mtaVersion: '1.0.0',
                space: 'dev',
                org: 'my-org',
                apiUrl: 'eu10.hana.ondemand.com',
                mtaRoot: '/projects/my-mta',
                modules: [
                    { name: 'my-app', type: 'html5', path: 'my-app' },
                    { name: 'my-app-deployer', type: 'com.sap.application.content' }
                ]
            };

            const lines = formatDeploymentSummary(info).split('\n');
            expect(lines[0]).toBe('mta-project-name: my-mta-project');
            expect(lines[1]).toBe('mta-version: 1.0.0');
            expect(lines[2]).toBe('space: dev');
            expect(lines[3]).toBe('org: my-org');
            expect(lines[4]).toBe('api-url: eu10.hana.ondemand.com');
            expect(lines[5]).toBe('------------------------------------');
            expect(lines[6]).toBe('project name: my-app');
            expect(lines[7]).toBe('type: html5');
            expect(lines[8]).toBe('path: my-app');
            expect(lines[9]).toBe('------------------------------------');
            expect(lines[10]).toBe('project name: my-app-deployer');
            expect(lines[11]).toBe('type: com.sap.application.content');
        });
    });

    describe('findMtaRoot', () => {
        test('should return the path itself when mta.yaml is in the given path', () => {
            const mtaRoot = path.resolve('/projects/mta-root');
            isMtaProject.mockImplementation((p: string) => p === mtaRoot);

            expect(findMtaRoot(mtaRoot)).toBe(mtaRoot);
        });

        test('should return parent when mta.yaml is in the parent directory', () => {
            const mtaRoot = path.resolve('/projects/mta-root');
            const childPath = path.join(mtaRoot, 'my-app');
            isMtaProject.mockImplementation((p: string) => p === mtaRoot);

            expect(findMtaRoot(childPath)).toBe(mtaRoot);
        });

        test('should return undefined when mta.yaml is not found', () => {
            isMtaProject.mockReturnValue(false);

            expect(findMtaRoot(path.resolve('/some/random/path'))).toBeUndefined();
        });
    });

    describe('deployCf', () => {
        let mockCommandRunnerRun: jest.Mock;
        const mtaRoot = path.resolve('/projects/my-mta');
        const appPath = path.join(mtaRoot, 'my-app');

        beforeEach(() => {
            mockCommandRunnerRun = jest.fn().mockResolvedValue(undefined);
            CommandRunner.mockImplementation(() => ({
                run: mockCommandRunnerRun
            }));
        });

        test('should throw when CF CLI is not installed', async () => {
            isCfInstalled.mockResolvedValue(false);

            await expect(deployCf(mtaRoot, {}, mockLogger)).rejects.toThrow(t('deploy.cfNotInstalled'));
        });

        test('should throw when not logged in to CF', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(false);

            await expect(deployCf(mtaRoot, {}, mockLogger)).rejects.toThrow(t('deploy.notLoggedIn'));
        });

        test('should throw when MTA root is not found', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockReturnValue(false);

            const noMtaPath = path.resolve('/projects/no-mta');
            await expect(deployCf(noMtaPath, {}, mockLogger)).rejects.toThrow();
        });

        test('should cancel when confirmDeployment returns false', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);

            const confirmDeployment = jest.fn().mockResolvedValue(false);

            await deployCf(mtaRoot, { confirmDeployment }, mockLogger);

            expect(confirmDeployment).toHaveBeenCalled();
            expect(mockCommandRunnerRun).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(t('deploy.cancelled'));
        });

        test('should run build and deploy when confirmed', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);

            const confirmDeployment = jest.fn().mockResolvedValue(true);

            await deployCf(mtaRoot, { confirmDeployment }, mockLogger);

            expect(mockCommandRunnerRun).toHaveBeenCalledTimes(2);
            expect(mockCommandRunnerRun).toHaveBeenNthCalledWith(
                1,
                'mbt',
                ['build', '--mtar', 'archive', '--source', mtaRoot],
                { cwd: mtaRoot },
                mockLogger
            );
            expect(mockCommandRunnerRun).toHaveBeenNthCalledWith(
                2,
                'cf',
                ['deploy', path.join(mtaRoot, 'mta_archives', 'archive.mtar')],
                { cwd: mtaRoot },
                mockLogger
            );
            expect(mockLogger.info).toHaveBeenCalledWith(t('deploy.buildStarted'));
            expect(mockLogger.info).toHaveBeenCalledWith(t('deploy.deployStarted'));
            expect(mockLogger.info).toHaveBeenCalledWith(t('deploy.success'));
        });

        test('should proceed without confirmation when callback is not provided', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);

            await deployCf(mtaRoot, {}, mockLogger);

            expect(mockCommandRunnerRun).toHaveBeenCalledTimes(2);
        });

        test('should throw when build fails', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);
            mockCommandRunnerRun.mockRejectedValueOnce('Build error: missing dependency');

            await expect(deployCf(mtaRoot, {}, mockLogger)).rejects.toThrow(
                t('deploy.buildFailed', { error: 'Build error: missing dependency' })
            );
        });

        test('should throw when CF deploy fails', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);
            mockCommandRunnerRun.mockResolvedValueOnce(undefined); // build succeeds
            mockCommandRunnerRun.mockRejectedValueOnce('Deploy error: insufficient permissions');

            await expect(deployCf(mtaRoot, {}, mockLogger)).rejects.toThrow(
                t('deploy.deployFailed', { error: 'Deploy error: insufficient permissions' })
            );
        });

        test('should call onOutput callback with summary', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockReturnValue(true);
            getYamlContent.mockReturnValue(sampleMtaYaml);

            const onOutput = jest.fn();

            await deployCf(mtaRoot, { onOutput }, mockLogger);

            expect(onOutput).toHaveBeenCalledTimes(1);
            expect(onOutput).toHaveBeenCalledWith(expect.stringContaining('mta-project-name: my-mta-project'));
        });

        test('should find MTA root in parent directory', async () => {
            isCfInstalled.mockResolvedValue(true);
            loadCfConfig.mockReturnValue(sampleCfConfig);
            isLoggedInCf.mockResolvedValue(true);
            isMtaProject.mockImplementation((p: string) => p === mtaRoot);
            getYamlContent.mockReturnValue(sampleMtaYaml);

            await deployCf(appPath, {}, mockLogger);

            expect(mockCommandRunnerRun).toHaveBeenCalledTimes(2);
        });
    });
});
