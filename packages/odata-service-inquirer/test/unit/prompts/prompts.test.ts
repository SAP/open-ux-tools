import { jest } from '@jest/globals';
import type { BackendSystem } from '@sap-ux/store';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';

const actualBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils
}));

const actualStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([
            {
                name: 'storedSystem1',
                url: 'http://url1',
                systemType: 'OnPrem'
            },
            {
                name: 'storedSystem2',
                url: 'http://url2',
                systemType: 'BTP'
            }
        ] as BackendSystem[]),
        read: jest.fn().mockImplementation((key) => {
            // Mock read to return systems with credentials
            const systems = [
                {
                    name: 'storedSystem1',
                    url: 'http://url1',
                    systemType: 'OnPrem',
                    username: 'user1',
                    password: 'pass1'
                },
                {
                    name: 'storedSystem2',
                    url: 'http://url2',
                    systemType: 'BTP'
                }
            ];
            return Promise.resolve(systems.find((s) => s.url === key.url));
        })
    }))
}));

const actualUtils = await import('../../../src/utils');
const mockGetPromptHostEnvironment = jest.fn<any>(actualUtils.getPromptHostEnvironment);
jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    getPromptHostEnvironment: mockGetPromptHostEnvironment
}));

const { initI18nOdataServiceInquirer, t } = await import('../../../src/i18n');
const { getQuestions } = await import('../../../src/prompts');
const { DatasourceType } = await import('../../../src/types');

describe('getQuestions', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    afterEach(() => {
        // Ensure test isolation
        jest.clearAllMocks();
    });
    test('getQuestions', async () => {
        mockGetPromptHostEnvironment.mockReturnValueOnce(hostEnvironment.cli);
        // Tests all declaritive values
        expect(await getQuestions()).toMatchSnapshot();

        // Test that default is correctly set by options
        expect((await getQuestions({ datasourceType: { default: DatasourceType.capProject } }))[0]).toMatchObject({
            default: DatasourceType.capProject
        });
        // Test that additional choices are added by options: 'includeNone'
        expect((await getQuestions({ datasourceType: { includeNone: true } }))[0]).toMatchObject({
            choices: expect.arrayContaining([
                { name: t('prompts.datasourceType.choiceNone'), value: DatasourceType.none }
            ])
        });
    });
});
