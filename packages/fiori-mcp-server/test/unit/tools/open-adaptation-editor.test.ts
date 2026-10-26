import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { PassThrough } from 'node:stream';
import type { EditorSession } from '../../../src/utils/editor-session.js';

const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockLoggerError = jest.fn<any>();
const mockLoggerDebug = jest.fn<any>();

jest.unstable_mockModule('../../../src/utils/index.js', () => ({
    logger: {
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
        error: mockLoggerError,
        debug: mockLoggerDebug
    }
}));

const mockSpawn = jest.fn<any>();
jest.unstable_mockModule('nano-spawn', () => ({
    default: mockSpawn
}));

const mockIsAppStudio = jest.fn<() => boolean>();
const mockExposePort = jest.fn<(port: number) => Promise<string | undefined>>();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    exposePort: mockExposePort
}));

const mockRegisterSession = jest.fn<(session: EditorSession) => void>();
const mockSignalEditor = jest.fn<(command: 'open' | 'close', url: string) => void>();
const mockTerminate = jest.fn<(child: ChildProcess) => Promise<boolean>>();
const mockTrackProcess = jest.fn<(child: ChildProcess, detached: boolean) => void>();
jest.unstable_mockModule('../../../src/utils/editor-session.js', () => ({
    registerEditorSession: mockRegisterSession,
    signalEditor: mockSignalEditor,
    terminateEditorProcess: mockTerminate,
    trackEditorProcess: mockTrackProcess
}));

const mockExistsSync = jest.fn<any>().mockReturnValue(false);
const actualFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: { ...actualFs, existsSync: mockExistsSync },
    existsSync: mockExistsSync
}));

const { openAdaptationEditor } = await import('../../../src/tools/open-adaptation-editor.js');

class FakeChildProcess extends EventEmitter {
    stdout: PassThrough;
    stderr: PassThrough;
    pid: number | undefined;
    exitCode: number | null = null;
    signalCode: NodeJS.Signals | null = null;
    unref: jest.MockedFunction<any>;

    constructor(pid: number | undefined = 1234) {
        super();
        this.pid = pid;
        this.stdout = new PassThrough();
        this.stderr = new PassThrough();
        this.unref = jest.fn();
    }

    emitLine(line: string): void {
        // readline.createInterface reads 'data' events from the underlying stream
        this.stdout.emit('data', line + '\n');
    }
}

describe('openAdaptationEditor', () => {
    const savedEnv = { ...process.env };
    const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');

    beforeEach(() => {
        jest.clearAllMocks();
        mockSpawn.mockReset();
        mockExistsSync.mockReset();
        mockExistsSync.mockReturnValue(false);
        mockIsAppStudio.mockReturnValue(false);
        mockExposePort.mockReset();
        mockRegisterSession.mockReset();
        mockTerminate.mockResolvedValue(true);
        delete process.env.SAP_FIORI_MCP_ADP_HTTP_TRANSPORT;
        delete process.env.SAP_FIORI_MCP_ADP_RELAY_TOKEN;
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
        if (platformDescriptor) {
            Object.defineProperty(process, 'platform', platformDescriptor);
        }
        process.env = { ...savedEnv };
    });

    function fakeSubprocess(
        child: FakeChildProcess
    ): Promise<unknown> & { nodeChildProcess: Promise<FakeChildProcess> } {
        return Object.assign(new Promise(() => {}), { nodeChildProcess: Promise.resolve(child) });
    }

    async function startEditor(child = new FakeChildProcess(), lines = ['URL: http://localhost:8080']) {
        mockSpawn.mockReturnValue(fakeSubprocess(child));
        const result = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => lines.forEach((line) => child.emitLine(line)));
        return result;
    }

    test('returns Success when URL line is emitted on stdout', async () => {
        const child = new FakeChildProcess(9999);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });

        setImmediate(() => {
            child.emitLine('URL: http://localhost:8080');
        });

        const result = await promise;

        expect(result.status).toEqual('Success');
        expect(result.editorUrl).toContain('http://localhost:8080');
        expect(result.processId).toEqual(9999);
    });

    test('returns Error with Timeout message when no URL emitted within timeout', async () => {
        const child = new FakeChildProcess(1234);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        jest.useFakeTimers();
        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        await jest.advanceTimersByTimeAsync(30000);
        const result = await promise;
        jest.useRealTimers();

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('Timeout');
    });

    test('includes stderr in error message when timeout occurs with stderr output', async () => {
        const child = new FakeChildProcess(1234);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        jest.useFakeTimers();
        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });

        setImmediate(() => {
            child.stderr.emit('data', 'some error from fiori run');
        });

        await jest.advanceTimersByTimeAsync(30000);
        const result = await promise;
        jest.useRealTimers();

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('some error from fiori run');
    });

    test('uses process.execPath when fiori.cjs binary target exists', async () => {
        mockExistsSync.mockImplementation((p: unknown) => typeof p === 'string' && p.includes('fiori.cjs'));
        const child = new FakeChildProcess(42);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: http://localhost:8081');
        });
        await promise;

        expect(mockSpawn).toHaveBeenCalledWith(
            process.execPath,
            expect.arrayContaining([expect.stringContaining('fiori.cjs')]),
            expect.any(Object)
        );
    });

    test('falls back to .bin/fiori when fiori.cjs missing but .bin/fiori exists', async () => {
        mockExistsSync.mockImplementation(
            (p: unknown) => typeof p === 'string' && p.includes('.bin') && p.includes('fiori')
        );
        const child = new FakeChildProcess(43);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: http://localhost:8082');
        });
        await promise;

        const spawnCmd = mockSpawn.mock.calls[0][0];
        expect(spawnCmd).toBe('fiori');
    });

    test('extracts editor path from "fiori run --open" line before URL line', async () => {
        const child = new FakeChildProcess(100);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('info fiori run --open /test/adaptation-editor.html');
            child.emitLine('URL: http://localhost:8090');
        });
        const result = await promise;

        expect(result.status).toEqual('Success');
        expect(result.editorUrl).toContain('/test/adaptation-editor.html');
    });

    test('handles process error event and resolves with Error status on timeout', async () => {
        const child = new FakeChildProcess(1234);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        jest.useFakeTimers();
        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });

        setImmediate(() => {
            child.emit('error', new Error('spawn ENOENT'));
        });

        await jest.advanceTimersByTimeAsync(30000);
        const result = await promise;
        jest.useRealTimers();

        expect(result.status).toEqual('Error');
    });

    test('parsePort returns default https port 443 for https URL without explicit port', async () => {
        const child = new FakeChildProcess(101);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: https://my-system.example.com');
        });
        const result = await promise;

        expect(result.status).toEqual('Success');
        expect(result.port).toEqual(443);
    });

    test('parsePort returns default http port 80 for http URL without explicit port', async () => {
        const child = new FakeChildProcess(102);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: http://my-system.example.com');
        });
        const result = await promise;

        expect(result.status).toEqual('Success');
        expect(result.port).toEqual(80);
    });

    test('cleans up and returns Error when the spawned child has no pid', async () => {
        const child = new FakeChildProcess();
        child.pid = undefined;
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: http://localhost:8091');
        });
        const result = await promise;

        expect(result.status).toBe('Error');
        expect(result.message).toContain('Failed to get process ID');
        expect(mockTerminate).toHaveBeenCalledWith(child);
        expect(mockRegisterSession).not.toHaveBeenCalled();
    });

    test('returns Error when spawn throws synchronously', async () => {
        mockSpawn.mockImplementation(() => {
            throw new Error('spawn failed unexpectedly');
        });

        const result = await openAdaptationEditor({ appPath: '/tmp/myapp' });

        expect(result.status).toEqual('Error');
        expect(result.message).toContain('spawn failed unexpectedly');
    });

    test('parsePort returns undefined for an unparseable URL, omitting port from output', async () => {
        // Emit a URL that matches the regex but whose port field cannot be parsed by new URL()
        const child = new FakeChildProcess(103);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: http://[::1]:notaport');
        });
        const result = await promise;

        // URL matched the regex so server started; parsePort returns undefined for invalid port
        expect(result.status).toEqual('Success');
        expect(result.port).toBeUndefined();
        // Kill instructions should not include "by port" when port is undefined
        expect(result.message).not.toContain('by port');
    });
    test('falls back to npm when neither binary exists', async () => {
        mockExistsSync.mockReturnValue(false);
        const child = new FakeChildProcess(44);
        mockSpawn.mockReturnValue(fakeSubprocess(child));

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: http://localhost:8083');
        });
        await promise;

        const spawnCmd = mockSpawn.mock.calls[0][0];
        // On non-Windows the fallback command is 'npm'
        expect(spawnCmd).not.toContain('fiori');
        expect(spawnCmd).toContain('npm');
    });

    test('retains a non-relay process and explicitly clears inherited relay credentials', async () => {
        process.env.SAP_FIORI_MCP_ADP_RELAY_TOKEN = 'inherited-secret';
        const child = new FakeChildProcess();
        const result = await startEditor(child);

        expect(mockSpawn).toHaveBeenCalledWith('npm', ['run', 'start-editor'], {
            cwd: '/tmp/myapp',
            detached: process.platform !== 'win32',
            env: { SAP_FIORI_MCP_ADP_RELAY_TOKEN: undefined }
        });
        expect(process.env.SAP_FIORI_MCP_ADP_RELAY_TOKEN).toBe('inherited-secret');
        expect(mockTrackProcess).toHaveBeenCalledWith(child, process.platform !== 'win32');
        expect(mockRegisterSession).toHaveBeenCalledWith({
            localUrl: result.editorUrl,
            browserUrl: result.editorUrl,
            relayToken: undefined,
            childProcess: child,
            autoOpen: false
        });
        expect(mockSignalEditor).not.toHaveBeenCalled();
    });

    test('generates a fresh exact 64-hex token only for HTTP relay and does not return or log it', async () => {
        process.env.SAP_FIORI_MCP_ADP_HTTP_TRANSPORT = 'true';
        process.env.SAP_FIORI_MCP_ADP_RELAY_TOKEN = 'inherited-secret';
        const first = await startEditor();
        const token = String(mockSpawn.mock.calls[0][2].env.SAP_FIORI_MCP_ADP_RELAY_TOKEN);
        const second = await startEditor();

        expect(token).toMatch(/^[a-f0-9]{64}$/);
        expect(mockRegisterSession.mock.calls[0][0].relayToken).toBe(token);
        expect(mockSpawn.mock.calls[1][2].env.SAP_FIORI_MCP_ADP_RELAY_TOKEN).not.toBe(token);
        expect(JSON.stringify([first, second, mockLoggerDebug.mock.calls, mockLoggerInfo.mock.calls])).not.toContain(
            token
        );
        expect(first.message).toContain('run_rta_workflow_step');
        expect(first.message).not.toMatch(/lsof|netstat|by port/);
    });

    test.each(['false', 'TRUE', undefined])('does not enable relay for HTTP=%s', async (http) => {
        if (http !== undefined) {
            process.env.SAP_FIORI_MCP_ADP_HTTP_TRANSPORT = http;
        }
        await startEditor();
        expect(mockSpawn.mock.calls[0][2].env).toEqual({ SAP_FIORI_MCP_ADP_RELAY_TOKEN: undefined });
    });

    test('BAS auto-opens the external URL while retaining the original local URL and query', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockExposePort.mockResolvedValue('https://port8080.example.cloud.sap/');
        const result = await startEditor(new FakeChildProcess(), [
            'info fiori run --open /test/adaptation-editor.html?mode=edit',
            'URL: http://localhost:8080'
        ]);

        expect(mockExposePort).toHaveBeenCalledWith(8080);
        expect(result.editorUrl).toBe('https://port8080.example.cloud.sap/test/adaptation-editor.html?mode=edit');
        expect(mockRegisterSession).toHaveBeenCalledWith(
            expect.objectContaining({
                localUrl: 'http://localhost:8080/test/adaptation-editor.html?mode=edit',
                browserUrl: result.editorUrl,
                autoOpen: true
            })
        );
        expect(mockSignalEditor).toHaveBeenCalledWith('open', result.editorUrl);
        expect(mockRegisterSession.mock.invocationCallOrder[0]).toBeLessThan(
            mockSignalEditor.mock.invocationCallOrder[0]
        );
    });

    test.each(['empty', 'error'])('preserves BAS local URL fallback on %s exposure response', async (response) => {
        mockIsAppStudio.mockReturnValue(true);
        if (response === 'error') {
            mockExposePort.mockRejectedValue(new Error('exposure unavailable'));
        }
        const result = await startEditor();
        expect(result.status).toBe('Success');
        expect(result.editorUrl).toBe('http://localhost:8080/test/adaptation-editor.html');
        expect(mockSignalEditor).toHaveBeenCalledWith('open', result.editorUrl);
        expect(mockTerminate).not.toHaveBeenCalled();
    });

    test('BAS still signals open when no listening port can be parsed', async () => {
        mockIsAppStudio.mockReturnValue(true);
        const result = await startEditor(new FakeChildProcess(), ['URL: http://[::1]:notaport']);
        expect(result.status).toBe('Success');
        expect(mockExposePort).not.toHaveBeenCalled();
        expect(mockSignalEditor).toHaveBeenCalledWith('open', result.editorUrl);
    });

    test('Windows does not create or claim a POSIX group and only recommends the owned PID tree', async () => {
        Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
        const result = await startEditor();
        expect(mockSpawn.mock.calls[0][2].detached).toBe(false);
        expect(mockTrackProcess).toHaveBeenCalledWith(expect.anything(), false);
        expect(result.message).toContain('taskkill /PID 1234 /T /F');
        expect(result.message).not.toMatch(/lsof|netstat|by port/);
    });

    test('POSIX only recommends the newly owned process group, never a listening-port kill', async () => {
        Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
        const result = await startEditor();
        expect(result.message).toContain('kill -TERM -- -1234');
        expect(result.message).not.toMatch(/lsof|netstat|by port/);
    });

    test('cleans up the owned process if post-startup setup fails', async () => {
        const child = new FakeChildProcess();
        child.unref.mockImplementationOnce(() => {
            throw new Error('startup setup failed');
        });
        const result = await startEditor(child);
        expect(result.status).toBe('Error');
        expect(mockTerminate).toHaveBeenCalledWith(child);
        expect(mockRegisterSession).not.toHaveBeenCalled();
        expect(mockSignalEditor).not.toHaveBeenCalled();
    });

    test('cleans up if the editor exits while BAS exposure is in progress', async () => {
        const child = new FakeChildProcess();
        mockIsAppStudio.mockReturnValue(true);
        mockExposePort.mockImplementationOnce(async () => {
            child.exitCode = 1;
            return 'https://port8080.example.cloud.sap/';
        });
        mockRegisterSession.mockImplementationOnce(() => {
            throw new Error('Editor process exited during startup');
        });
        const result = await startEditor(child);
        expect(result.status).toBe('Error');
        expect(mockTerminate).toHaveBeenCalledWith(child);
        expect(mockSignalEditor).not.toHaveBeenCalled();
    });

    test('redacts generated and inherited tokens even if the CLI echoes them', async () => {
        process.env.SAP_FIORI_MCP_ADP_HTTP_TRANSPORT = 'true';
        process.env.SAP_FIORI_MCP_ADP_RELAY_TOKEN = 'inherited-secret';
        const child = new FakeChildProcess();
        mockSpawn.mockReturnValue(fakeSubprocess(child));
        const pending = openAdaptationEditor({ appPath: '/tmp/myapp' });
        const token = String(mockSpawn.mock.calls[0][2].env.SAP_FIORI_MCP_ADP_RELAY_TOKEN);
        setImmediate(() => {
            child.emitLine(`debug ${token} inherited-secret`);
            child.stderr.emit('data', `${token} inherited-secret`);
            child.emit('error', new Error(`failed ${token} inherited-secret`));
        });
        const result = await pending;
        const diagnostics = JSON.stringify([
            result,
            mockLoggerWarn.mock.calls,
            mockLoggerError.mock.calls,
            mockLoggerDebug.mock.calls,
            mockLoggerInfo.mock.calls
        ]);
        expect(result.status).toBe('Error');
        expect(diagnostics).not.toContain(token);
        expect(diagnostics).not.toContain('inherited-secret');
        expect(mockTerminate).toHaveBeenCalledWith(child);
    });

    test('handles nodeChildProcess rejection and consumes the nano-spawn completion rejection', async () => {
        const failure = new Error('spawn ENOENT');
        const subprocess = Object.assign(Promise.reject(failure), { nodeChildProcess: Promise.reject(failure) });
        mockSpawn.mockReturnValue(subprocess);
        const result = await openAdaptationEditor({ appPath: '/tmp/myapp' });
        expect(result.status).toBe('Error');
        expect(result.message).toContain('spawn ENOENT');
        expect(mockTerminate).not.toHaveBeenCalled();
    });

    test('returns promptly and cleans up when the child exits before emitting a URL', async () => {
        const child = new FakeChildProcess();
        mockSpawn.mockReturnValue(fakeSubprocess(child));
        const pending = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.exitCode = 1;
            child.emit('exit', 1, null);
        });
        const result = await pending;
        expect(result.status).toBe('Error');
        expect(mockTerminate).toHaveBeenCalledWith(child);
        expect(mockRegisterSession).not.toHaveBeenCalled();
    });

    test('parses ANSI-coloured URL lines and closes startup listeners after success', async () => {
        const child = new FakeChildProcess();
        const result = await startEditor(child, ['\u001b[32mURL: http://localhost:8080\u001b[0m']);
        expect(result.status).toBe('Success');
        expect(child.listenerCount('exit')).toBe(0);
    });

    test('does not wait for the startup timeout if the child already exited', async () => {
        const child = new FakeChildProcess();
        child.exitCode = 1;
        mockSpawn.mockReturnValue(fakeSubprocess(child));
        const result = await openAdaptationEditor({ appPath: '/tmp/myapp' });
        expect(result.status).toBe('Error');
        expect(mockTerminate).toHaveBeenCalledWith(child);
        expect(mockRegisterSession).not.toHaveBeenCalled();
    });
});
