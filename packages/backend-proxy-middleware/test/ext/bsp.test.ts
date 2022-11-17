//import prompts from 'prompts';
import { ToolsLogger, NullTransport } from '@sap-ux/logger';
import { addOptionsForEmbeddedBSP, convertAppDescriptorToManifest, promptUserPass } from '../../src/ext/bsp';

// mock required btp-utils functions
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Options } from 'http-proxy-middleware';
jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));
const mockIsAppStudio = isAppStudio as jest.Mock;

const mockPrompt = jest.fn();
jest.mock('prompts', () => {
    return () => mockPrompt();
});

describe('bsp', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('convertAppDescriptorToManifest', () => {
        const rewrite = convertAppDescriptorToManifest('/my/bsp');
        expect(rewrite('/my/bsp/manifest.appdescr')).toBe('/manifest.json');
        expect(rewrite('/another/manifest.appdescr')).toBe('/another/manifest.appdescr');
        expect(rewrite('/my/bsp/test')).toBe('/my/bsp/test');
        expect(rewrite('/test')).toBe('/test');
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
            const oldPathRewrite = jest.fn().mockReturnValue('/mocked');
            const options: Options = { pathRewrite: oldPathRewrite };
            await addOptionsForEmbeddedBSP('/my/bsp', options, logger);

            expect(options.router).toBeDefined();
            expect(
                (options.router as Function)({
                    path: '/my/bsp/manifest.appdescr',
                    protocol: 'http',
                    headers: {
                        host: 'local.example'
                    }
                })
            ).toBe('http://local.example');

            expect(options.auth).toBeDefined();

            expect(options.pathRewrite).toBeDefined();
            expect(options.pathRewrite).not.toBe(oldPathRewrite);
            (options.pathRewrite as Function)('test');
            expect(oldPathRewrite).toBeCalled();
        });

        test('no existing options', async () => {
            const options: Options = {};
            await addOptionsForEmbeddedBSP('/my/bsp', options, logger);

            expect(options.router).toBeDefined();
            expect(options.pathRewrite).toBeDefined();
            expect(options.auth).toBeDefined();
        });
    });
});
