import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';

const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockLoggerError = jest.fn<any>();
const mockLoggerDebug = jest.fn<any>();

const actualUtils = await import('../../../src/utils/index.js');
jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    logger: {
        ...actualUtils.logger,
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
        error: mockLoggerError,
        debug: mockLoggerDebug
    }
}));

const mockSpawn = jest.fn<any>();
const actualChildProcess = await import('node:child_process');
jest.unstable_mockModule('node:child_process', () => ({
    ...actualChildProcess,
    spawn: mockSpawn
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
    stdout: EventEmitter & { resume: jest.MockedFunction<any>; setEncoding?: jest.MockedFunction<any> };
    stderr: EventEmitter & { setEncoding: jest.MockedFunction<any> };
    pid: number | undefined;
    unref: jest.MockedFunction<any>;

    constructor(pid: number | undefined = 1234) {
        super();
        this.pid = pid;
        this.stdout = Object.assign(new EventEmitter(), {
            resume: jest.fn(),
            pause: jest.fn(),
            pipe: jest.fn(),
            unpipe: jest.fn(),
            destroy: jest.fn(),
            readable: true,
            readableEncoding: null
        });
        this.stderr = Object.assign(new EventEmitter(), { setEncoding: jest.fn() });
        this.unref = jest.fn();
    }

    emitLine(line: string): void {
        // readline.createInterface reads 'data' events from the underlying stream
        this.stdout.emit('data', line + '\n');
    }
}

describe('openAdaptationEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(false);
    });

    test('returns Success when URL line is emitted on stdout', async () => {
        const child = new FakeChildProcess(9999);
        mockSpawn.mockReturnValue(child);

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
        mockSpawn.mockReturnValue(child);

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
        mockSpawn.mockReturnValue(child);

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
        mockExistsSync.mockImplementation((p: unknown) =>
            typeof p === 'string' && p.includes('fiori.cjs')
        );
        const child = new FakeChildProcess(42);
        mockSpawn.mockReturnValue(child);

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
        mockExistsSync.mockImplementation((p: unknown) =>
            typeof p === 'string' && p.includes('.bin') && p.includes('fiori')
        );
        const child = new FakeChildProcess(43);
        mockSpawn.mockReturnValue(child);

        const promise = openAdaptationEditor({ appPath: '/tmp/myapp' });
        setImmediate(() => {
            child.emitLine('URL: http://localhost:8082');
        });
        await promise;

        const spawnCmd = mockSpawn.mock.calls[0][0];
        expect(typeof spawnCmd).toBe('string');
        expect(spawnCmd).toContain('.bin');
    });

    test('falls back to npm when neither binary exists', async () => {
        mockExistsSync.mockReturnValue(false);
        const child = new FakeChildProcess(44);
        mockSpawn.mockReturnValue(child);

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
});
