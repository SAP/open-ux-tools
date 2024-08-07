import { getPrompts, prompt } from '../src';
import { getService } from '@sap-ux/store';
import { mockTargetSystems } from './fixtures/targets';

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));
const mockGetService = getService as jest.Mock;

describe('index', () => {
    it('should return prompts from getPrompts', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });
        const prompts = await getPrompts({});
        expect(prompts.answers).toBeDefined();
        expect(prompts.prompts.length).toBe(22);
    });

    it('should prompt with inquirer adapter', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });

        const answers = {
            url: 'https://mock.url.target1.com',
            client: '000',
            ui5AbapRepo: 'mockRepo',
            package: 'mockPackage',
            transportRequest: 'mockTransport'
        };

        const adapter = {
            prompt: jest.fn().mockResolvedValueOnce(answers)
        };

        expect(await prompt(adapter)).toStrictEqual(answers);
    });
});
