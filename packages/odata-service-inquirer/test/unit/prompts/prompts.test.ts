import { initI18nOdataServiceInquirer, t } from '../../../src/i18n';
import { getQuestions } from '../../../src/prompts';
import { DatasourceType, hostEnvironment } from '../../../src/types';
import * as utils from '../../../src/utils';
import * as btpUtils from '@sap-ux/btp-utils';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { ToolsLogger } from '@sap-ux/logger';
import type { BackendSystem } from '@sap-ux/store';
import { getService } from '@sap-ux/store';
import { Service } from '@sap-ux/axios-extension';

/**
 * Workaround to for spyOn TypeError: Jest cannot redefine property
 */
jest.mock('@sap-ux/btp-utils', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/btp-utils')
    };
});

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue([
            {
                name: 'storedSystem1',
                url: 'http://url1'
            },
            {
                name: 'storedSystem2',
                url: 'http://url2'
            }
        ] as BackendSystem[])
    }))
}));

describe('getQuestions', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    afterEach(() => {
        // Ensure test isolation
        jest.restoreAllMocks();
    });
    test('getQuestions', async () => {
        jest.spyOn(utils, 'getHostEnvironment').mockReturnValueOnce(hostEnvironment.cli);
        // Tests all declaritive values
        expect(await getQuestions()).toMatchSnapshot();

        // Test that default is correctly set by options
        expect((await getQuestions({ datasourceType: { default: DatasourceType.capProject } }))[0]).toMatchObject({
            default: DatasourceType.capProject
        });
        // Test that additional choices are added by options: 'includeNone'
        expect((await getQuestions({ datasourceType: { includeNone: true } }))[0]).toMatchObject({
            choices: expect.arrayContaining([
                { name: t('prompts.datasourceType.noneName'), value: DatasourceType.none }
            ])
        });
    });
});
