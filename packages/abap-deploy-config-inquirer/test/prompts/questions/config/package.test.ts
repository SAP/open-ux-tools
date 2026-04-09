import { jest } from '@jest/globals';
import { promptNames, PackageInputChoices } from '../../../../src/types';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import { Severity } from '@sap-devx/yeoman-ui-types';

const mockShowPackageInputChoiceQuestion = jest.fn();
const mockDefaultOrShowManualPackageQuestion = jest.fn();
const mockDefaultOrShowSearchPackageQuestion = jest.fn();
const mockValidatePackageChoiceInput = jest.fn();
const mockValidatePackageChoiceInputForCli = jest.fn();
const mockValidatePackage = jest.fn();
const mockGetPackageChoices = jest.fn();

jest.unstable_mockModule('../../../../src/prompts/conditions', () => ({
    showPackageInputChoiceQuestion: mockShowPackageInputChoiceQuestion,
    defaultOrShowManualPackageQuestion: mockDefaultOrShowManualPackageQuestion,
    defaultOrShowSearchPackageQuestion: mockDefaultOrShowSearchPackageQuestion,
    showUsernameQuestion: jest.fn(),
    showPasswordQuestion: jest.fn(),
    showUrlQuestion: jest.fn(),
    showScpQuestion: jest.fn(),
    showClientChoiceQuestion: jest.fn(),
    showClientQuestion: jest.fn(),
    showUi5AppDeployConfigQuestion: jest.fn(),
    showTransportInputChoice: jest.fn(),
    defaultOrShowTransportListQuestion: jest.fn(),
    defaultOrShowTransportCreatedQuestion: jest.fn(),
    defaultOrShowManualTransportQuestion: jest.fn(),
    showIndexQuestion: jest.fn()
}));

jest.unstable_mockModule('../../../../src/prompts/validators', () => ({
    validatePackageChoiceInput: mockValidatePackageChoiceInput,
    validatePackageChoiceInputForCli: mockValidatePackageChoiceInputForCli,
    validatePackage: mockValidatePackage,
    validateUrl: jest.fn(),
    validateTargetSystem: jest.fn(),
    validateTargetSystemUrlCli: jest.fn(),
    updateDestinationPromptState: jest.fn(),
    validateDestinationQuestion: jest.fn(),
    validateClientChoiceQuestion: jest.fn(),
    validateClient: jest.fn(),
    validateCredentials: jest.fn(),
    validateUi5AbapRepoName: jest.fn(),
    validateAppDescription: jest.fn(),
    validateTransportChoiceInput: jest.fn(),
    validateTransportQuestion: jest.fn(),
    validateConfirmQuestion: jest.fn()
}));

jest.unstable_mockModule('../../../../src/prompts/helpers', () => ({
    getPackageChoices: mockGetPackageChoices,
    getAbapSystemChoices: jest.fn(),
    getDestinationChoices: jest.fn(),
    getClientChoiceDefaults: jest.fn(),
    getClientChoicePromptChoices: jest.fn(),
    getTransportChoices: jest.fn(),
    getTransportListChoices: jest.fn(),
    getPackageInputChoices: jest.fn().mockReturnValue([
        { name: 'Enter Manually', value: 'EnterManualChoice' },
        { name: 'Choose from Existing', value: 'ListExistingChoice' }
    ]),
    updatePromptStateUrl: jest.fn(),
    shouldRunValidation: jest.fn().mockReturnValue(true)
}));

const { initI18n, t } = await import('../../../../src/i18n');
const { getPackagePrompts } = await import('../../../../src/prompts/questions');
const { PromptState } = await import('../../../../src/prompts/prompt-state');

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
