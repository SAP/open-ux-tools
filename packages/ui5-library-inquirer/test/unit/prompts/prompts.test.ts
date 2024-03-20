import { getQuestions } from '../../../src/prompts';
import { t } from '../../../src/i18n';
import { join } from 'path';
import type { Separator } from 'inquirer';
import * as projectInputValidators from '@sap-ux/project-input-validator';
import type { UI5VersionChoice } from '@sap-ux/inquirer-common';
import * as utility from '@sap-ux/inquirer-common';

jest.mock('@sap-ux/project-input-validator', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/project-input-validator')
    };
});

jest.mock('@sap-ux/inquirer-common', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/inquirer-common')
    };
});

describe('getPrompts', () => {
    const ui5VersionsGrouped: (UI5VersionChoice | Separator)[] = [
        {
            line: '[2mMaintained versions[22m',
            type: 'separator'
        },
        {
            name: '1.1.0',
            value: '1.1.0'
        },
        {
            name: '2.1.0',
            value: '2.1.0'
        },
        {
            name: '1.1.0-snapshot',
            value: '1.1.0-snapshot'
        },
        {
            line: '[2mOut of maintenance versions[22m',
            type: 'separator'
        },
        {
            name: '0.1.0',
            value: '0.1.0'
        }
    ];

    it('getQuestions, no options specified', () => {
        const ui5VersGroupedSpy = jest.spyOn(utility, 'ui5VersionsGrouped').mockReturnValueOnce(ui5VersionsGrouped);

        // Not passing any versions as internally called function `ui5VersionsGrouped` is mocked
        const projectQuestions = getQuestions([]);
        expect(ui5VersGroupedSpy).toHaveBeenCalledWith([], undefined);
        expect(projectQuestions.length).toEqual(5);

        const prompts = projectQuestions.reduce(
            (prompts, prompt) => Object.assign(prompts, { [prompt.name ?? 'unknown_prompt']: prompt }),
            {}
        ) as any;

        const libNameQ = prompts['libraryName'];
        expect(libNameQ.type).toEqual('input');
        expect(libNameQ.message).toEqual(t('prompts.libraryNameLabel'));
        expect(libNameQ.default).toEqual(t('prompts.libraryNameDefault'));
        expect(libNameQ.guiOptions).toEqual({
            breadcrumb: true,
            mandatory: true
        });
        // Validators are fully tested in `@sap-ux/project-input-validators`
        const validateLibModNameSpy = jest.spyOn(projectInputValidators, 'validateLibModuleName').mockReturnValue(true);
        expect(libNameQ.validate('library1')).toEqual(true);
        expect(validateLibModNameSpy).toHaveBeenCalledWith('library1');

        const namespaceQ = prompts['namespace'];
        expect(namespaceQ.type).toEqual('input');
        expect(namespaceQ.message).toEqual(t('prompts.libraryNamespaceLabel'));
        expect(namespaceQ.guiOptions).toEqual({
            breadcrumb: true,
            mandatory: true
        });

        const validateLibNamespaceSpy = jest.spyOn(projectInputValidators, 'validateNamespace').mockReturnValue(true);
        expect(namespaceQ.validate('com.myorg', { libraryName: 'abc123' })).toEqual(true);
        expect(validateLibNamespaceSpy).toHaveBeenCalledWith('com.myorg', 'abc123', false);

        const targetFolderQ = prompts['targetFolder'];
        expect(targetFolderQ.type).toEqual('input');
        expect(targetFolderQ.message).toEqual(t('prompts.libraryFolderLabel'));
        expect(targetFolderQ.guiOptions).toEqual({
            applyDefaultWhenDirty: true,
            breadcrumb: true,
            mandatory: true
        });
        expect(targetFolderQ.default).toEqual(process.cwd());

        const validateProjectFolderSpy = jest
            .spyOn(projectInputValidators, 'validateProjectFolder')
            .mockReturnValue(true);
        const somePath = join(__dirname, 'any_where');
        expect(targetFolderQ.validate(somePath, { namespace: 'test.com', libraryName: 'test1' })).toEqual(true);
        expect(validateProjectFolderSpy).toHaveBeenCalledWith(somePath, 'test.com.test1');

        const ui5VersionQ = prompts['ui5Version'];
        expect(ui5VersionQ.type).toEqual('list');
        expect(ui5VersionQ.when()).toEqual(true);
        expect(ui5VersionQ.message).toEqual(t('prompts.libraryUi5VersionLabel'));
        expect(ui5VersionQ.choices()).toEqual(ui5VersionsGrouped);
        expect(ui5VersionQ.guiOptions).toEqual({
            breadcrumb: true,
            hint: t('prompts.libraryUi5VersionTooltip')
        });
        expect(ui5VersionQ.default).toBeUndefined();

        const enableTypeScriptQ = prompts['enableTypescript'];
        expect(enableTypeScriptQ.type).toEqual('confirm');
        expect(enableTypeScriptQ.message).toEqual(t('prompts.libraryEnableTypeScriptLabel'));
        expect(enableTypeScriptQ.default).toEqual(false);
    });

    it('getQuestions, test options', () => {
        const ui5VersGroupedSpy = jest.spyOn(utility, 'ui5VersionsGrouped').mockReturnValueOnce(ui5VersionsGrouped);

        /**
         * Option: targetFolder
         */
        const targetFolder = 'some/fake/path';
        // Not passing any versions as internally called function `ui5VersionsGrouped` is mocked
        const projectQuestions = getQuestions([], {
            includeSeparators: true,
            targetFolder,
            useAutocomplete: true
        });
        expect(ui5VersGroupedSpy).toHaveBeenCalledWith([], true);
        expect(projectQuestions.length).toEqual(5);

        const prompts = projectQuestions.reduce(
            (prompts, prompt) => Object.assign(prompts, { [prompt.name ?? 'unknown_prompt']: prompt }),
            {}
        ) as any;

        const targetFolderQ = prompts['targetFolder'];
        const validateProjectFolderSpy = jest
            .spyOn(projectInputValidators, 'validateProjectFolder')
            .mockReturnValue(true);
        const somePath = join(__dirname, 'any_where');
        expect(targetFolderQ.validate(somePath, { namespace: 'test.com', libraryName: 'test1' })).toEqual(true);
        expect(validateProjectFolderSpy).toHaveBeenCalledWith(somePath, 'test.com.test1');
        expect(targetFolderQ.default).toEqual(targetFolder);

        /**
         * Option: useAutocomplete
         */
        const ui5VersionQ = prompts['ui5Version'];
        expect(ui5VersionQ.type).toEqual('autocomplete');
        expect(ui5VersionQ.choices()).toEqual(ui5VersionsGrouped);

        const filteredUI5Versions = [
            {
                name: '1.1.0',
                value: {
                    version: '1.1.0',
                    default: false,
                    maintained: true
                }
            },
            {
                name: '2.1.0',
                value: {
                    version: '2.1.0',
                    default: true,
                    maintained: true
                }
            }
        ];
        const searchChoicesSpy = jest.spyOn(utility, 'searchChoices').mockReturnValue(filteredUI5Versions);
        expect(ui5VersionQ.source({}, '1.0')).toEqual(filteredUI5Versions);
        expect(searchChoicesSpy).toHaveBeenCalledWith('1.0', ui5VersionsGrouped);
    });
});
