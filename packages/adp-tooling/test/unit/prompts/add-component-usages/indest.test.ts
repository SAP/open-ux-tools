import * as i18n from '../../../../src/i18n';
import { getPrompts } from '../../../../src/prompts/add-component-usages';
import * as validators from '../../../../src/base/validators';

describe('getPrompts', () => {
    const isLazyDropDownOptions = [
        { name: i18n.t('choices.true'), value: 'true' },
        { name: i18n.t('choices.false'), value: 'false' }
    ];
    const mockBasePath = '/path/to/project';
    const expectedPrompts = [
        {
            type: 'input',
            name: `id`,
            message: i18n.t('prompts.component.usageIdLabel'),
            validate: expect.any(Function),
            default: 'customer.',
            store: false,
            guiOptions: {
                mandatory: true,
                hint: i18n.t('prompts.component.usageIdTooltip')
            }
        },
        {
            type: 'input',
            name: 'name',
            message: i18n.t('prompts.component.nameLabel'),
            validate: expect.any(Function),
            store: false,
            guiOptions: {
                mandatory: true,
                hint: i18n.t('prompts.component.nameTooltip')
            }
        },
        {
            type: 'list',
            name: 'isLazy',
            message: i18n.t('prompts.component.isLazyLabel'),
            choices: isLazyDropDownOptions,
            default: isLazyDropDownOptions[1].value,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: i18n.t('prompts.component.isLazyTooltip')
            }
        },
        {
            type: 'editor',
            name: `settings`,
            message: i18n.t('prompts.component.settingsLabel'),
            validate: expect.any(Function),
            store: false,
            guiOptions: {
                mandatory: false,
                hint: i18n.t('prompts.component.tooltip', { input: i18n.t('prompts.component.settingsLabel') })
            }
        },
        {
            type: 'editor',
            name: `data`,
            message: i18n.t('prompts.component.dataLabel'),
            validate: expect.any(Function),
            store: false,
            guiOptions: {
                mandatory: false,
                hint: i18n.t('prompts.component.tooltip', { input: i18n.t('prompts.component.dataLabel') })
            }
        },
        {
            type: 'confirm',
            name: 'shouldAddLibrary',
            message: i18n.t('prompts.component.shouldAddLibraryLabel'),
            default: false,
            guiOptions: {
                hint: i18n.t('prompts.component.shouldAddLibraryTooltip')
            }
        },
        {
            type: 'input',
            name: 'library',
            message: i18n.t('prompts.component.libraryLabel'),
            guiOptions: {
                mandatory: true,
                hint: i18n.t('prompts.component.libraryTooltip')
            },
            validate: expect.any(Function),
            store: false,
            when: expect.any(Function)
        },
        {
            type: 'list',
            name: `libraryIsLazy`,
            message: i18n.t('prompts.component.libraryIsLazyLabel'),
            choices: isLazyDropDownOptions,
            default: isLazyDropDownOptions[1].value,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: i18n.t('prompts.component.libraryIsLazyTooltip')
            },
            when: expect.any(Function)
        }
    ];

    beforeAll(async () => {
        await i18n.initI18n();
    });

    test('should return prompts', () => {
        const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

        expect(prompts).toEqual(expectedPrompts);
    });

    test('should return prompts for non-customer base', () => {
        expectedPrompts[0].default = '';

        const prompts = getPrompts(mockBasePath, 'VENDOR');

        expect(prompts).toEqual(expectedPrompts);
    });

    describe('Validators', () => {
        test('should validate id for content duplication', () => {
            jest.spyOn(validators, 'validateContentDuplication').mockReturnValueOnce('error');

            const validator = (getPrompts(mockBasePath, 'CUSTOMER_BASE')[0] as any).validate;

            expect(validator('id')).toBe('error');
            expect(validators.validateContentDuplication).toHaveBeenCalledWith(
                'id',
                'componentUsages',
                [],
                true,
                i18n.t('prompts.component.usageIdLabel'),
                i18n.t('prompts.component.usage')
            );
        });

        test('should validate name for special characters', () => {
            jest.spyOn(validators, 'validateSpecialChars').mockReturnValueOnce('error');

            const validator = (getPrompts(mockBasePath, 'CUSTOMER_BASE')[1] as any).validate;

            expect(validator('name')).toBe('error');
            expect(validators.validateSpecialChars).toHaveBeenCalledWith('name', i18n.t('prompts.component.nameLabel'));
        });

        test('should validate comonent settings for JSON', () => {
            jest.spyOn(validators, 'validateJSON').mockReturnValueOnce('error');

            const validator = (getPrompts(mockBasePath, 'CUSTOMER_BASE')[3] as any).validate;

            expect(validator('settings')).toBe('error');
            expect(validators.validateJSON).toHaveBeenCalledWith('settings', i18n.t('prompts.component.settingsLabel'));
        });

        test('should validate comonent data for JSON', () => {
            jest.spyOn(validators, 'validateJSON').mockReturnValueOnce('error');

            const validator = (getPrompts(mockBasePath, 'CUSTOMER_BASE')[4] as any).validate;

            expect(validator('settings')).toBe('error');
            expect(validators.validateJSON).toHaveBeenCalledWith('settings', i18n.t('prompts.component.settingsLabel'));
        });

        test('should validate library for content duplication', () => {
            jest.spyOn(validators, 'validateContentDuplication').mockReturnValueOnce('error');

            const validator = (getPrompts(mockBasePath, 'CUSTOMER_BASE')[6] as any).validate;

            expect(validator('library')).toBe('error');
            expect(validators.validateContentDuplication).toHaveBeenCalledWith(
                'library',
                'libraries',
                [],
                true,
                i18n.t('prompts.component.libraryLabel'),
                i18n.t('prompts.component.libraryLabel')
            );
        });
    });

    describe('When conditions', () => {
        test('should show library prompts when shouldAddLibrary is true', () => {
            const when = (getPrompts(mockBasePath, 'CUSTOMER_BASE')[6] as any).when;

            expect(when({ shouldAddLibrary: true })).toBeTruthy();
            expect(when({ shouldAddLibrary: false })).toBeFalsy();
        });

        test('should show libraryIsLazy when library is selected', () => {
            const when = (getPrompts(mockBasePath, 'CUSTOMER_BASE')[7] as any).when;

            expect(when({ shouldAddLibrary: true })).toBeTruthy();
            expect(when({ shouldAddLibrary: false })).toBeFalsy();
        });
    });
});
