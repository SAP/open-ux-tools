import { jest } from '@jest/globals';
import { mockTargetSystems } from './fixtures/targets.js';
import type { AbapDeployConfigAnswersInternal } from '../src/types.js';

const mockGetService = jest.fn<typeof realStore.getService>();
const realStore = await import('@sap-ux/store');

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: mockGetService
}));

const { getPrompts, prompt } = await import('../src/index.js');

describe('index', () => {
    it('should return prompts from getPrompts', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
        });
        const prompts = await getPrompts({}, undefined, false);
        expect(prompts.answers).toBeDefined();
        expect(prompts.prompts.length).toBe(24);
    });

    it('should prompt with inquirer adapter', async () => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValueOnce([mockTargetSystems])
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
