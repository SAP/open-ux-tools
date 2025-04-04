import { getPrompts, prompt } from '../src';
import { getService } from '@sap-ux/store';
import { mockSourceSystems } from './fixtures/targets';
import type { AbapDeployConfigAnswersInternal } from '../src/types';

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));
const mockGetService = getService as jest.Mock;

describe('index', () => {
    it('should return prompts from getPrompts', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockSourceSystems])
        });
        const prompts = await getPrompts({}, undefined, false);
        expect(prompts.answers).toBeDefined();
        expect(prompts.prompts.length).toBe(24);
    });

    it('should prompt with inquirer adapter', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockSourceSystems])
        });

        const answers: AbapDeployConfigAnswersInternal = {
            url: '',
            targetSystem: 'https://mock.url.target1.com',
            client: '000',
            package: '',
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
