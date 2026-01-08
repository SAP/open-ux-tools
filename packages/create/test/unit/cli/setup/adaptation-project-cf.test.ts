import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { join } from 'path';
import type { Store } from 'mem-fs';
import type { Editor, create } from 'mem-fs-editor';
import { addSetupAdaptationProjectCFCommand } from '../../../../src/cli/setup/adaptation-project-cf';
import * as logger from '../../../../src/tracing/logger';
import * as tracer from '../../../../src/tracing/trace';
import * as validation from '../../../../src/validation';
import * as projectAccess from '@sap-ux/project-access';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as fs from 'fs';
import { Cli } from '@sap/cf-tools';
import { CommandRunner } from '@sap-ux/nodejs-utils';

jest.mock('fs');
jest.mock('@sap-ux/project-access');
jest.mock('@sap-ux/adp-tooling');
jest.mock('@sap/cf-tools');
jest.mock('@sap-ux/nodejs-utils');

const mockCommit = jest.fn().mockImplementation((_, cb) => cb(null));
jest.mock('mem-fs-editor', () => {
    const editor = jest.requireActual<{ create: typeof create }>('mem-fs-editor');
    return {
        ...editor,
        create(store: Store) {
            const memFs: Editor = editor.create(store);
            memFs.commit = mockCommit;
            return memFs;
        }
    };
});

const mockExistsSync = fs.existsSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;
const mockReadUi5Yaml = projectAccess.readUi5Yaml as jest.Mock;
const mockLoadCfConfig = adpTooling.loadCfConfig as jest.Mock;
const mockGetServiceInstanceKeys = adpTooling.getServiceInstanceKeys as jest.Mock;
const mockGetAppHostIds = adpTooling.getAppHostIds as jest.Mock;
const mockGetVariant = adpTooling.getVariant as jest.Mock;
const mockGetCfUi5AppInfo = adpTooling.getCfUi5AppInfo as jest.Mock;
const mockGetBackendUrlsWithPaths = adpTooling.getBackendUrlsWithPaths as jest.Mock;
const mockCliExecute = Cli.execute as jest.Mock;
const mockCommandRunnerRun = CommandRunner.prototype.run as jest.Mock;

describe('setup/adaptation-project-cf', () => {
    const appRoot = join(__dirname, '../../../fixtures/adaptation-project');
    const getArgv = (...arg: string[]) => ['', '', 'adaptation-project-cf', ...arg];

    let loggerMock: ToolsLogger;
    let logLevelSpy: jest.SpyInstance;
    let validateSpy: jest.SpyInstance;
    let traceChangesSpy: jest.SpyInstance;

    const mockCfConfig = {
        org: { Name: 'test-org' },
        space: { Name: 'test-space' },
        token: 'test-token',
        url: 'https://api.cf.example.com'
    };

    const mockServiceKeys = [
        {
            credentials: {
                uaa: {
                    url: 'https://uaa.example.com',
                    clientid: 'test-client',
                    clientsecret: 'test-secret'
                },
                uri: 'https://service.example.com',
                endpoints: {
                    'backend-dest': {
                        url: 'https://backend.example.com',
                        destination: 'backend-dest'
                    }
                },
                'html5-apps-repo': {
                    app_host_id: 'host-123'
                }
            }
        }
    ];

    const mockUi5Config = {
        findCustomMiddleware: jest.fn(),
        removeCustomMiddleware: jest.fn(),
        addCustomMiddleware: jest.fn(),
        findCustomTask: jest.fn(),
        toString: jest.fn().mockReturnValue('mocked ui5.yaml content')
    };

    const mockUi5AppInfo = {
        'test.app': {
            asyncHints: {
                libs: [
                    {
                        name: 'test.lib',
                        html5AppName: 'test-lib-app',
                        url: { url: 'https://lib.example.com' }
                    }
                ]
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockCommit.mockImplementation((_, cb) => cb(null));

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;

        jest.spyOn(logger, 'getLogger').mockReturnValue(loggerMock);
        logLevelSpy = jest.spyOn(logger, 'setLogLevelVerbose').mockImplementation(() => undefined);
        validateSpy = jest.spyOn(validation, 'validateBasePath').mockResolvedValue(undefined);
        traceChangesSpy = jest.spyOn(tracer, 'traceChanges').mockResolvedValue(undefined);

        mockCliExecute.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
        mockCommandRunnerRun.mockResolvedValue(undefined);
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(mockUi5AppInfo));
        mockWriteFileSync.mockReturnValue(undefined);

        mockUi5Config.findCustomMiddleware.mockReturnValue(null);
        mockUi5Config.removeCustomMiddleware.mockClear();
        mockUi5Config.addCustomMiddleware.mockClear();
        mockUi5Config.findCustomTask.mockReturnValue({ configuration: { serviceInstanceName: 'test-service' } });
        mockUi5Config.toString.mockReturnValue('mocked ui5.yaml content');

        mockReadUi5Yaml.mockResolvedValue(mockUi5Config);
        mockLoadCfConfig.mockReturnValue(mockCfConfig);
        mockGetServiceInstanceKeys.mockResolvedValue({ serviceKeys: mockServiceKeys });
        mockGetAppHostIds.mockReturnValue(['host-123']);
        mockGetVariant.mockResolvedValue({ reference: 'test.reference.app' });
        mockGetCfUi5AppInfo.mockResolvedValue(mockUi5AppInfo);
        mockGetBackendUrlsWithPaths.mockReturnValue([
            { url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }
        ]);
    });

    describe('addSetupAdaptationProjectCFCommand', () => {
        test('should add command with correct options', () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            const adaptationProjectCFCommand = command.commands.find((cmd) => cmd.name() === 'adaptation-project-cf');
            expect(adaptationProjectCFCommand).toBeDefined();
        });

        test('should set log level verbose when --verbose flag is used', async () => {
            mockExistsSync.mockReturnValue(false);

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            try {
                await command.parseAsync(getArgv(appRoot, '--verbose'));
            } catch (error) {
                // Expected to throw due to missing manifest
            }

            expect(logLevelSpy).toHaveBeenCalled();
        });
    });

    describe('setupAdaptationProjectCF', () => {
        test('should complete full setup successfully', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(validateSpy).toHaveBeenCalledWith(appRoot);
            expect(mockCliExecute).toHaveBeenCalledWith(['oauth-token'], { env: { 'CF_COLOR': 'false' } });
            expect(loggerMock.info).toHaveBeenCalledWith('CF adaptation project setup complete!');
        });

        test('should use current directory when path not provided', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv());

            expect(validateSpy).toHaveBeenCalledWith(process.cwd());
        });

        test('should throw error when not logged in to CF', async () => {
            mockCliExecute.mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'Not logged in' });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(
                expect.stringContaining('You are not logged in to Cloud Foundry')
            );
        });

        test('should throw error when not an adaptation project', async () => {
            mockExistsSync.mockReturnValue(false);

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Not an adaptation project'));
        });
    });

    describe('fetchUi5AppInfo', () => {
        test('should fetch and write ui5AppInfo.json', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockGetCfUi5AppInfo).toHaveBeenCalledWith(
                'test.reference.app',
                ['host-123'],
                mockCfConfig,
                loggerMock
            );
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                join(appRoot, 'ui5AppInfo.json'),
                expect.any(String),
                'utf-8'
            );
            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('Written ui5AppInfo.json'));
        });

        test('should throw error when no app host IDs found', async () => {
            mockGetAppHostIds.mockReturnValue([]);

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(
                expect.stringContaining('No app host IDs found in service keys')
            );
        });
    });

    describe('buildProject', () => {
        test('should build project with ADP_BUILDER_MODE=preview', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockCommandRunnerRun).toHaveBeenCalledWith(
                'npm',
                ['run', 'build'],
                expect.objectContaining({
                    cwd: appRoot,
                    env: expect.objectContaining({ ADP_BUILDER_MODE: 'preview' })
                })
            );
            expect(loggerMock.info).toHaveBeenCalledWith('Project built successfully');
        });

        test('should throw error when build fails', async () => {
            mockCommandRunnerRun.mockRejectedValueOnce(new Error('Build failed'));

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Build failed'));
        });

        test('should handle build error without status code', async () => {
            mockCommandRunnerRun.mockRejectedValueOnce(new Error('Build failed without status'));

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Build failed without status'));
        });
    });

    describe('addServeStaticMiddleware', () => {
        test('should add fiori-tools-servestatic configuration', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockUi5Config.addCustomMiddleware).toHaveBeenCalledWith([
                expect.objectContaining({
                    name: 'fiori-tools-servestatic',
                    beforeMiddleware: 'compression',
                    configuration: {
                        paths: expect.arrayContaining([
                            expect.objectContaining({
                                path: '/resources/test/lib',
                                src: './.reuse/test-lib-app',
                                fallthrough: false
                            })
                        ])
                    }
                })
            ]);
            expect(loggerMock.info).toHaveBeenCalledWith('Successfully added fiori-tools-servestatic to ui5.yaml');
        });

        test('should remove existing fiori-tools-servestatic before adding', async () => {
            let callCount = 0;
            mockUi5Config.findCustomMiddleware.mockImplementation(() => {
                callCount++;
                return callCount === 1 ? { name: 'fiori-tools-servestatic' } : null;
            });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockUi5Config.removeCustomMiddleware).toHaveBeenCalledWith('fiori-tools-servestatic');
        });

        test('should skip when ui5AppInfo.json not found', async () => {
            mockExistsSync.mockImplementation((path) => {
                if (path.includes('ui5AppInfo.json')) {
                    return false;
                }
                return true;
            });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('ui5AppInfo.json not found'));
        });

        test('should skip when no reusable libraries found', async () => {
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    'test.app': {
                        asyncHints: {
                            libs: []
                        }
                    }
                })
            );

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('No reusable libraries found'));
        });

        test('should throw error when fs.commit fails for servestatic', async () => {
            mockCommit.mockImplementationOnce((_, cb) => cb(new Error('Commit failed')));

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.warn).toHaveBeenCalledWith(
                expect.stringContaining('Could not add fiori-tools-servestatic configuration')
            );
        });

        test('should handle ui5AppInfo with missing asyncHints', async () => {
            mockReadFileSync.mockReturnValue(
                JSON.stringify({
                    'test.app': {}
                })
            );

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('No reusable libraries found'));
        });
    });

    describe('addBackendProxyMiddleware', () => {
        test('should add backend-proxy-middleware-cf configuration', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockUi5Config.addCustomMiddleware).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'backend-proxy-middleware-cf',
                        afterMiddleware: 'compression',
                        configuration: {
                            backends: [{ url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }]
                        }
                    })
                ])
            );
            expect(loggerMock.info).toHaveBeenCalledWith('Successfully added backend-proxy-middleware-cf to ui5.yaml');
        });

        test('should remove existing backend-proxy-middleware-cf before adding', async () => {
            let callCount = 0;
            mockUi5Config.findCustomMiddleware.mockImplementation((name) => {
                if (name === 'backend-proxy-middleware-cf') {
                    callCount++;
                    return callCount === 1 ? { name: 'backend-proxy-middleware-cf' } : null;
                }
                return null;
            });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockUi5Config.removeCustomMiddleware).toHaveBeenCalledWith('backend-proxy-middleware-cf');
        });

        test('should skip when no backend URLs found', async () => {
            mockGetBackendUrlsWithPaths.mockReturnValue([]);

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('No backend URLs with paths found'));
        });

        test('should warn when fs.commit fails for backend proxy', async () => {
            let commitCallCount = 0;
            mockCommit.mockImplementation((_, cb) => {
                commitCallCount++;
                if (commitCallCount === 2) {
                    cb(new Error('Backend proxy commit failed'));
                } else {
                    cb(null);
                }
            });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(loggerMock.warn).toHaveBeenCalledWith(
                expect.stringContaining('Could not add backend-proxy-middleware-cf configuration')
            );
        });
    });

    describe('getCfConfig', () => {
        test('should load and validate CF config', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockLoadCfConfig).toHaveBeenCalledWith(loggerMock);
            expect(loggerMock.info).toHaveBeenCalledWith(
                expect.stringContaining('Using CF org: test-org, space: test-space')
            );
        });

        test('should throw error when CF config is incomplete', async () => {
            mockLoadCfConfig.mockReturnValue({
                org: null,
                space: null,
                token: null,
                url: null
            });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Incomplete CF configuration'));
        });
    });

    describe('getBaseAppId', () => {
        test('should extract app ID from variant', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockGetVariant).toHaveBeenCalledWith(appRoot);
            expect(loggerMock.info).toHaveBeenCalledWith(
                expect.stringContaining('Read appId from manifest.appdescr_variant: test.reference.app')
            );
        });

        test('should throw error when no reference found', async () => {
            mockGetVariant.mockResolvedValue({});

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(
                expect.stringContaining('No reference found in manifest.appdescr_variant')
            );
        });
    });

    describe('fetchServiceKeys', () => {
        test('should fetch service keys from CF', async () => {
            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);
            await command.parseAsync(getArgv(appRoot));

            expect(mockGetServiceInstanceKeys).toHaveBeenCalledWith({ names: ['test-service'] }, loggerMock);
        });

        test('should throw error when serviceInstanceName not found', async () => {
            mockUi5Config.findCustomTask.mockReturnValue({ configuration: {} });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('No serviceInstanceName found'));
        });

        test('should throw error when no service keys found', async () => {
            mockGetServiceInstanceKeys.mockResolvedValue({ serviceKeys: [] });

            const command = new Command('setup');
            addSetupAdaptationProjectCFCommand(command);

            await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow();
            expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('No service keys found'));
        });
    });
});
