import { jest } from '@jest/globals';
import type { Options } from 'http-proxy-middleware';

// mock required btp-utils functions
const mockIsAppStudio = jest.fn();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio
}));

const mockPrompt = jest.fn();
jest.unstable_mockModule('prompts', () => ({
    default: () => mockPrompt(),
    __esModule: true
}));

const { ToolsLogger, NullTransport } = await import('@sap-ux/logger');
const { addOptionsForEmbeddedBSP, promptUserPass } = await import('../../src/ext/bsp');

describe('bsp', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('promptUserPass', () => {
        const answers = {
            username: '~user',
            password: '~password'
        };

        test('running locally', async () => {
            mockIsAppStudio.mockReturnValueOnce(false);
            mockPrompt.mockResolvedValueOnce(answers);
            expect(await promptUserPass(logger)).toBe(`${answers.username}:${answers.password}`);
        });

        test('running in BAS and no auth needed', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);
            mockPrompt.mockResolvedValueOnce({ authNeeded: false });
            expect(await promptUserPass(logger)).toBeUndefined();
        });

        test('running in BAS and auth requested', async () => {
            mockIsAppStudio.mockReturnValueOnce(true);
            mockPrompt.mockResolvedValue({ ...answers, authNeeded: true });
            expect(await promptUserPass(logger)).toBe(`${answers.username}:${answers.password}`);
        });
    });

    describe('addOptionsForEmbeddedBSP', () => {
        test('standard scenario', async () => {
            const options: Options = {};
            await addOptionsForEmbeddedBSP('/my/bsp', options, logger);

            expect(options.router).toBeDefined();
            expect(
                (options.router as Function)({
                    url: '/my/bsp/manifest.appdescr',
                    protocol: 'http',
                    headers: {
                        host: 'local.example'
                    }
                })
            ).toBe('http://local.example');

            expect(options.auth).toBeDefined();
        });

        test('no existing options', async () => {
            const options: Options = {};
            await addOptionsForEmbeddedBSP('/my/bsp', options, logger);

            expect(options.router).toBeDefined();
            expect(options.auth).toBeDefined();
        });

        test('case insensitive bsp path', async () => {
            const options: Options = {};
            await addOptionsForEmbeddedBSP('/my/bSp', options, logger);

            expect(options.router).toBeDefined();
            expect(options.auth).toBeDefined();
        });
    });
});
