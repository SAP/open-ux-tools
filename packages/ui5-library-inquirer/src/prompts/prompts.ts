import type { ConfirmQuestion, FileBrowserQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import { searchChoices, ui5VersionsGrouped } from '@sap-ux/inquirer-common';
import { validateLibModuleName, validateNamespace, validateProjectFolder } from '@sap-ux/project-input-validator';
import type { UI5Version } from '@sap-ux/ui5-info';
import type { Answers, ListChoiceOptions, ListQuestion, Question } from 'inquirer';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import { t } from '../i18n';
import type { UI5LibraryAnswers, UI5LibraryPromptOptions } from '../types';

/**
 * Get the prompts for UI5 library generation.
 *
 * @param ui5Versions - ui5 versions to prompt for selection
 * @param options - optional inputs used to pre-populate some prompt choices, default values and other prompting options. See {@link UI5LibraryPromptOptions}.
 * @returns the prompts
 */
export function getQuestions(
    ui5Versions: UI5Version[],
    options?: UI5LibraryPromptOptions
): Question<UI5LibraryAnswers>[] {
    const ui5VersionChoices = ui5VersionsGrouped(ui5Versions, options?.includeSeparators);
    return [
        {
            type: 'input',
            name: 'libraryName',
            message: t('prompts.libraryNameLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            validate: (libraryName): boolean | string => validateLibModuleName(libraryName),
            default: t('prompts.libraryNameDefault')
        } as InputQuestion<UI5LibraryAnswers>,
        {
            type: 'input',
            name: 'namespace',
            message: t('prompts.libraryNamespaceLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            validate: (namespace, answers): boolean | string =>
                validateNamespace(namespace, answers?.libraryName, false),
            default: t('prompts.libraryNamespaceDefault')
        } as InputQuestion<UI5LibraryAnswers>,
        {
            type: 'input',
            name: 'targetFolder',
            message: t('prompts.libraryFolderLabel'),
            guiType: 'folder-browser',
            guiOptions: {
                applyDefaultWhenDirty: true,
                mandatory: true,
                breadcrumb: true
            },
            default: options?.targetFolder ?? process.cwd(),
            validate: (target, answers): boolean | string =>
                validateProjectFolder(target, `${answers?.namespace}.${answers?.libraryName}`)
        } as FileBrowserQuestion<UI5LibraryAnswers>,
        {
            when: () => !!ui5VersionChoices,
            type: options?.useAutocomplete ? 'autocomplete' : 'list',
            name: 'ui5Version',
            message: t('prompts.libraryUi5VersionLabel'),
            guiOptions: {
                hint: t('prompts.libraryUi5VersionTooltip'),
                breadcrumb: true
            },
            choices: () => ui5VersionChoices,
            source: (prevAnswers: Answers, input: string) =>
                searchChoices(input, ui5VersionChoices as ListChoiceOptions[])
        } as ListQuestion<UI5LibraryAnswers> | AutocompleteQuestionOptions<UI5LibraryAnswers>,
        {
            type: 'confirm',
            name: 'enableTypescript',
            message: t('prompts.libraryEnableTypeScriptLabel'),
            guiOptions: {
                breadcrumb: true
            },
            default: false
        } as ConfirmQuestion
    ] as Question<UI5LibraryAnswers>[] | AutocompleteQuestionOptions<UI5LibraryAnswers>[];
}
