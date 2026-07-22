import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import type { ChildProcess } from 'node:child_process';

type FakeProcess = EventEmitter &
    Pick<ChildProcess, 'pid' | 'unref'> & {
        stdout: Readable;
        stderr: Readable;
    };

type LineCallback = (line: string) => void;

interface FakeRl {
    lineCallbacks: LineCallback[];
    closeCallbacks: Array<() => void>;
    on(event: string, cb: LineCallback | (() => void)): FakeRl;
    close(): void;
    emitLine(line: string): void;
    emitClose(): void;
}

function makeFakeRl(): FakeRl {
    return {
        lineCallbacks: [],
        closeCallbacks: [],
        on(event, cb) {
            if (event === 'line') {
                this.lineCallbacks.push(cb as LineCallback);
            }
            if (event === 'close') {
                this.closeCallbacks.push(cb as () => void);
            }
            return this;
        },
        close() {
            this.emitClose();
        },
        emitLine(line) {
            for (const cb of this.lineCallbacks) {
                cb(line);
            }
        },
        emitClose() {
            for (const cb of this.closeCallbacks) {
                cb();
            }
        }
    };
}

let currentStdoutRl: FakeRl | null = null;
let rlCallCount = 0;

jest.unstable_mockModule('node:readline', () => ({
    createInterface: jest.fn((_opts: unknown) => {
        rlCallCount++;
        const rl = makeFakeRl();
        if (rlCallCount % 2 === 1) {
            currentStdoutRl = rl;
        }
        return rl;
    })
}));

const mockSpawn = jest.fn<() => FakeProcess>();
const mockExec = jest.fn<(cmd: string, cb: (err: Error | null, result?: { stdout: string; stderr: string }) => void) => void>();

jest.unstable_mockModule('node:child_process', () => ({
    spawn: mockSpawn,
    exec: mockExec
}));

const { openAdaptationEditor } = await import('../../../src/tools/open-adaptation-editor.js');
const { OPEN_ADAPTATION_EDITOR_ID } = await import('../../../src/constant.js');
const { createInterface: mockCreateInterface } = await import('node:readline');

function makeFakeProcess(pid: number | undefined): FakeProcess {
    const proc = new EventEmitter() as FakeProcess;
    proc.stdout = new Readable({ read() {} });
    proc.stderr = new Readable({ read() {} });
    proc.pid = pid;
    proc.unref = jest.fn<() => void>();
    return proc;
}

async function tickMs(ms: number): Promise<void> {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
}

describe('openAdaptationEditor', () => {
    const appParams = { appPath: '/workspace/my-adp-project' };

    beforeEach(() => {
        (mockCreateInterface as ReturnType<typeof jest.fn>).mockClear();
        mockSpawn.mockReset();
        mockExec.mockReset();
        mockExec.mockImplementation((_cmd, cb) => cb(new Error('exec not configured')));
        currentStdoutRl = null;
        rlCallCount = 0;
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('returns Error with spawn message when child process emits error', async () => {
        const fakeProc = makeFakeProcess(12345);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor(appParams);
        fakeProc.emit('error', new Error('ENOENT: npx not found'));
        await tickMs(200);

        const result = await resultPromise;
        expect(result.status).toBe('Error');
        expect(result.message).toContain('Failed to spawn editor process');
        expect(result.message).toContain('ENOENT: npx not found');
        expect(result.functionalityId).toBe(OPEN_ADAPTATION_EDITOR_ID);
    });

    test('returns Error with Timeout message when 30s expires without URL', async () => {
        const fakeProc = makeFakeProcess(12345);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor(appParams);
        await tickMs(30000 + 200);

        const result = await resultPromise;
        expect(result.status).toBe('Error');
        expect(result.message).toContain('Timeout');
        expect(result.functionalityId).toBe(OPEN_ADAPTATION_EDITOR_ID);
    });

    test('returns Error mentioning process ID when spawned process has no PID', async () => {
        const fakeProc = makeFakeProcess(undefined);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor(appParams);
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine('URL: http://localhost:8080');
        await tickMs(200);
        await tickMs(1200);

        const result = await resultPromise;
        expect(result.status).toBe('Error');
        expect(result.message).toContain('process ID');
        expect(result.functionalityId).toBe(OPEN_ADAPTATION_EDITOR_ID);
    });

    test('returns Success with editorUrl and processId when URL and path are emitted', async () => {
        const fakeProc = makeFakeProcess(9999);
        mockSpawn.mockReturnValue(fakeProc);
        mockExec.mockImplementation((_cmd, cb) => cb(null, { stdout: '', stderr: '' }));

        const resultPromise = openAdaptationEditor(appParams);
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine('URL: http://localhost:8080');
        await tickMs(200);
        await tickMs(1200);

        const result = await resultPromise;
        expect(result.status).toBe('Success');
        expect(result.functionalityId).toBe(OPEN_ADAPTATION_EDITOR_ID);
        expect(result.message).toContain('http://localhost:8080');
        expect(result.message).toContain('/test/adaptation-editor.html');
        const params = result.parameters as Record<string, unknown>;
        expect(params.editorUrl).toBe('http://localhost:8080/test/adaptation-editor.html');
        expect(params.processId).toBe(9999);
    });

    test('falls back to default editorPath when only URL line is emitted before timeout', async () => {
        const fakeProc = makeFakeProcess(5555);
        mockSpawn.mockReturnValue(fakeProc);
        mockExec.mockImplementation((_cmd, cb) => cb(null, { stdout: '', stderr: '' }));

        const resultPromise = openAdaptationEditor(appParams);
        currentStdoutRl!.emitLine('URL: http://localhost:3000');
        await tickMs(30000 + 200);
        await tickMs(1200);

        const result = await resultPromise;
        expect(result.status).toBe('Success');
        const params = result.parameters as Record<string, unknown>;
        expect(params.editorUrl as string).toContain('/test/adaptation-editor.html');
    });
});

describe('port detection via execAsync', () => {
    beforeEach(() => {
        mockExec.mockReset();
        mockSpawn.mockReset();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    async function runSuccessAndGetPort(
        urlLine: string,
        execStdout: string
    ): Promise<Record<string, unknown>> {
        const fakeProc = makeFakeProcess(1234);
        mockSpawn.mockReturnValue(fakeProc);
        mockExec.mockImplementation((_cmd, cb) => cb(null, { stdout: execStdout, stderr: '' }));

        const resultPromise = openAdaptationEditor({ appPath: '/app' });
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine(urlLine);
        await tickMs(200);
        await tickMs(1200);

        const result = await resultPromise;
        return result.parameters as Record<string, unknown>;
    }

    test('detects port from lsof output on Unix', async () => {
        const lsofOutput = 'node   1234  user  TCP *:8080 (LISTEN)';
        const params = await runSuccessAndGetPort('URL: http://localhost:8080', lsofOutput);
        expect(params.port).toBe(8080);
    });

    test('returns preferred port when lsof output is empty', async () => {
        const params = await runSuccessAndGetPort('URL: http://localhost:4000', '');
        expect(params.port).toBe(4000);
    });

    test('detects child pids via pgrep and scans them for ports', async () => {
        let callCount = 0;
        mockExec.mockImplementation((cmd, cb) => {
            callCount++;
            if ((cmd as string).includes('pgrep')) {
                cb(null, { stdout: '5678\n', stderr: '' });
            } else if ((cmd as string).includes('5678')) {
                cb(null, { stdout: 'node   5678  user  TCP *:3000 (LISTEN)', stderr: '' });
            } else {
                cb(null, { stdout: '', stderr: '' });
            }
        });

        const fakeProc = makeFakeProcess(1234);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor({ appPath: '/app' });
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine('URL: http://localhost:3000');
        await tickMs(200);
        await tickMs(1200);

        const result = await resultPromise;
        const params = result.parameters as Record<string, unknown>;
        expect(params.port).toBe(3000);
    });

    test('handles pgrep failure gracefully and scans only the parent pid', async () => {
        mockExec.mockImplementation((cmd, cb) => {
            if ((cmd as string).includes('pgrep')) {
                cb(new Error('pgrep not found'));
            } else {
                cb(null, { stdout: 'node   1234  user  TCP *:9090 (LISTEN)', stderr: '' });
            }
        });

        const fakeProc = makeFakeProcess(1234);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor({ appPath: '/app' });
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine('URL: http://localhost:9090');
        await tickMs(200);
        await tickMs(1200);

        const result = await resultPromise;
        const params = result.parameters as Record<string, unknown>;
        expect(params.port).toBe(9090);
    });

    test('skips COMMAND header line and non-matching lines in lsof output', async () => {
        const lsofOutput = [
            'COMMAND  PID USER   FD   TYPE',
            'garbage line',
            'node   1234  user  TCP *:7777 (LISTEN)'
        ].join('\n');
        mockExec.mockImplementation((_cmd, cb) => cb(null, { stdout: lsofOutput, stderr: '' }));

        const fakeProc = makeFakeProcess(1234);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor({ appPath: '/app' });
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine('URL: http://localhost:7777');
        await tickMs(200);
        await tickMs(1200);

        const result = await resultPromise;
        const params = result.parameters as Record<string, unknown>;
        expect(params.port).toBe(7777);
    });

    test('detects port from netstat output on Windows', async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
        const netstatOutput = 'TCP    0.0.0.0:8080    0.0.0.0:0    LISTENING    1234';
        mockExec.mockImplementation((_cmd, cb) => cb(null, { stdout: netstatOutput, stderr: '' }));

        const fakeProc = makeFakeProcess(1234);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor({ appPath: '/app' });
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine('URL: http://localhost:8080');
        await tickMs(200);
        await tickMs(1200);

        Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        const result = await resultPromise;
        const params = result.parameters as Record<string, unknown>;
        expect(params.port).toBe(8080);
    });

    test('returns success without port when getPortFromPid throws', async () => {
        mockExec.mockImplementation((_cmd, cb) => cb(new Error('lsof crashed')));

        const fakeProc = makeFakeProcess(1234);
        mockSpawn.mockReturnValue(fakeProc);

        const resultPromise = openAdaptationEditor({ appPath: '/app' });
        currentStdoutRl!.emitLine('fiori run --open /test/adaptation-editor.html');
        currentStdoutRl!.emitLine('URL: http://localhost:8080');
        await tickMs(200);
        await tickMs(1200);

        const result = await resultPromise;
        expect(result.status).toBe('Success');
    });
});
