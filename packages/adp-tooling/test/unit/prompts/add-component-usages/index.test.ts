import { jest } from '@jest/globals';

const mockHasContentDuplication = jest.fn().mockReturnValue(false);
const mockHasCustomerPrefix = jest.fn().mockReturnValue(true);
const mockValidateJSON = jest.fn().mockReturnValue(true);
const mockValidateSpecialChars = jest.fn().mockReturnValue(true);
const mockValidateEmptyString = jest.fn().mockReturnValue(true);
const mockValidateEmptySpaces = jest.fn().mockReturnValue(true);

jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    hasContentDuplication: mockHasContentDuplication,
    hasCustomerPrefix: mockHasCustomerPrefix,
    validateJSON: mockValidateJSON,
    validateSpecialChars: mockValidateSpecialChars,
    validateEmptyString: mockValidateEmptyString,
    validateEmptySpaces: mockValidateEmptySpaces
}));

const { getPrompts } = await import('../../../../src/prompts/add-component-usages');
const i18n = await import('../../../../src/i18n');

describe('getPrompts', () => {
    const isLazyDropDownOptions = [
        { name: i18n.t('choices.true'), value: 'true' },
        { name: i18n.t('choices.false'), value: 'false' }
    ];
    const mockBasePath = '/path/to/project';
    const expectedPrompts = [
        {
            type: 'input',
            name: `usageId`,
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

    beforeEach(() => {
        // Reset mocks to defaults before each test
        mockHasContentDuplication.mockReturnValue(false);
        mockHasCustomerPrefix.mockReturnValue(true);
        mockValidateJSON.mockReturnValue(true);
        mockValidateSpecialChars.mockReturnValue(true);
        mockValidateEmptyString.mockReturnValue(true);
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
        test('should fail validation of usageId for special characters', () => {
            mockValidateSpecialChars.mockReturnValueOnce('error');

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'usageId')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('customer.@id')).toBe('error');
        });

        test('should fail validation of usageId for missing customer prefix', () => {
            mockHasCustomerPrefix.mockReturnValueOnce(false);

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'usageId')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('@id')).toBe("Component Usage ID must start with 'customer.'.");
        });

        test('should fail validation of usageId for empty value except customer prefix', () => {
            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'usageId')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('customer.')).toBe(
                "Component Usage ID must contain at least one character in addition to 'customer.'."
            );
        });

        test('should fail validation of usageId for content duplication', () => {
            mockHasContentDuplication.mockReturnValueOnce(true);

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'usageId')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('customer.id')).toBe(
                'A component usage with the same name was already added to the project. Rename and try again.'
            );
        });

        test('should pass validation of id', () => {
            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'usageId')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('customer.id')).toBe(true);
            expect(mockHasContentDuplication).toHaveBeenCalledWith('customer.id', 'componentUsages', []);
        });

        test('should fail validation of name for special characters', () => {
            mockValidateSpecialChars.mockReturnValueOnce('error');

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'name')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('name')).toBe('error');
        });

        test('should fail validation of comonent settings for JSON', () => {
            mockValidateJSON.mockReturnValueOnce('error');

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'settings')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('settings')).toBe('error');
        });

        test('should fail validation of comonent data for JSON', () => {
            mockValidateJSON.mockReturnValueOnce('error');

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'data')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('settings')).toBe('error');
        });

        test('should pass validation of comonent data for empty input', () => {
            mockValidateEmptyString.mockReturnValueOnce('error');

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'data')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('"key":"value"')).toBe(true);
        });

        test('should fail validation of library for special charecters', () => {
            mockValidateSpecialChars.mockReturnValueOnce('error');

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'library')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('customer.@library')).toBe('error');
        });

        test('should pass validation of library', () => {
            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'library')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('customer.library')).toBe(true);
            expect(mockHasContentDuplication).toHaveBeenCalledWith('customer.library', 'libraries', []);
        });

        test('should fail validation of library for content duplication', () => {
            mockHasContentDuplication.mockReturnValueOnce(true);

            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const validator = prompts.find((prompt) => prompt.name === 'library')?.validate;

            expect(typeof validator).toBe('function');
            expect(validator?.('library')).toBe(
                'A library with the same name was already added to the project. Rename and try again.'
            );
        });
    });

    describe('When conditions', () => {
        test('should show library prompts when shouldAddLibrary is true', () => {
            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const libraryPromptWhen = prompts.find((p) => p.name === 'library')?.when as Function;

            expect(typeof libraryPromptWhen).toBe('function');
            expect(libraryPromptWhen({ shouldAddLibrary: true })).toBeTruthy();
            expect(libraryPromptWhen({ shouldAddLibrary: false })).toBeFalsy();
        });

        test('should show libraryIsLazy when library is selected', () => {
            const prompts = getPrompts(mockBasePath, 'CUSTOMER_BASE');

            const libraryIsLazyPromptWhen = prompts.find((p) => p.name === 'libraryIsLazy')?.when as Function;

            expect(typeof libraryIsLazyPromptWhen).toBe('function');
            expect(libraryIsLazyPromptWhen({ shouldAddLibrary: true })).toBeTruthy();
            expect(libraryIsLazyPromptWhen({ shouldAddLibrary: false })).toBeFalsy();
        });
    });
});
