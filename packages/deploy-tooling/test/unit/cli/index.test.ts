import type { ParseOptions } from 'commander';
import { join } from 'path';
import { createCommand, runDeploy, runUndeploy } from '../../../src/cli';
import { mockedUi5RepoService } from '../../__mocks__';
import { Command } from 'commander';

describe('cli', () => {
    const fixture = join(__dirname, '../../test-input/');
    beforeEach(() => {
        mockedUi5RepoService.deploy.mockReset();
    });

    describe('runDeploy', () => {
        test('successful run', async () => {
            const target = 'https://target.example';
            process.argv = [
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
            await runDeploy();
            expect(mockedUi5RepoService.deploy).toBeCalled();
        });
    });

    describe('runUndeploy', () => {
        test('successful run', async () => {
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
