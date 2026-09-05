import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { executeStartCommand, parseStartCommand } from '../../src/start.js';

function childProcess(): ChildProcess {
    const child = new EventEmitter() as ChildProcess;
    child.kill = jest.fn(() => true);
    return child;
}

describe('start-mock launcher', () => {
    test('keeps the standard mockserver path disabled by default', () => {
        expect(
            parseStartCommand(['start', '--', 'fiori', 'run', '--config', './ui5-mock.yaml'], {
                PATH: '/test/bin',
                SAP_UX_MOCKGEN_ENABLED: '1'
            })
        ).toEqual({
            command: 'fiori',
            args: ['run', '--config', './ui5-mock.yaml'],
            env: { PATH: '/test/bin', SAP_UX_MOCKGEN_ENABLED: '0' },
            mockgenEnabled: false
        });
    });

    test('consumes the exact mockgen flag without changing the Fiori arguments', () => {
        expect(
            parseStartCommand(
                [
                    'start',
                    '--',
                    'fiori',
                    'run',
                    '--config',
                    './ui5-mock.yaml',
                    '--open',
                    'test/flpSandbox.html?sap-client=902',
                    '--mockgen'
                ],
                { PATH: '/test/bin' }
            )
        ).toEqual({
            command: 'fiori',
            args: ['run', '--config', './ui5-mock.yaml', '--open', 'test/flpSandbox.html?sap-client=902'],
            env: { PATH: '/test/bin', SAP_UX_MOCKGEN_ENABLED: '1' },
            mockgenEnabled: true
        });
    });

    test.each([
        { argv: ['start'], message: /requires -- before the child command/i },
        { argv: ['start', '--'], message: /requires a child command/i },
        {
            argv: ['start', '--', 'fiori', 'run', '--mockgen', '--mockgen'],
            message: /may be specified only once/i
        }
    ])('rejects invalid launcher arguments: $argv', ({ argv, message }) => {
        expect(() => parseStartCommand(argv)).toThrow(message);
    });

    test('spawns without a shell, inherits stdio, and returns the child exit code', async () => {
        const child = childProcess();
        const events: string[] = [];
        const assertHostCompatibility = jest.fn(() => events.push('compatibility'));
        const spawn = jest.fn(() => {
            events.push('spawn');
            return child;
        });
        const signalSource = new EventEmitter();
        const completion = executeStartCommand(['start', '--', 'fiori', 'run', '--mockgen'], {
            assertHostCompatibility,
            env: { PATH: '/test/bin' },
            signalSource,
            spawn
        });

        expect(events).toEqual(['compatibility', 'spawn']);
        expect(assertHostCompatibility).toHaveBeenCalledTimes(1);
        expect(spawn).toHaveBeenCalledWith('fiori', ['run'], {
            env: { PATH: '/test/bin', SAP_UX_MOCKGEN_ENABLED: '1' },
            shell: false,
            stdio: 'inherit'
        });

        child.emit('close', 17, null);
        await expect(completion).resolves.toBe(17);
        expect(signalSource.listenerCount('SIGINT')).toBe(0);
        expect(signalSource.listenerCount('SIGTERM')).toBe(0);
        expect(signalSource.listenerCount('SIGHUP')).toBe(0);
    });

    test('does not inspect host compatibility for the standard start', async () => {
        const child = childProcess();
        const assertHostCompatibility = jest.fn();
        const completion = executeStartCommand(['start', '--', 'fiori', 'run'], {
            assertHostCompatibility,
            spawn: () => child
        });

        expect(assertHostCompatibility).not.toHaveBeenCalled();
        child.emit('close', 0, null);
        await expect(completion).resolves.toBe(0);
    });

    test('does not spawn Fiori when the flagged host is incompatible', async () => {
        const spawn = jest.fn();

        await expect(
            executeStartCommand(['start', '--', 'fiori', 'run', '--mockgen'], {
                assertHostCompatibility: () => {
                    throw new Error('MockGen host compatibility failed');
                },
                spawn
            })
        ).rejects.toThrow('MockGen host compatibility failed');
        expect(spawn).not.toHaveBeenCalled();
    });

    test.each(['SIGINT', 'SIGTERM', 'SIGHUP'] as const)('forwards %s and maps a signalled exit', async (signal) => {
        const child = childProcess();
        const signalSource = new EventEmitter();
        const completion = executeStartCommand(['start', '--', 'fiori', 'run'], {
            signalSource,
            spawn: () => child
        });

        signalSource.emit(signal);
        expect(child.kill).toHaveBeenCalledWith(signal);
        child.emit('close', null, signal);

        await expect(completion).resolves.toBe({ SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }[signal]);
    });

    test('rejects a child startup error and removes signal handlers', async () => {
        const child = childProcess();
        const signalSource = new EventEmitter();
        const completion = executeStartCommand(['start', '--', 'missing-command'], {
            signalSource,
            spawn: () => child
        });

        child.emit('error', new Error('spawn ENOENT'));

        await expect(completion).rejects.toThrow('spawn ENOENT');
        expect(signalSource.listenerCount('SIGTERM')).toBe(0);
    });
});
