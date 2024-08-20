import * as i18n from '../../../../../src/i18n';
import type { ManifestManager } from '../../../../../src/client';
import { getPrompts } from '../../../../../src/prompts/creation/questions/flp';

const manifestManagerInboundId = {
    getManifest: (_appId: string) => {
        return {
            ['sap.app']: {
                crossNavigation: {
                    inbounds: {
                        displayFactSheet: {
                            semanticObject: 'Bank',
                            action: 'displayFactSheet',
                            signature: {
                                parameters: {},
                                additionalParameters: 'allowed'
                            }
                        }
                    }
                }
            }
        };
    }
};

const manifestManagerWithoutInboundId = {
    getManifest: (_appId: string) => {
        return {
            ['sap.app']: {
                crossNavigation: {}
            }
        };
    }
};

describe('getPrompts', () => {
    beforeAll(async () => {
        await i18n.initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get prompts - base app with inboundId', async () => {
        const prompts = await getPrompts(
            manifestManagerInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        expect(prompts).toEqual([
            {
                type: 'list',
                name: 'inboundId',
                message: i18n.t('prompts.inboundId'),
                choices: ['displayFactSheet'],
                default: 'displayFactSheet',
                validate: expect.any(Function),
                when: true,
                guiOptions: {
                    hint: i18n.t('tooltips.inboundId'),
                    breadcrumb: i18n.t('prompts.inboundId'),
                    mandatory: true
                }
            },
            {
                type: 'input',
                name: 'flpInfo',
                message: i18n.t('prompts.flpInfo'),
                guiOptions: {
                    type: 'label',
                    mandatory: false,
                    link: {
                        text: 'application page.',
                        url: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/index.html?appId=fin.cash.factsheet.bank&releaseGroupTextCombined=SC`
                    }
                },
                when: false
            },
            {
                type: 'input',
                name: 'flpConfigurationTypeLabel',
                message: i18n.t('prompts.flpConfigurationType'),
                when: true,
                guiOptions: {
                    type: 'label',
                    hint: i18n.t('tooltips.flpConfigurationType'),
                    mandatory: false
                }
            },
            {
                type: 'input',
                name: 'semanticObject',
                message: i18n.t('prompts.semanticObject'),
                validate: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('prompts.semanticObject'),
                    breadcrumb: i18n.t('prompts.semanticObject'),
                    mandatory: true
                },
                when: false
            },
            {
                type: 'input',
                name: 'action',
                message: i18n.t('prompts.action'),
                validate: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('tooltips.action'),
                    breadcrumb: i18n.t('prompts.action'),
                    mandatory: true
                },
                when: false
            },
            {
                type: 'input',
                name: 'title',
                message: i18n.t('prompts.title'),
                guiOptions: {
                    hint: i18n.t('tooltips.title'),
                    breadcrumb: i18n.t('prompts.title'),
                    mandatory: true
                },
                when: true,
                validate: expect.any(Function)
            },
            {
                type: 'input',
                name: 'subTitle',
                message: i18n.t('prompts.subtitle'),
                guiOptions: {
                    hint: i18n.t('tooltips.subtitle'),
                    breadcrumb: i18n.t('prompts.subtitle')
                },
                when: true
            },
            {
                type: 'editor',
                name: 'parameters',
                message: i18n.t('prompts.parameters'),
                validate: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('tooltips.parameters'),
                    breadcrumb: i18n.t('prompts.parameters'),
                    mandatory: false
                },
                when: false
            }
        ]);
    });

    it('should get prompts - base app without inboundId', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        expect(prompts).toEqual([
            {
                type: 'list',
                name: 'inboundId',
                message: i18n.t('prompts.inboundId'),
                choices: [],
                default: undefined,
                validate: expect.any(Function),
                when: false,
                guiOptions: {
                    hint: i18n.t('tooltips.inboundId'),
                    breadcrumb: i18n.t('prompts.inboundId'),
                    mandatory: true
                }
            },
            {
                type: 'input',
                name: 'flpInfo',
                message: i18n.t('prompts.flpInfo'),
                guiOptions: {
                    type: 'label',
                    mandatory: false,
                    link: {
                        text: 'application page.',
                        url: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/index.html?appId=fin.cash.factsheet.bank&releaseGroupTextCombined=SC`
                    }
                },
                when: true
            },
            {
                type: 'input',
                name: 'flpConfigurationTypeLabel',
                message: i18n.t('prompts.flpConfigurationType'),
                when: true,
                guiOptions: {
                    type: 'label',
                    hint: i18n.t('tooltips.flpConfigurationType'),
                    mandatory: false
                }
            },
            {
                type: 'input',
                name: 'semanticObject',
                message: i18n.t('prompts.semanticObject'),
                validate: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('prompts.semanticObject'),
                    breadcrumb: i18n.t('prompts.semanticObject'),
                    mandatory: true
                },
                when: true
            },
            {
                type: 'input',
                name: 'action',
                message: i18n.t('prompts.action'),
                validate: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('tooltips.action'),
                    breadcrumb: i18n.t('prompts.action'),
                    mandatory: true
                },
                when: true
            },
            {
                type: 'input',
                name: 'title',
                message: i18n.t('prompts.title'),
                guiOptions: {
                    hint: i18n.t('tooltips.title'),
                    breadcrumb: i18n.t('prompts.title'),
                    mandatory: true
                },
                when: true,
                validate: expect.any(Function)
            },
            {
                type: 'input',
                name: 'subTitle',
                message: i18n.t('prompts.subtitle'),
                guiOptions: {
                    hint: i18n.t('tooltips.subtitle'),
                    breadcrumb: i18n.t('prompts.subtitle')
                },
                when: true
            },
            {
                type: 'editor',
                name: 'parameters',
                message: i18n.t('prompts.parameters'),
                validate: expect.any(Function),
                guiOptions: {
                    hint: i18n.t('tooltips.parameters'),
                    breadcrumb: i18n.t('prompts.parameters'),
                    mandatory: false
                },
                when: true
            }
        ]);
    });

    it('should pass with valid inboundId', async () => {
        const prompts = await getPrompts(
            manifestManagerInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const inboundIdPrompt = prompts.find((prompt) => prompt.name === 'inboundId') as any;
        expect(inboundIdPrompt.validate('displayFactSheet')).toBeTruthy();
    });

    it('should fail with empty inboundId', async () => {
        const prompts = await getPrompts(
            manifestManagerInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const inboundIdPrompt = prompts.find((prompt) => prompt.name === 'inboundId') as any;
        expect(inboundIdPrompt.validate('')).toBe('Inbound ID cannot be empty');
    });

    it('should pass with valid semantic object', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'semanticObject') as any;
        expect(semanticObjectPrompt.validate('semanticObject')).toBeTruthy();
    });

    it('should fail with invalid semantic object', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'semanticObject') as any;
        expect(semanticObjectPrompt.validate('')).toBe('Inbound ID cannot be empty');
    });

    it('should pass with valid action', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'action') as any;
        expect(semanticObjectPrompt.validate('action')).toBeTruthy();
    });

    it('should fail with invalid action', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'action') as any;
        expect(semanticObjectPrompt.validate('')).toBe('Inbound ID cannot be empty');
    });

    it('should pass with valid title', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'title') as any;
        expect(semanticObjectPrompt.validate('some title')).toBeTruthy();
    });

    it('should fail with invalid title', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'title') as any;
        expect(semanticObjectPrompt.validate('')).toBe('Inbound ID cannot be empty');
    });

    it('should pass with valid parameters', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'parameters') as any;
        expect(semanticObjectPrompt.validate('parameter1=value')).toBeTruthy();
    });

    it('should fail with invalid parameters', async () => {
        const prompts = await getPrompts(
            manifestManagerWithoutInboundId as unknown as ManifestManager,
            true,
            'fin.cash.factsheet.bank'
        );
        const semanticObjectPrompt = prompts.find((prompt) => prompt.name === 'parameters') as any;
        expect(semanticObjectPrompt.validate('parameter1=value&parameter1=test')).toBe(
            "Value cannot be parsed: Duplicated parameter: 'parameter1'! Please check the entered value and if needed create ticket for the application component in order to get the proper value."
        );
    });
});
