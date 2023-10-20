import type { ParseOptions } from 'commander';
import { join } from 'path';
import { createCommand, runDeploy, runUndeploy } from '../../../src/cli';
import * as cliArchive from '../../../src/cli/archive';
import { mockedUi5RepoService, mockedProvider } from '../../__mocks__';
import { Command } from 'commander';
import fs from 'fs';
import { ToolsLogger } from '@sap-ux/logger';
import ProcessEnv = NodeJS.ProcessEnv;

describe('cli', () => {
    const fixture = join(__dirname, '../../fixtures/simple-app/');
    const target = 'https://target.example';
    let env: ProcessEnv;

    beforeAll(() => {
        env = process.env;
    });

    beforeEach(() => {
        mockedUi5RepoService.deploy.mockReset();
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = env;
    });

    describe('runDeploy', () => {
        const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync');
        const cliArchiveSpy = jest.spyOn(cliArchive, 'getArchive');
        // Command for deploying with a configuration file, assumes 'dist' is the target archive folder if no archive-folder or archive-path is specified;
        // npx deploy -c ui5-deploy.yaml --archive-folder webapp
        const minimumConfigCmds = [
            'node',
            'test',
            '-c',
            join(fixture, 'ui5-deploy.yaml'),
            '--archive-folder',
            'webapp'
        ];
        // Command for deploying with a configuration file but overwriting parts of the configuration file
        // npx deploy -c ui5-deploy.yaml --archive-folder webapp --test --yes --url https://target.example
        const overwriteConfigCmds = [
            'node',
            'test',
            '-c',
            join(fixture, 'ui5-deploy.yaml'),
            '--archive-folder',
            'webapp',
            '--test',
            '--yes',
            '--url',
            target
        ];

        // cli command(s), without a configuration file
        // npx deploy --name Z_TEST --description 'Travel App' --package $TMP --transport SAP20230433 --archive-folder webapp --yes --destination ABAP-Target
        // npx deploy --url https://target.example --name Z_TEST --description 'Travel App' --package $TMP --transport SAP20230433 --archive-folder webapp --yes
        const cliCmds = [
            'node',
            'test',
            '--url',
            target,
            '--name',
            'Z_TEST',
            '--description',
            'Test App',
            '--package',
            '$TMP',
            '--transport',
            'SAP20230433',
            '--archive-folder',
            join(fixture, 'webapp'),
            '--yes',
            '--no-retry',
            '--no-strict-ssl'
        ];

        const cliCmdsWithUaa = [...cliCmds, '--cloud-service-env', '--service', '/bc/my/uaa/deploy/service'];

        test.each([
            {
                params: minimumConfigCmds,
                writeFileSyncCalled: 1,
                object: { retry: true, strictSsl: true },
                provider: '/bc/my/deploy/service'
            },
            {
                params: overwriteConfigCmds,
                writeFileSyncCalled: 1,
                object: { retry: true, strictSsl: true },
                provider: '/bc/my/deploy/service'
            },
            { params: cliCmds, writeFileSyncCalled: 0, object: { retry: false, strictSsl: false } },
            {
                params: cliCmdsWithUaa,
                writeFileSyncCalled: 0,
                object: { retry: false, strictSsl: false },
                provider: '/bc/my/uaa/deploy/service'
            }
        ])('successful deploy with different options %s', async ({ params, writeFileSyncCalled, object, provider }) => {
            process.argv = params;
            await runDeploy();
            expect(mockedUi5RepoService.deploy).toBeCalled();
            expect(mockedProvider.getUi5AbapRepository).toBeCalledWith(provider);
            expect(writeFileSyncSpy).toHaveBeenCalledTimes(writeFileSyncCalled);
            if (writeFileSyncCalled > 0) {
                expect(writeFileSyncSpy.mock.calls[0][0]).toBe('archive.zip');
            }
            expect(cliArchiveSpy).toBeCalled();
            expect(cliArchiveSpy).toBeCalledWith(expect.any(ToolsLogger), expect.objectContaining(object));
        });
    });

    describe('runUndeploy', () => {
        test('successful undeploy with configuration file', async () => {
            const target = 'https://target.example';
            process.argv = ['node', 'test', '-c', join(fixture, 'ui5-deploy.yaml'), '--test', '--yes', '--url', target];
            await runUndeploy();
            expect(mockedUi5RepoService.undeploy).toBeCalled();
        });

        test('successful undeploy with environment variable and no config file', async () => {
            process.argv = [
                'node',
                'test',
                '--test',
                '--yes',
                '--url',
                'https://target.example',
                '--name',
                'MyAppName',
                '--cloud-service-env',
                '--no-retry',
                '--service',
                '/bc/my/service'
            ];
            await runUndeploy();
            expect(mockedUi5RepoService.undeploy).toBeCalled();
        });
    });

    describe('deploy | undeploy should handle exception', () => {
        afterAll(() => {
            jest.resetAllMocks();
        });

        test.each([runDeploy, runUndeploy])(
            'unsuccessful deploy | undeploy, help options is shown if no parameters are passed in $param',
            async (method) => {
                // Don't exit the jest process
                const mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => {
                    throw new Error('process.exit: ' + number);
                });
                const errorMock = jest.spyOn(Command.prototype, 'error').mockImplementation();
                const helpMock = jest.spyOn(Command.prototype, 'help');
                process.argv = ['node', 'test'];
                await method();
                expect(helpMock).toBeCalled();
                expect(errorMock).toBeCalled();
                expect(mockExit).toHaveBeenCalledWith(0);
                mockExit.mockRestore();
                errorMock.mockReset();
            }
        );
    });

    describe('createCommand', () => {
        function makeCommand() {
            const actionMock = jest.fn();
            const cmd = createCommand('deploy');
            cmd.exitOverride()
                .configureOutput({
                    writeErr: jest.fn(),
                    writeOut: jest.fn()
                })
                .action(actionMock);

            return { cmd, actionMock };
        }
        // parse options for testing
        const opts: ParseOptions = { from: 'user' };

        test('minimum parameters', () => {
            const { cmd } = makeCommand();
            const config = join(fixture, 'ui5-deploy.yaml');
            cmd.parse(['-c', config], opts);
            expect(cmd.opts().config).toBe(config);
        });

        test.each([
            {
                params: ['--url', '~url', '--destination', '~dest'],
                error: /'--destination <destination>' cannot be used with option '--url <target-url>/
            },
            {
                params: ['--client', '001', '--destination', '~dest'],
                error: /'--client <sap-client>' cannot be used with option '--destination <destination>/
            },
            {
                params: ['--cloud', '--destination', '~dest'],
                error: /'--cloud' cannot be used with option '--destination <destination>/
            },
            {
                params: ['--transport', '~transport', '--create-transport', 'true'],
                error: /'--create-transport' cannot be used with option '--transport <transport-request>/
            },
            {
                params: ['--username', '~username', '--cloud-service-env'],
                error: /'--username <username>' cannot be used with option '--cloud-service-env'/
            },
            {
                params: ['--username', '~username', '--cloud-service-key', '~path'],
                error: /'--username <username>' cannot be used with option '--cloud-service-key <file-location>'/
            }
        ])('conflicting options $params', ({ params, error }) => {
            const { cmd } = makeCommand();
            expect(() => {
                cmd.parse(params, opts);
            }).toThrow(error);
        });

        test.each([
            { params: ['--username', '~username', '--destination', '~dest'] },
            { params: ['--username', '~username', '--password', '~password', '--destination', '~dest'] }
        ])('Supporting options $params', ({ params }) => {
            const { cmd, actionMock } = makeCommand();
            cmd.parse(params, opts);
            expect(actionMock).toHaveBeenCalledTimes(1);
        });
    });
});
