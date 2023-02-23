import type { ParseOptions } from 'commander';
import { join } from 'path';
import { createCommand, runDeploy, runUndeploy } from '../../../src/cli';
import { mockedUi5RepoService } from '../../__mocks__';
import { Command } from 'commander';

describe('cli', () => {
    const fixture = join(__dirname, '../../test-input/');
    const target = 'https://target.example';

    beforeEach(() => {
        mockedUi5RepoService.deploy.mockReset();
    });

    describe('runDeploy', () => {
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
            '--yes'
        ];

        test.each([{ params: minimumConfigCmds }, { params: overwriteConfigCmds }, { params: cliCmds }])(
            'successful deploy with different options',
            async ({ params }) => {
                process.argv = params;
                await runDeploy();
                expect(mockedUi5RepoService.deploy).toBeCalled();
            }
        );
    });

    describe('runUndeploy', () => {
        test('successful undeploy with configuration file', async () => {
            const target = 'https://target.example';
            process.argv = ['node', 'test', '-c', join(fixture, 'ui5-deploy.yaml'), '--test', '--yes', '--url', target];
            await runUndeploy();
            expect(mockedUi5RepoService.undeploy).toBeCalled();
        });

        test('unsuccessful undeploy, help options is shown if no parameters are passed in', async () => {
            // Dont exit the jest process
            const mockExit = jest.spyOn(process, 'exit').mockImplementation((number) => {
                throw new Error('process.exit: ' + number);
            });
            const errorMock = jest.spyOn(Command.prototype, 'error').mockImplementation();
            const helpMock = jest.spyOn(Command.prototype, 'help');
            process.argv = ['node', 'test'];
            await runUndeploy();
            expect(helpMock).toBeCalled();
            expect(errorMock).toBeCalled();
            expect(mockExit).toHaveBeenCalledWith(0);
            mockExit.mockRestore();
        });
    });

    describe('createCommand', () => {
        const cmd = createCommand('deploy');
        const errorMock = jest.spyOn(cmd, 'error').mockImplementation();
        // parse options for testing
        const opts: ParseOptions = { from: 'user' };

        afterEach(() => {
            errorMock.mockClear();
        });

        test('minimum parameters', () => {
            const config = join(fixture, 'ui5-deploy.yaml');
            cmd.parse(['-c', config], opts);
            expect(errorMock).not.toBeCalled();
            expect(cmd.opts().config).toBe(config);
        });

        test.each([
            { params: ['--url', '~url', '--destination', '~dest'] },
            { params: ['--client', '001', '--destination', '~dest'] },
            { params: ['--scp', '--destination', '~dest'] }
        ])('conflicting options $params', ({ params }) => {
            cmd.parse(params, opts);
            expect(errorMock).toBeCalled();
            errorMock.mockClear();
        });
    });
});
