import { initI18n, t } from '../../../../src/i18n';
import { getPackagePrompts } from '../../../../src/prompts/questions';
import * as helpers from '../../../../src/prompts/helpers';
import * as conditions from '../../../../src/prompts/conditions';
import * as validators from '../../../../src/prompts/validators';
import { abapDeployConfigInternalPromptNames, PackageInputChoices } from '../../../../src/types';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { ListQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

const mockGetHostEnvironment = getHostEnvironment as jest.Mock;

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
                "message": "Package",
                "name": "packageAutocomplete",
                "source": [Function],
                "type": "autocomplete",
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
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.packageInputChoice
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
        mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.cli);
        const packagePromptsCli = getPackagePrompts({});
        const packageCliExecutionPromptCli = packagePromptsCli.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.packageCliExecution
        );

        if (packageCliExecutionPromptCli) {
            expect(await (packageCliExecutionPromptCli.when as Function)({})).toBe(false);
        }

        // Vscode
        mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.vscode);

        const packagePrompts = getPackagePrompts({});
        const packageCliExecutionPrompt = packagePrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.packageCliExecution
        );

        if (packageCliExecutionPrompt) {
            expect(await (packageCliExecutionPrompt.when as Function)({})).toBe(false);
        }

        expect(validatePackageChoiceInputForCliSpy).toHaveBeenCalledTimes(1);
    });

    test('should return expected values from packageManual prompt methods', async () => {
        jest.spyOn(conditions, 'defaultOrShowManualPackageQuestion').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validatePackage').mockReturnValueOnce(true);

        const packagePrompts = getPackagePrompts({});
        const packageManualPrompt = packagePrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.packageManual
        );

        if (packageManualPrompt) {
            expect((packageManualPrompt.when as Function)()).toBe(true);
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
        jest.spyOn(validators, 'validatePackage').mockReturnValueOnce(true);
        jest.spyOn(validators, 'validatePackageChoiceInput').mockResolvedValueOnce(true);
        jest.spyOn(helpers, 'getPackageChoices').mockResolvedValueOnce({
            packages: ['TEST_PACKAGE_1', 'TEST_PACKAGE_2'],
            morePackageResultsMsg: 'Test additional msg'
        });

        const packagePrompts = getPackagePrompts({});
        const packageInputChoicePrompt = packagePrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.packageInputChoice
        );
        if (packageInputChoicePrompt) {
            await (packageInputChoicePrompt.validate as Function)();
        }

        const packageAutocompletePrompt = packagePrompts.find(
            (prompt) => prompt.name === abapDeployConfigInternalPromptNames.packageAutocomplete
        );

        if (packageAutocompletePrompt) {
            expect((packageAutocompletePrompt.when as Function)()).toBe(true);
            mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.cli);
            expect(
                await ((packageAutocompletePrompt as AutocompleteQuestionOptions).source as Function)()
            ).toStrictEqual(['TEST_PACKAGE_1', 'TEST_PACKAGE_2']);
            expect(((packageAutocompletePrompt as any).additionalInfo as Function)()).toBe('Test additional msg');
        }
    });
});