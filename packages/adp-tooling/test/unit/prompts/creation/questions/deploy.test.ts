import { getPrompts } from '../../../../../src/prompts/creation/questions/deploy';
import * as i18n from '../../../../../src/i18n';
import { EndpointsManager } from '../../../../../src/common';
import { AbapProvider } from '../../../../../src/client';
import { InputChoice } from '../../../../../src/types';
import type { ExtensionLogger } from '@sap-ux/logger';

const loggerMock: ExtensionLogger = {} as ExtensionLogger;
let endPointsManager: EndpointsManager;
let abapProvider: AbapProvider;

describe('getPrompts', () => {
    beforeAll(async () => {
        await i18n.initI18n();
        endPointsManager = await EndpointsManager.getInstance(loggerMock);
        abapProvider = new AbapProvider(endPointsManager, loggerMock);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get prompts', async () => {
        const prompts = await getPrompts(abapProvider, loggerMock);
        expect(prompts).toEqual([
            {
                type: 'input',
                name: 'abapRepository',
                message: i18n.t('prompts.abapRepository'),
                guiOptions: {
                    hint: i18n.t('tooltips.abapRepository'),
                    breadcrumb: i18n.t('prompts.abapRepository'),
                    mandatory: true
                },
                validate: expect.any(Function)
            },
            {
                type: 'input',
                name: 'deployConfigDescription',
                message: i18n.t('prompts.deployConfigDescription'),
                guiOptions: {
                    hint: i18n.t('tooltips.deployConfigDescription'),
                    breadcrumb: true
                }
            },
            {
                type: 'list',
                name: 'packageInputChoice',
                message: i18n.t('prompts.packageInputChoice'),
                choices: expect.any(Function),
                default: expect.any(Function),
                guiOptions: {
                    applyDefaultWhenDirty: true,
                    breadcrumb: i18n.t('prompts.packageInputChoice')
                },
                validate: expect.any(Function)
            },
            {
                type: 'input',
                name: 'packageManual',
                message: i18n.t('prompts.package'),
                guiOptions: {
                    hint: i18n.t('tooltips.package'),
                    breadcrumb: true,
                    mandatory: true
                },
                when: expect.any(Function),
                validate: expect.any(Function)
            },
            {
                type: 'autocomplete',
                name: 'packageAutocomplete',
                message: i18n.t('prompts.package'),
                guiOptions: {
                    mandatory: true,
                    breadcrumb: true,
                    hint: i18n.t('tooltips.package')
                },
                source: expect.any(Function),
                additionalInfo: expect.any(Function),
                when: expect.any(Function),
                validate: expect.any(Function)
            },
            {
                type: 'list',
                name: 'transportInputChoice',
                message: i18n.t('prompts.transportInputChoice'),
                choices: expect.any(Function),
                default: expect.any(Function),
                guiOptions: {
                    applyDefaultWhenDirty: true
                },
                validate: expect.any(Function),
                when: expect.any(Function)
            },
            {
                type: 'list',
                name: 'transportFromList',
                message: i18n.t('prompts.transport'),
                choices: expect.any(Function),
                validate: expect.any(Function),
                when: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('tooltips.transport'),
                    breadcrumb: true,
                    mandatory: true
                }
            },
            {
                type: 'input',
                name: 'transportManual',
                message: i18n.t('prompts.transport'),
                validate: expect.any(Function),
                when: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('tooltips.transport'),
                    breadcrumb: true,
                    mandatory: true
                }
            }
        ]);
    });
});
