import { isAppStudio } from '@sap-ux/btp-utils';
import { FLPConfigAnswers, getPrompts, prompt } from '../src';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('index', () => {
    beforeEach(() => {
        mockIsAppStudio.mockReturnValue(false);
    });

    it('should return prompts from getPrompts', async () => {
        const prompts = await getPrompts([], undefined);

        expect(prompts).toBeDefined();
        expect(prompts.length).toBe(5);
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
});
