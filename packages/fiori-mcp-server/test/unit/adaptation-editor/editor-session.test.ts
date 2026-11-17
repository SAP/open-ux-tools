import { jest } from '@jest/globals';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EditorSession } from '../../../src/adaptation-editor/editor-session.js';

const mockWarn = jest.fn();
jest.unstable_mockModule('../../../src/utils/logger.js', () => ({ logger: { warn: mockWarn } }));

const actualFs = await import('node:fs');
const mockWrite = jest.fn<typeof actualFs.writeFileSync>();
const mockRename = jest.fn<typeof actualFs.renameSync>();
const mockUnlink = jest.fn<typeof actualFs.unlinkSync>();
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    writeFileSync: mockWrite,
    renameSync: mockRename,
    unlinkSync: mockUnlink
}));

let {
    assertEditorCanStart,
    registerEditorSession,
    requireEditorSession,
    stopEditorSession,
    stopEditorSessions,
    signalEditor,
    trackEditorProcess,
    terminateEditorProcess
} = await import('../../../src/adaptation-editor/editor-session.js');

class FakeChildProcess extends EventEmitter {
    pid: number | undefined = 1234;
    exitCode: number | null = null;
    signalCode: NodeJS.Signals | null = null;
    killed = false;
    kill = jest.fn<(signal?: NodeJS.Signals | number) => boolean>().mockImplementation(() => {
        this.exit();
        return true;
    });

    exit(): void {
        this.exitCode = 0;
        this.emit('exit', 0, null);
    }

    asChild(): ChildProcess {
        // EventEmitter-backed test double implements the ChildProcess lifecycle under test.
        return this as unknown as ChildProcess;
    }
}

describe('editor session lifecycle', () => {
    let killSpy: jest.SpiedFunction<typeof process.kill>;
    let child: FakeChildProcess;
    let session: EditorSession;
    let sequence = 0;
    const signalFile = join(tmpdir(), 'sap-ux-adp-editor.json');
    const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');

    beforeEach(async () => {
        jest.resetAllMocks();
        jest.resetModules();
        ({
            assertEditorCanStart,
            registerEditorSession,
            requireEditorSession,
            stopEditorSession,
            stopEditorSessions,
            signalEditor,
            trackEditorProcess,
            terminateEditorProcess
        } = await import('../../../src/adaptation-editor/editor-session.js'));
        jest.useFakeTimers();
        Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
        killSpy = jest.spyOn(process, 'kill').mockImplementation(() => {
            throw Object.assign(new Error('No such process'), { code: 'ESRCH' });
        });
        child = new FakeChildProcess();
        const id = sequence++;
        session = {
            localUrl: `http://localhost:8080/test/adaptation-editor.html?session=${id}`,
            browserUrl: `https://port8080.example.cloud.sap/test/adaptation-editor.html?session=${id}`,
            relayToken: 'a'.repeat(64),
            childProcess: child.asChild(),
            autoOpen: true
        };
    });

    afterEach(async () => {
        child.exit();
        killSpy.mockImplementation(() => {
            throw Object.assign(new Error('gone'), { code: 'ESRCH' });
        });
        await jest.advanceTimersByTimeAsync(4000);
        jest.useRealTimers();
        jest.restoreAllMocks();
        if (platformDescriptor) {
            Object.defineProperty(process, 'platform', platformDescriptor);
        }
    });

    test('retains all session fields under both exact URL aliases', () => {
        registerEditorSession(session);
        expect(requireEditorSession(session.localUrl)).toBe(session);
        expect(requireEditorSession(session.browserUrl)).toBe(session);
        expect(requireEditorSession(session.browserUrl).childProcess).toBe(child);
        expect(requireEditorSession(session.browserUrl).relayToken).toBe('a'.repeat(64));
        expect(mockWrite).not.toHaveBeenCalled();
    });

    test.each([
        'http://127.0.0.1:8080/test/adaptation-editor.html',
        'https://PORT8080.example.cloud.sap/test/adaptation-editor.html',
        'https://port8080.example.cloud.sap/test/adaptation-editor.html/',
        'http://localhost:8080/other.html',
        'https://unknown.example.com/'
    ])('rejects unknown/non-exact URL %s with actionable reopen instructions', (site) => {
        registerEditorSession(session);
        expect(() => requireEditorSession(site)).toThrow(/open_adaptation_editor.*exact returned editor URL/);
        expect(killSpy).not.toHaveBeenCalled();
    });

    test('does not normalize query order, fragments, trailing slashes, or hostname case', () => {
        const requireSession = requireEditorSession;
        session.browserUrl = 'https://EDITOR.example/test/editor.html?a=1&b=2#preview';
        registerEditorSession(session);
        for (const site of [
            'https://editor.example/test/editor.html?a=1&b=2#preview',
            'https://EDITOR.example/test/editor.html?b=2&a=1#preview',
            'https://EDITOR.example/test/editor.html?a=1&b=2',
            `${session.browserUrl}/`
        ]) {
            expect(() => requireSession(site)).toThrow('Unknown editor session');
        }
    });

    test('removes both aliases when the child exits', () => {
        registerEditorSession(session);
        child.exit();
        expect(() => requireEditorSession(session.localUrl)).toThrow('open_adaptation_editor');
        expect(() => requireEditorSession(session.browserUrl)).toThrow('open_adaptation_editor');
    });

    test('an old child exit cannot remove a newer session at the same URLs', () => {
        const oldChild = new FakeChildProcess();
        registerEditorSession({ ...session, childProcess: oldChild.asChild() });
        registerEditorSession(session);
        oldChild.exit();
        expect(requireEditorSession(session.browserUrl)).toBe(session);
    });

    test('rejects registration after startup child exit', () => {
        child.exit();
        expect(() => registerEditorSession(session)).toThrow('exited during startup');
        expect(() => requireEditorSession(session.browserUrl)).toThrow('Unknown editor session');
    });

    test('publishes an atomic private single-mailbox command without token or process details', () => {
        signalEditor('open', session.browserUrl);
        const [temporaryFile, json, options] = mockWrite.mock.calls[0];
        const id = String(JSON.parse(String(json)).id);
        expect(JSON.parse(String(json))).toEqual({ command: 'open', url: session.browserUrl, id });
        expect(id).toMatch(/^[a-f0-9-]{36}$/);
        expect(temporaryFile).toBe(`${signalFile}.${id}.tmp`);
        expect(options).toEqual({ encoding: 'utf8', mode: 0o600, flag: 'wx' });
        expect(mockRename).toHaveBeenCalledWith(temporaryFile, signalFile);
        expect(mockWrite.mock.invocationCallOrder[0]).toBeLessThan(mockRename.mock.invocationCallOrder[0]);
        expect(String(json)).not.toContain(session.relayToken);
        expect(mockUnlink).not.toHaveBeenCalled();
    });

    test('uses a unique command ID and temp file even for the same URL', () => {
        signalEditor('open', session.browserUrl);
        signalEditor('close', session.browserUrl);
        const firstId = String(JSON.parse(String(mockWrite.mock.calls[0][1])).id);
        const secondId = String(JSON.parse(String(mockWrite.mock.calls[1][1])).id);
        expect(firstId).not.toBe(secondId);
        expect(mockWrite.mock.calls[0][0]).not.toBe(mockWrite.mock.calls[1][0]);
        expect(JSON.parse(String(mockWrite.mock.calls[1][1]))).toEqual({
            command: 'close',
            url: session.browserUrl,
            id: secondId
        });
        expect(mockRename.mock.calls.map((call) => call[1])).toEqual([signalFile, signalFile]);
    });

    test.each(['write', 'rename'])(
        'cleans up the temp file on %s failure without exposing errors or credentials',
        (operation) => {
            const error = new Error(`sensitive error ${session.relayToken}`);
            if (operation === 'write') {
                mockWrite.mockImplementationOnce(() => {
                    throw error;
                });
            } else {
                mockRename.mockImplementationOnce(() => {
                    throw error;
                });
            }
            expect(() => signalEditor('open', session.browserUrl)).not.toThrow();
            expect(mockUnlink).toHaveBeenCalledWith(mockWrite.mock.calls[0][0]);
            expect(mockWarn).toHaveBeenCalledWith('Could not write editor open signal');
            expect(JSON.stringify(mockWarn.mock.calls)).not.toContain(session.relayToken);
        }
    );

    test('cleanup failure is best effort too', () => {
        mockWrite.mockImplementationOnce(() => {
            throw new Error('write failed');
        });
        mockUnlink.mockImplementationOnce(() => {
            throw new Error('no file');
        });
        expect(() => signalEditor('close', session.browserUrl)).not.toThrow();
        expect(mockWarn).toHaveBeenCalledTimes(1);
    });

    test('unknown stops never signal, discover, or kill any process', async () => {
        expect(await stopEditorSession('https://port9999.example.cloud.sap/test/editor.html')).toBe(false);
        expect(await stopEditorSession('http://localhost:8080/test/editor.html')).toBe(false);
        expect(mockWrite).not.toHaveBeenCalled();
        expect(killSpy).not.toHaveBeenCalled();
        expect(child.kill).not.toHaveBeenCalled();
    });

    test('server shutdown stops every owned session once, not once per URL alias', async () => {
        const otherChild = new FakeChildProcess();
        const otherSession = {
            ...session,
            localUrl: `${session.localUrl}&other=true`,
            browserUrl: `${session.browserUrl}&other=true`,
            childProcess: otherChild.asChild(),
            autoOpen: false
        };
        await trackEditorProcess(child.asChild(), false);
        await trackEditorProcess(otherChild.asChild(), false);
        registerEditorSession(session);
        registerEditorSession(otherSession);
        await stopEditorSessions();
        expect(child.kill).toHaveBeenCalledTimes(1);
        expect(otherChild.kill).toHaveBeenCalledTimes(1);
        expect(() => requireEditorSession(session.browserUrl)).toThrow('Unknown editor session');
        expect(() => requireEditorSession(otherSession.browserUrl)).toThrow('Unknown editor session');
        expect(mockWrite).toHaveBeenCalledTimes(1);
        await stopEditorSessions();
        expect(child.kill).toHaveBeenCalledTimes(1);
    });

    test('shutdown also stops a tracked process whose URL is not registered yet', async () => {
        await trackEditorProcess(child.asChild(), false);
        await stopEditorSessions();
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');
        expect(mockWrite).not.toHaveBeenCalled();
    });

    test('shutdown waits for a pending spawn and prevents late registration', async () => {
        let spawned: (child: ChildProcess) => void = () => {};
        const childHandle = new Promise<ChildProcess>((resolve) => {
            spawned = resolve;
        });
        const tracked = trackEditorProcess(childHandle, false);
        const rejected = expect(tracked).rejects.toThrow('shutting down');
        let finished = false;
        const shutdown = stopEditorSessions().then(() => {
            finished = true;
        });
        await Promise.resolve();
        expect(finished).toBe(false);
        expect(assertEditorCanStart).toThrow('shutting down');
        expect(() => registerEditorSession(session)).toThrow('shutting down');
        spawned(child.asChild());
        await shutdown;
        await rejected;
        expect(child.kill).toHaveBeenCalledTimes(1);
        expect(() => requireEditorSession(session.browserUrl)).toThrow('Unknown editor session');
        expect(mockWrite).not.toHaveBeenCalled();
    });

    test('a failed pending spawn does not prevent shutdown', async () => {
        const tracked = trackEditorProcess(Promise.reject(new Error('spawn failed')), true);
        const rejected = expect(tracked).rejects.toThrow('spawn failed');
        await stopEditorSessions();
        await rejected;
        expect(killSpy).not.toHaveBeenCalled();
    });

    test('cleans up an owned group when its parent exited before termination began', async () => {
        jest.useFakeTimers();
        await trackEditorProcess(child.asChild(), true);
        let groupAlive = true;
        killSpy.mockImplementation((_pid, signal) => {
            if (signal === 'SIGKILL') {
                groupAlive = false;
            }
            if (!groupAlive) {
                throw Object.assign(new Error('gone'), { code: 'ESRCH' });
            }
            return true;
        });
        child.exit();
        const stopped = terminateEditorProcess(child.asChild());
        await jest.advanceTimersByTimeAsync(4000);
        expect(await stopped).toBe(true);
        expect(killSpy).toHaveBeenCalledWith(-1234, 'SIGTERM');
        expect(killSpy).toHaveBeenCalledWith(-1234, 'SIGKILL');
    });

    test('tracking an already-exited parent still starts cleanup of its remaining group', async () => {
        child.exit();
        let groupAlive = true;
        killSpy.mockImplementation((_pid, signal) => {
            if (signal === 'SIGTERM') {
                groupAlive = false;
            }
            if (signal === 0 && !groupAlive) {
                throw Object.assign(new Error('gone'), { code: 'ESRCH' });
            }
            return true;
        });
        await trackEditorProcess(child.asChild(), true);
        await jest.advanceTimersByTimeAsync(0);
        expect(killSpy).toHaveBeenCalledWith(-1234, 'SIGTERM');
        expect(child.listenerCount('exit')).toBe(0);
        killSpy.mockClear();
        await stopEditorSessions();
        expect(killSpy).not.toHaveBeenCalled();
    });

    test('simultaneous stops through either alias terminate once and signal close once', async () => {
        registerEditorSession(session);
        const first = stopEditorSession(session.browserUrl);
        const second = stopEditorSession(session.localUrl);
        expect(second).toBe(first);
        expect(await first).toBe(true);
        expect(child.kill).toHaveBeenCalledTimes(1);
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');
        expect(killSpy).not.toHaveBeenCalled();
        expect(mockWrite).toHaveBeenCalledTimes(1);
        expect(JSON.parse(String(mockWrite.mock.calls[0][1]))).toEqual(
            expect.objectContaining({ command: 'close', url: session.browserUrl })
        );
        expect(await stopEditorSession(session.browserUrl)).toBe(false);
        expect(mockWrite).toHaveBeenCalledTimes(1);
    });

    test('retains the pending stop after exit removes registry aliases', async () => {
        registerEditorSession(session);
        let duringExit: Promise<boolean> | undefined;
        child.once('exit', () => {
            duringExit = stopEditorSession(session.browserUrl);
        });
        const first = stopEditorSession(session.localUrl);
        expect(await first).toBe(true);
        expect(duringExit).toBe(first);
    });

    test('stops non-relay/non-auto-open editors without sending a close command', async () => {
        session.autoOpen = false;
        delete session.relayToken;
        registerEditorSession(session);
        expect(await stopEditorSession(session.localUrl)).toBe(true);
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');
        expect(mockWrite).not.toHaveBeenCalled();
    });

    test('only explicitly owned detached POSIX children are signalled as a group', async () => {
        await trackEditorProcess(child.asChild(), true);
        killSpy.mockImplementation((pid, signal) => {
            expect(pid).toBe(-1234);
            if (signal === 0) {
                throw Object.assign(new Error('gone'), { code: 'ESRCH' });
            }
            child.exit();
            return true;
        });
        registerEditorSession(session);
        expect(await stopEditorSession(session.browserUrl)).toBe(true);
        expect(killSpy.mock.calls).toEqual([
            [-1234, 'SIGTERM'],
            [-1234, 0]
        ]);
        expect(child.kill).not.toHaveBeenCalled();
    });

    test('detached=false never confers process-group ownership', async () => {
        await trackEditorProcess(child.asChild(), false);
        expect(await terminateEditorProcess(child.asChild())).toBe(true);
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');
        expect(killSpy).not.toHaveBeenCalled();
    });

    test('Windows uses the owned ChildProcess fallback even if detached is requested', async () => {
        Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
        await trackEditorProcess(child.asChild(), true);
        expect(await terminateEditorProcess(child.asChild())).toBe(true);
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');
        expect(killSpy).not.toHaveBeenCalled();
    });

    test('escalates an unresponsive owned child after a bounded graceful wait', async () => {
        jest.useFakeTimers();
        child.kill.mockImplementation((signal) => {
            if (signal === 'SIGKILL') {
                child.exit();
            }
            return true;
        });
        const stopped = terminateEditorProcess(child.asChild());
        await jest.advanceTimersByTimeAsync(1999);
        expect(child.kill.mock.calls).toEqual([['SIGTERM']]);
        await jest.advanceTimersByTimeAsync(1);
        expect(await stopped).toBe(true);
        expect(child.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
        expect(child.listenerCount('exit')).toBe(0);
        expect(jest.getTimerCount()).toBe(0);
    });

    test('escalates the same owned process group, including surviving descendants', async () => {
        jest.useFakeTimers();
        await trackEditorProcess(child.asChild(), true);
        killSpy.mockImplementation((_pid, signal) => {
            if (signal === 'SIGKILL') {
                child.exit();
            }
            if (signal === 0 && child.exitCode !== null) {
                throw Object.assign(new Error('gone'), { code: 'ESRCH' });
            }
            return true;
        });
        const stopped = terminateEditorProcess(child.asChild());
        await jest.advanceTimersByTimeAsync(2000);
        expect(await stopped).toBe(true);
        expect(killSpy.mock.calls).toEqual([
            [-1234, 'SIGTERM'],
            [-1234, 'SIGKILL'],
            [-1234, 0]
        ]);
        expect(child.kill).not.toHaveBeenCalled();
    });

    test('still cleans up descendants when the CLI parent exits first', async () => {
        await trackEditorProcess(child.asChild(), true);
        let groupAlive = true;
        killSpy.mockImplementation((_pid, signal) => {
            if (signal === 'SIGTERM') {
                child.exit();
            }
            if (signal === 'SIGKILL') {
                groupAlive = false;
            }
            if (signal === 0 && !groupAlive) {
                throw Object.assign(new Error('gone'), { code: 'ESRCH' });
            }
            return true;
        });
        const stopped = terminateEditorProcess(child.asChild());
        await jest.advanceTimersByTimeAsync(2000);
        expect(await stopped).toBe(true);
        expect(killSpy.mock.calls.filter(([, signal]) => signal !== 0)).toEqual([
            [-1234, 'SIGTERM'],
            [-1234, 'SIGKILL']
        ]);
    });

    test.each(['alive', 'EPERM'])(
        'does not report success while the group is %s and retains it for shutdown retry',
        async (state) => {
            await trackEditorProcess(child.asChild(), true);
            killSpy.mockImplementation(() => {
                if (state === 'EPERM') {
                    throw Object.assign(new Error('sensitive detail'), { code: 'EPERM' });
                }
                return true;
            });
            child.exit();
            const stopped = terminateEditorProcess(child.asChild());
            await jest.advanceTimersByTimeAsync(4000);
            expect(await stopped).toBe(false);
            killSpy.mockReset().mockImplementation(() => {
                throw Object.assign(new Error('gone'), { code: 'ESRCH' });
            });
            await stopEditorSessions();
            expect(killSpy).toHaveBeenCalledWith(-1234, 0);
            killSpy.mockClear();
            await stopEditorSessions();
            expect(await terminateEditorProcess(child.asChild())).toBe(true);
            expect(killSpy).not.toHaveBeenCalled();
            expect(JSON.stringify(mockWarn.mock.calls)).not.toContain('sensitive detail');
        }
    );

    test('failed termination is bounded, retains ownership for retry, and closes only once', async () => {
        jest.useFakeTimers();
        child.kill.mockReturnValue(false);
        registerEditorSession(session);
        const stopped = stopEditorSession(session.browserUrl);
        await jest.advanceTimersByTimeAsync(4000);
        expect(await stopped).toBe(false);
        expect(requireEditorSession(session.browserUrl)).toBe(session);
        expect(child.listenerCount('exit')).toBe(1);
        child.kill.mockImplementation(() => {
            child.exit();
            return true;
        });
        expect(await stopEditorSession(session.browserUrl)).toBe(true);
        expect(mockWrite).toHaveBeenCalledTimes(1);
    });

    test('deduplicates direct startup-failure cleanup calls', async () => {
        const first = terminateEditorProcess(child.asChild());
        expect(terminateEditorProcess(child.asChild())).toBe(first);
        expect(await first).toBe(true);
        expect(child.kill).toHaveBeenCalledTimes(1);
    });

    test('does not signal an already-exited or never-spawned child', async () => {
        child.pid = undefined;
        expect(await terminateEditorProcess(child.asChild())).toBe(false);
        child.exit();
        expect(await terminateEditorProcess(child.asChild())).toBe(true);
        expect(killSpy).not.toHaveBeenCalled();
        expect(child.kill).not.toHaveBeenCalled();
    });

    test('signal errors cannot abort cleanup and are logged without sensitive details', async () => {
        jest.useFakeTimers();
        child.kill.mockImplementation(() => {
            throw Object.assign(new Error(session.relayToken), { code: 'EPERM' });
        });
        const stopped = terminateEditorProcess(child.asChild());
        await jest.advanceTimersByTimeAsync(4000);
        expect(await stopped).toBe(false);
        expect(mockWarn).toHaveBeenCalledWith('Could not signal owned editor process');
        expect(JSON.stringify(mockWarn.mock.calls)).not.toContain(session.relayToken);
    });
});
