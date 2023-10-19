import { t } from '../i18n';
import type { Answers, ListChoiceOptions, ListQuestion, Question } from 'inquirer';
import {
    getPlatform,
    ui5VersionsGrouped,
    validateLibModuleName,
    validateLibNamespace,
    validateProjectFolder,
    PLATFORMS,
    searchChoices
} from '@sap-ux/prompts-common';
import type { FileBrowserQuestion, ConfirmQuestion, InputQuestion, AutocompleteQuestion } from '@sap-ux/prompts-common';
import type { UI5LibraryAnswers, UI5LibraryPromptInput } from '../types';

/**
 * Get the prompts for UI5 library generation.
 *
 * @param ui5LibPromptInput - optional inputs used to prepopulate some prompt choices or default values
 * @returns the prompts
 */
export function getQuestions(ui5LibPromptInput?: UI5LibraryPromptInput): Question<UI5LibraryAnswers>[] {
    const ui5VersionChoices = ui5VersionsGrouped(ui5LibPromptInput?.versions);
    return [
        {
            type: 'input',
            name: 'libraryName',
            message: t('PROMPT_LIB_NAME_LABEL'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            validate: (libraryName): boolean | string => validateLibModuleName(libraryName),
            default: t('PROMPT_LIB_NAME_DEFAULT')
        } as InputQuestion<UI5LibraryAnswers>,
        {
            type: 'input',
            name: 'namespace',
            message: t('PROMPT_NAMESPACE_LABEL'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            validate: (namespace, answers): boolean | string => validateLibNamespace(namespace, answers?.libraryName),
            default: t('PROMPT_NAMESPACE_DEFAULT')
        } as InputQuestion<UI5LibraryAnswers>,
        {
            type: 'input',
            name: 'targetFolder',
            message: t('PROMPT_LIBRARY_FOLDER_LABEL'),
            guiType: 'folder-browser',
            guiOptions: {
                applyDefaultWhenDirty: true,
                mandatory: true,
                breadcrumb: true
            },
            default: ui5LibPromptInput?.targetFolder || process.cwd(),
            validate: (target, answers): boolean | string =>
                validateProjectFolder(target, `${answers?.namespace}.${answers?.libraryName}`)
        } as FileBrowserQuestion<UI5LibraryAnswers>,
        {
            when: () => !!ui5LibPromptInput?.versions,
            type: getPlatform() === PLATFORMS.CLI ? 'autocomplete' : 'list',
            name: 'ui5Version',
            message: t('PROMPT_UI5_VERSION_LABEL'),
            guiOptions: {
                hint: t('PROMPT_UI5_VERSION_TOOLTIP'),
                breadcrumb: true
            },
            choices: () => ui5VersionChoices,
            source: (prevAnswers: Answers, input: string) =>
                searchChoices(input, ui5VersionChoices as ListChoiceOptions[])
        } as ListQuestion<UI5LibraryAnswers> | AutocompleteQuestion,
        {
            type: 'confirm',
            name: 'enableTypescript',
            message: t('PROMPT_TYPESCRIPT_LABEL'),
            guiOptions: {
                breadcrumb: true
            },
            default: false
        } as ConfirmQuestion
    ] as Question<UI5LibraryAnswers>[];
}
