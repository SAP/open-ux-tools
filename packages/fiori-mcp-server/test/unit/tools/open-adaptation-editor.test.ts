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
            if (event === 'line') this.lineCallbacks.push(cb as LineCallback);
            if (event === 'close') this.closeCallbacks.push(cb as () => void);
            return this;
        },
        close() { this.emitClose(); },
        emitLine(line) { for (const cb of this.lineCallbacks) cb(line); },
        emitClose() { for (const cb of this.closeCallbacks) cb(); }
    };
}

let currentStdoutRl: FakeRl | null = null;
let rlCallCount = 0;

jest.unstable_mockModule('node:readline', () => ({
    createInterface: jest.fn((_opts: unknown) => {
        rlCallCount++;
        const rl = makeFakeRl();
        if (rlCallCount % 2 === 1) currentStdoutRl = rl;
        return rl;
    })
}));

const mockSpawn = jest.fn<() => FakeProcess>();

jest.unstable_mockModule('node:child_process', () => ({
    spawn: mockSpawn,
    exec: jest.fn((_cmd: string, cb: (err: Error | null) => void) => {
        cb(new Error('exec mocked'));
    })
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

        const resultPromise = openAdaptationEditor(appParams);
        currentStdoutRl!.emitLine('URL: http://localhost:3000');
        await tickMs(30000 + 200);
        await tickMs(1200);

        const result = await resultPromise;
        expect(result.status).toBe('Success');
        const params = result.parameters as Record<string, unknown>;
        expect((params.editorUrl as string)).toContain('/test/adaptation-editor.html');
    });
});
