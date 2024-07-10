import { buildUI5Option, generateNewFioriLaunchConfig, getFioriOptions } from '../../src';
import type { LaunchConfig } from '../../src';
import { TestPaths } from '../test-data/utils';

describe('utils', () => {
    describe('buildUI5Option', () => {
        it('should return build UI5 option', () => {
            expect(buildUI5Option('Latest')).toStrictEqual(['--ui5', ' ', '--ui5Uri', 'https://ui5.sap.com']);
            expect(buildUI5Option('snapshot')).toStrictEqual([
                '--ui5',
                'snapshot',
                '--ui5Uri',
                'https://sapui5preview-sapui5.dispatcher.int.sap.eu2.hana.ondemand.com'
            ]);
        });
    });

    describe('generateNewFioriLaunchConfig', () => {
        it('should generate Launch config with internal UI5 version', () => {
            const launchConfig = generateNewFioriLaunchConfig('WORKSPACE_FOLDER', {
                name: 'TEST_NAME',
                projectRoot: TestPaths.v2,
                ui5Version: 'snapshot',
                ui5VersionUri: 'https://sapui5preview-sapui5.dispatcher.int.sap.eu2.hana.ondemand.com'
            });
            expect(launchConfig.env.FIORI_TOOLS_UI5_VERSION).toEqual('snapshot');
            expect(launchConfig.env.FIORI_TOOLS_UI5_URI).toEqual(
                'https://sapui5preview-sapui5.dispatcher.int.sap.eu2.hana.ondemand.com'
            );
            expect(launchConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toBeUndefined();
            expect(launchConfig.runtimeExecutable).toEqual('npx');
            expect(launchConfig.windows.runtimeExecutable).toEqual('npx.cmd');
        });

        it('should generate Launch config with mock data', () => {
            const launchConfig = generateNewFioriLaunchConfig('WORKSPACE_FOLDER', {
                name: 'TEST_NAME',
                projectRoot: TestPaths.v2,
                projectVersion: '2.0',
                useMockData: true
            });
            expect(launchConfig.args).toStrictEqual(['--config', 'ui5-mock.yaml']);
            expect(launchConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toBeUndefined();
            expect(launchConfig.runtimeExecutable).toEqual('npx');
            expect(launchConfig.windows.runtimeExecutable).toEqual('npx.cmd');
        });

        it('should generate Launch config with mock data and ui5 local', () => {
            const launchConfig = generateNewFioriLaunchConfig('WORKSPACE_FOLDER', {
                name: 'TEST_NAME',
                projectRoot: TestPaths.v2,
                projectVersion: '2.0',
                useMockData: true,
                ui5Local: true,
                ui5LocalVersion: '1.101.1'
            });
            expect(launchConfig.args).toStrictEqual(['--config', 'ui5-local.yaml', '--framework-version', '1.101.1']);
            expect(launchConfig.env.FIORI_TOOLS_BACKEND_CONFIG).toBeUndefined();
            expect(launchConfig.env.FIORI_TOOLS_UI5_VERSION).toBeUndefined();
            expect(launchConfig.env.FIORI_TOOLS_UI5_URI).toBeUndefined();
        });

        it('should generate Launch config with start file', () => {
            const launchConfig = generateNewFioriLaunchConfig('WORKSPACE_FOLDER', {
                name: 'TEST_NAME',
                projectRoot: TestPaths.v2,
                projectVersion: '2.0',
                startFile: 'index.html'
            });
            expect(launchConfig.args).toStrictEqual(['--open', 'index.html']);
        });
    });

    describe('getFioriOptions', () => {
        const projectRoot = 'path/to/my/app';
        const defaultLaunchConfig = {
            name: 'start app',
            cwd: projectRoot,
            runtimeArgs: ['fiori', 'run'],
            type: 'node',
            request: 'launch',
            runtimeExecutable: 'npx',
            args: [],
            windows: {
                runtimeExecutable: 'npx.cmd'
            },
            console: 'internalConsole',
            internalConsoleOptions: 'openOnSessionStart',
            outputCapture: 'std',
            env: { 'run.config': '' }
        };
        const fioriElementsVersion = '2.0';

        it('should get default options', () => {
            const fioriOptions = getFioriOptions(
                defaultLaunchConfig as LaunchConfig,
                projectRoot,
                fioriElementsVersion
            );
            expect(fioriOptions).toEqual(
                expect.objectContaining({
                    name: 'start app',
                    projectRoot: projectRoot,
                    projectVersion: fioriElementsVersion,
                    ui5Local: false,
                    useMockData: false,
                    visible: true
                })
            );
        });

        it('should resolve startFile', () => {
            const fioriOptions = getFioriOptions(
                { ...defaultLaunchConfig, args: ['--open', 'index.html'] } as LaunchConfig,
                projectRoot,
                fioriElementsVersion
            );
            expect(fioriOptions).toEqual(expect.objectContaining({ startFile: 'index.html' }));
        });

        it('should resolve useMockData', () => {
            const fioriOptions = getFioriOptions(
                { ...defaultLaunchConfig, args: ['--config', 'ui5-mock.yaml'] } as LaunchConfig,
                projectRoot,
                fioriElementsVersion
            );
            expect(fioriOptions).toEqual(expect.objectContaining({ useMockData: true }));
        });

        it('should resolve ui5Local', () => {
            const fioriOptions = getFioriOptions(
                { ...defaultLaunchConfig, args: ['--config', 'ui5-local.yaml'] } as LaunchConfig,
                projectRoot,
                fioriElementsVersion
            );
            expect(fioriOptions).toEqual(expect.objectContaining({ useMockData: true, ui5Local: true }));
        });

        it('should resolve ui5LocalVersion', () => {
            const fioriOptions = getFioriOptions(
                {
                    ...defaultLaunchConfig,
                    args: ['--config', 'ui5-local.yaml', '--framework-version', '1.100.1']
                } as LaunchConfig,
                projectRoot,
                fioriElementsVersion
            );
            expect(fioriOptions).toEqual(expect.objectContaining({ ui5LocalVersion: '1.100.1' }));
        });

        it('should resolve env', () => {
            const fioriOptions = getFioriOptions(
                {
                    ...defaultLaunchConfig,
                    env: {
                        'run.config': '{"handlerId":"fiori_tools","runnableId":"/my/bas/path/to/app"}',
                        FIORI_TOOLS_BACKEND_CONFIG: '[{"path":"/sap","url":"https://mybackend","client":"123"}]',
                        FIORI_TOOLS_URL_PARAMS: 'sap-ui-xx-viewCache=false',
                        FIORI_TOOLS_UI5_VERSION: '1.101.1',
                        FIORI_TOOLS_UI5_URI: 'https://ui5.sap.com'
                    }
                } as LaunchConfig,
                projectRoot,
                fioriElementsVersion
            );
            expect(fioriOptions).toEqual(
                expect.objectContaining({
                    projectRoot: '/my/bas/path/to/app',
                    ui5Version: '1.101.1',
                    ui5VersionUri: 'https://ui5.sap.com',
                    urlParameters: 'sap-ui-xx-viewCache=false',
                    backendConfigs: JSON.parse('[{"path":"/sap","url":"https://mybackend","client":"123"}]')
                })
            );
        });

        it('should not resolve a fiori launch config', () => {
            expect(() => {
                getFioriOptions(
                    { env: {}, cwd: '${workspaceFolder}' } as LaunchConfig,
                    projectRoot,
                    fioriElementsVersion
                );
            }).not.toThrow();
        });

        it('should return workspaceRoot if cwd is not set', () => {
            const workspaceRoot = 'my/workspace/root';
            const result = getFioriOptions({ type: 'node' } as LaunchConfig, workspaceRoot, fioriElementsVersion);
            expect(result.projectRoot).toEqual(workspaceRoot);
        });

        it('should return workspaceRoot if cwd is not set', () => {
            const result = getFioriOptions(
                { env: {}, cwd: '${workspaceFolder}', type: 'chrome' } as unknown as LaunchConfig,
                projectRoot,
                fioriElementsVersion
            );
            expect(result.visible).toBeFalsy();
        });
    });
});
