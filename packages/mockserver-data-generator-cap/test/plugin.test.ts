import { registerCapPlugin } from '../src/index.js';

describe('native CAP plugin lifecycle', () => {
    test('awaits seeding on served and degrades without blocking CAP startup', async () => {
        let served: (() => Promise<void>) | undefined;
        const warn = jest.fn();
        const cds = {
            env: { profiles: ['development'], mockserverDataGenerator: { enabled: true } },
            model: { definitions: {} },
            db: {},
            ql: {},
            log: () => ({ info: jest.fn(), warn }),
            on: jest.fn((event: string, handler: () => Promise<void>) => {
                if (event === 'served') {
                    served = handler;
                }
            })
        };
        const seed = jest.fn(async () => {
            throw new Error('database unavailable');
        });

        registerCapPlugin(cds, { seed });
        await expect(served?.()).resolves.toBeUndefined();

        expect(seed).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(expect.stringMatching(/deterministic generation remains available/i));
    });

    test('does no work when the opt-in is absent', async () => {
        let served: (() => Promise<void>) | undefined;
        const cds = {
            env: { profiles: ['development'] },
            on: jest.fn((_event: string, handler: () => Promise<void>) => {
                served = handler;
            })
        };
        const seed = jest.fn();

        registerCapPlugin(cds, { seed });
        await served?.();

        expect(seed).not.toHaveBeenCalled();
    });
});
