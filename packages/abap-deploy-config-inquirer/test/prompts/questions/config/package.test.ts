import { jest } from '@jest/globals';
import { promptNames, PackageInputChoices } from '../../../../src/types.js';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import { Severity } from '@sap-devx/yeoman-ui-types';

const mockShowPackageInputChoiceQuestion = jest.fn<typeof actualConditions.showPackageInputChoiceQuestion>();
const mockDefaultOrShowManualPackageQuestion = jest.fn<typeof actualConditions.defaultOrShowManualPackageQuestion>();
const mockDefaultOrShowSearchPackageQuestion = jest.fn<typeof actualConditions.defaultOrShowSearchPackageQuestion>();
const mockValidatePackageChoiceInput = jest.fn<typeof actualValidators.validatePackageChoiceInput>();
const mockValidatePackageChoiceInputForCli = jest.fn<typeof actualValidators.validatePackageChoiceInputForCli>();
const mockValidatePackage = jest.fn<typeof actualValidators.validatePackage>();
const mockGetPackageChoices = jest.fn<typeof actualHelpers.getPackageChoices>();

const actualConditions = await import('../../../../src/prompts/conditions.js');
const actualValidators = await import('../../../../src/prompts/validators.js');
const actualHelpers = await import('../../../../src/prompts/helpers.js');

jest.unstable_mockModule('../../../../src/prompts/conditions', () => ({
    ...actualConditions,
    showPackageInputChoiceQuestion: mockShowPackageInputChoiceQuestion,
    defaultOrShowManualPackageQuestion: mockDefaultOrShowManualPackageQuestion,
    defaultOrShowSearchPackageQuestion: mockDefaultOrShowSearchPackageQuestion
}));

jest.unstable_mockModule('../../../../src/prompts/validators', () => ({
    ...actualValidators,
    validatePackageChoiceInput: mockValidatePackageChoiceInput,
    validatePackageChoiceInputForCli: mockValidatePackageChoiceInputForCli,
    validatePackage: mockValidatePackage
}));

jest.unstable_mockModule('../../../../src/prompts/helpers', () => ({
    ...actualHelpers,
    getPackageChoices: mockGetPackageChoices,
    getPackageInputChoices: jest.fn().mockReturnValue([
        { name: 'Enter Manually', value: 'EnterManualChoice' },
        { name: 'Choose from Existing', value: 'ListExistingChoice' }
    ]),
    shouldRunValidation: jest.fn().mockReturnValue(true)
}));

const { initI18n, t } = await import('../../../../src/i18n.js');
const { getPackagePrompts } = await import('../../../../src/prompts/questions/config/package.js');
const { PromptState } = await import('../../../../src/prompts/prompt-state.js');

describe('getPackagePrompts', () => {
    beforeAll(async () => {
        await initI18n();
    });
    it('should return expected prompts', () => {
        const prompts = getPackagePrompts({});
        expect(prompts).toMatchInlineSnapshot(`
            Array [
              Object {
                "choices": [Function],
                "default": [Function],
                "guiOptions": Object {
                  "applyDefaultWhenDirty": true,
                },
                "message": "Select How You Want to Enter the Package",
                "name": "packageInputChoice",
                "type": "list",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "name": "packageCliExecution",
                "type": "input",
                "when": [Function],
              },
              Object {
                "additionalMessages": [Function],
                "default": [Function],
                "guiOptions": Object {
                  "breadcrumb": true,
                  "hint": "Provide a package for the deployed application.",
                  "mandatory": true,
                },
                "message": "Package",
                "name": "packageManual",
                "type": "input",
                "validate": [Function],
                "when": [Function],
              },
              Object {
                "additionalInfo": [Function],
                "guiOptions": Object {
                  "breadcrumb": true,
                  "hint": "Select a package for the deployed application.",
                  "mandatory": true,
                },
                "message": "Package (Type to filter matching records)",
                "name": "packageAutocomplete",
                "source": [Function],
                "type": "autocomplete",
                "validate": [Function],
                "when": [Function],
              },
            ]
        `);
    });

    test('should return expected values from packageInputChoice prompt methods', async () => {
        mockShowPackageInputChoiceQuestion.mockReturnValueOnce(true);
        mockValidatePackageChoiceInput.mockResolvedValueOnce(true);

        const packagePrompts = getPackagePrompts({});
        const packageInputChoicePrompt = packagePrompts.find(
            (prompt) => prompt.name === promptNames.packageInputChoice
        );

        if (packageInputChoicePrompt) {
            expect((packageInputChoicePrompt.when as Function)()).toBe(true);
            expect(packageInputChoicePrompt.message).toBe(t('prompts.config.package.packageInputChoice.message'));
            expect(((packageInputChoicePrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Enter Manually",
                    "value": "EnterManualChoice",
                  },
                  Object {
                    "name": "Choose from Existing",
                    "value": "ListExistingChoice",
                  },
                ]
            `);

            expect(
                (packageInputChoicePrompt.default as Function)({
                    packageInputChoice: PackageInputChoices.EnterManualChoice
                })
            ).toBe('EnterManualChoice');
            expect(await (packageInputChoicePrompt.validate as Function)()).toBe(true);
        }
    });

    test('should return expected values from packageCliExecution prompt methods', async () => {
        mockValidatePackageChoiceInputForCli.mockResolvedValueOnce();
        // Cli
        const packagePromptsCli = getPackagePrompts({}, false, false);
        const packageCliExecutionPromptCli = packagePromptsCli.find(
            (prompt) => prompt.name === promptNames.packageCliExecution
        );

        if (packageCliExecutionPromptCli) {
            expect(await (packageCliExecutionPromptCli.when as Function)({})).toBe(false);
        }

        // Vscode
        const packagePrompts = getPackagePrompts({}, true, true);
        const packageCliExecutionPrompt = packagePrompts.find(
            (prompt) => prompt.name === promptNames.packageCliExecution
        );

        if (packageCliExecutionPrompt) {
            expect(await (packageCliExecutionPrompt.when as Function)({})).toBe(false);
        }

        expect(mockValidatePackageChoiceInputForCli).toHaveBeenCalledTimes(1);
    });

    test('should return expected values from packageManual prompt methods', async () => {
        mockDefaultOrShowManualPackageQuestion.mockReturnValueOnce(true);
        mockValidatePackage.mockResolvedValueOnce(true);

        const packagePrompts = getPackagePrompts({});
        const packageManualPrompt = packagePrompts.find((prompt) => prompt.name === promptNames.packageManual);

        if (packageManualPrompt) {
            expect((packageManualPrompt.when as Function)({ packageInputChoice: 'EnterManualChoice' })).toBe(true);
            expect(packageManualPrompt.message).toBe(t('prompts.config.package.packageManual.message'));

            expect(
                (packageManualPrompt.default as Function)({
                    packageManual: 'TEST_PACKAGE'
                })
            ).toBe('TEST_PACKAGE');
            expect(await (packageManualPrompt.validate as Function)()).toBe(true);
        }
    });

    test('should return expected values from packageAutocomplete prompt methods', async () => {
        mockDefaultOrShowSearchPackageQuestion.mockReturnValueOnce(true);
        mockValidatePackage.mockResolvedValueOnce(true);
        mockValidatePackageChoiceInput.mockResolvedValueOnce(true);
        mockGetPackageChoices.mockResolvedValueOnce({
            packages: ['TEST_PACKAGE_1', 'TEST_PACKAGE_2'],
            morePackageResultsMsg: 'Test additional msg'
        });

        const packagePrompts = getPackagePrompts({});
        const packageInputChoicePrompt = packagePrompts.find(
            (prompt) => prompt.name === promptNames.packageInputChoice
        );
        if (packageInputChoicePrompt) {
            await (packageInputChoicePrompt.validate as Function)();
        }

        const packageAutocompletePrompt = packagePrompts.find(
            (prompt) => prompt.name === promptNames.packageAutocomplete
        );

        if (packageAutocompletePrompt) {
            expect((packageAutocompletePrompt.when as Function)({ packageInputChoice: 'ListExistingChoice' })).toBe(
                true
            );
            PromptState.isYUI = false;
            expect(
                await ((packageAutocompletePrompt as AutocompleteQuestionOptions).source as Function)()
            ).toStrictEqual(['TEST_PACKAGE_1', 'TEST_PACKAGE_2']);
            expect(((packageAutocompletePrompt as any).additionalInfo as Function)()).toBe('Test additional msg');
            expect(await (packageAutocompletePrompt.validate as Function)({ name: '$TMP', value: '$TMP' })).toBe(true);
        }
    });

    describe('additionalMessages for packageManual', () => {
        test('should return warning when package is lowercase $tmp', () => {
            const packagePrompts = getPackagePrompts({});
            const packageManualPrompt = packagePrompts.find((prompt) => prompt.name === promptNames.packageManual);

            if (packageManualPrompt && (packageManualPrompt as any).additionalMessages) {
                const result = ((packageManualPrompt as any).additionalMessages as Function)('$tmp');
                expect(result).toEqual({
                    message: t('warnings.packageTmpLowercase'),
                    severity: Severity.warning
                });
            }
        });

        test('should return undefined when package is uppercase $TMP', () => {
            const packagePrompts = getPackagePrompts({});
            const packageManualPrompt = packagePrompts.find((prompt) => prompt.name === promptNames.packageManual);

            if (packageManualPrompt && (packageManualPrompt as any).additionalMessages) {
                const result = ((packageManualPrompt as any).additionalMessages as Function)('$TMP');
                expect(result).toBeUndefined();
            }
        });

        test('should return undefined when package is ZPACKAGE', () => {
            const packagePrompts = getPackagePrompts({});
            const packageManualPrompt = packagePrompts.find((prompt) => prompt.name === promptNames.packageManual);

            if (packageManualPrompt && (packageManualPrompt as any).additionalMessages) {
                const result = ((packageManualPrompt as any).additionalMessages as Function)('ZPACKAGE');
                expect(result).toBeUndefined();
            }
        });

        test('should return undefined when package is empty', () => {
            const packagePrompts = getPackagePrompts({});
            const packageManualPrompt = packagePrompts.find((prompt) => prompt.name === promptNames.packageManual);

            if (packageManualPrompt && (packageManualPrompt as any).additionalMessages) {
                const result = ((packageManualPrompt as any).additionalMessages as Function)('');
                expect(result).toBeUndefined();
            }
        });
    });
});
