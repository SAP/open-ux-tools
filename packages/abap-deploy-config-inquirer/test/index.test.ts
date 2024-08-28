import { getPrompts, prompt } from '../src';
import { getService } from '@sap-ux/store';
import { mockTargetSystems } from './fixtures/targets';
import { AbapDeployConfigAnswersInternal } from '../src/types';

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
        const prompts = await getPrompts({}, undefined, false);
        expect(prompts.answers).toBeDefined();
        expect(prompts.prompts.length).toBe(23);
    });

    it('should prompt with inquirer adapter', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });

        const answers: AbapDeployConfigAnswersInternal = {
            targetSystem: 'https://mock.url.target1.com',
            client: '000',
            ui5AbapRepo: 'mockRepo',
            packageManual: 'mockPackage',
            transportManual: 'mockTransport'
        };

        const adapter = {
            prompt: jest.fn().mockResolvedValueOnce(answers)
        };

        expect(await prompt(adapter)).toStrictEqual({
            url: 'https://mock.url.target1.com',
            client: '000',
            ui5AbapRepo: 'mockRepo',
            package: 'mockPackage',
            transport: 'mockTransport'
        });
    });
});
