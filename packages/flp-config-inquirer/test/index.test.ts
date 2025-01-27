import { isAppStudio } from '@sap-ux/btp-utils';
import { getPrompts, prompt } from '../src';
import type { FLPConfigAnswers } from '../src';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('index', () => {
    describe('getPrompts', () => {
        it('should return prompts from getPrompts without any arguments', async () => {
            const prompts = await getPrompts();

            expect(prompts).toBeDefined();
            expect(prompts.length).toBe(9);
        });

        it('should return selected prompts from getPrompts prompt options', async () => {
            const prompts = await getPrompts(undefined, undefined, {
                inboundId: { hide: true },
                emptyInboundsInfo: { hide: true },
                additionalParameters: { hide: true },
                createAnotherInbound: { hide: true }
            });

            expect(prompts).toBeDefined();
            expect(prompts.length).toBe(5);
        });
    });

    describe('prompt', () => {
        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(false);
        });

        it('should prompt with inquirer adapter', async () => {
            const answers: FLPConfigAnswers = {
                semanticObject: 'semanticObject',
                action: 'action',
                overwrite: false,
                title: 'title',
                subTitle: 'subTitle'
            };

            const adapter = {
                prompt: jest.fn().mockResolvedValueOnce(answers)
            };

            expect(await prompt(adapter)).toStrictEqual({
                action: 'action',
                overwrite: false,
                semanticObject: 'semanticObject',
                subTitle: 'subTitle',
                title: 'title'
            });
        });

        it('should prompt and apply defaults when promptOptions are provided', async () => {
            const answers: FLPConfigAnswers = {
                semanticObject: 'semanticObject',
                action: 'action',
                overwrite: false
            };

            const adapter = {
                prompt: jest.fn().mockResolvedValueOnce(answers)
            };

            const result = await prompt(adapter, undefined, undefined, {
                overwrite: { hide: false },
                // simulating behavior when default is a function
                subTitle: { default: (() => 'defaultSubTitle') as unknown as string },
                title: { default: 'defaultTitle' }
            });

            expect(result).toStrictEqual({
                action: 'action',
                overwrite: false,
                semanticObject: 'semanticObject',
                subTitle: 'defaultSubTitle',
                title: 'defaultTitle'
            });
        });
    });
});
