import { initI18n, t } from '../../../../src/i18n';
import { getPackagePrompts } from '../../../../src/prompts/questions';
import * as helpers from '../../../../src/prompts/helpers';
import * as conditions from '../../../../src/prompts/conditions';
import * as validators from '../../../../src/prompts/validators';
import { promptNames, PackageInputChoices } from '../../../../src/types';
import { ListQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import { PromptState } from '../../../../src/prompts/prompt-state';

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
                "message": "How do you want to enter the package?",
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
        jest.spyOn(conditions, 'showPackageInputChoiceQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validatePackageChoiceInput').mockResolvedValueOnce(true);

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
                                  "name": "Enter manually",
                                  "value": "EnterManualChoice",
                                },
                                Object {
                                  "name": "Choose from existing",
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
        const validatePackageChoiceInputForCliSpy = jest.spyOn(validators, 'validatePackageChoiceInputForCli');
        validatePackageChoiceInputForCliSpy.mockResolvedValueOnce();
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

        expect(validatePackageChoiceInputForCliSpy).toHaveBeenCalledTimes(1);
    });

    test('should return expected values from packageManual prompt methods', async () => {
        jest.spyOn(conditions, 'defaultOrShowManualPackageQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validatePackage').mockResolvedValueOnce(true);

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
        jest.spyOn(conditions, 'defaultOrShowSearchPackageQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validatePackage').mockResolvedValueOnce(true);
        jest.spyOn(validators, 'validatePackageChoiceInput').mockResolvedValueOnce(true);
        jest.spyOn(helpers, 'getPackageChoices').mockResolvedValueOnce({
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
});
