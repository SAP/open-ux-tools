import { jest, describe, test, expect, afterEach } from '@jest/globals';

jest.unstable_mockModule('../../../src/i18n.js', () => ({
    t: (key: string) => key
}));

const mockPrompts = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<Record<string, unknown>>>;
jest.unstable_mockModule('prompts', () => ({
    default: (...args: unknown[]) => mockPrompts(...args)
}));

const { ask, NoInputError } = await import('../../../src/cli/migrate/ask.js');

const GRACE_MS = 100;
const question = { type: 'confirm', name: 'confirmed', message: 'Proceed?' } as const;

describe('ask', () => {
    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        process.stdin.removeAllListeners('end');
        process.stdin.removeAllListeners('close');
    });

    test('returns the answers of the prompt', async () => {
        mockPrompts.mockResolvedValue({ confirmed: true });

        await expect(ask(question)).resolves.toEqual({ confirmed: true });
        expect(mockPrompts).toHaveBeenCalledWith(question);
    });

    test('fails with NoInputError if stdin ends before the prompt is answered', async () => {
        jest.useFakeTimers();
        mockPrompts.mockReturnValue(new Promise(() => undefined));

        const result = ask(question);
        const assertion = expect(result).rejects.toThrow(NoInputError);
        process.stdin.emit('end');
        await jest.advanceTimersByTimeAsync(GRACE_MS);

        await assertion;
        await expect(result).rejects.toThrow('migrate.validation.noInput');
    });

    test('also fails if stdin is only closed', async () => {
        jest.useFakeTimers();
        mockPrompts.mockReturnValue(new Promise(() => undefined));

        const assertion = expect(ask(question)).rejects.toThrow(NoInputError);
        process.stdin.emit('close');
        await jest.advanceTimersByTimeAsync(GRACE_MS);

        await assertion;
    });

    test('keeps an answer that arrives right after stdin ended (piped input)', async () => {
        jest.useFakeTimers();
        mockPrompts.mockReturnValue(
            new Promise((resolve) => setTimeout(() => resolve({ confirmed: false }), GRACE_MS / 2))
        );

        const result = ask(question);
        process.stdin.emit('end');
        await jest.advanceTimersByTimeAsync(GRACE_MS);

        await expect(result).resolves.toEqual({ confirmed: false });
    });

    test('fails immediately if stdin has already ended', async () => {
        Object.defineProperty(process.stdin, 'readableEnded', { value: true, configurable: true });
        try {
            await expect(ask(question)).rejects.toThrow(NoInputError);
            expect(mockPrompts).not.toHaveBeenCalled();
        } finally {
            delete (process.stdin as unknown as Record<string, unknown>).readableEnded;
        }
    });

    test('removes its stdin listeners after the prompt was answered', async () => {
        mockPrompts.mockResolvedValue({ confirmed: true });
        const endListeners = process.stdin.listenerCount('end');
        const closeListeners = process.stdin.listenerCount('close');

        await ask(question);

        expect(process.stdin.listenerCount('end')).toBe(endListeners);
        expect(process.stdin.listenerCount('close')).toBe(closeListeners);
    });
});
