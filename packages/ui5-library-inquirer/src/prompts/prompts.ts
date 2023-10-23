import { t } from '../i18n';
import type { Answers, ListChoiceOptions, ListQuestion, Question } from 'inquirer';
import { getPlatform, ui5VersionsGrouped, searchChoices } from './utility';
import { validateLibModuleName, validateNamespace, validateProjectFolder } from '@sap-ux/project-input-validator';
import type {
    FileBrowserQuestion,
    ConfirmQuestion,
    InputQuestion,
    UI5LibraryAnswers,
    UI5LibraryPromptInput
} from '../types/';
import { PLATFORMS } from '../types/constants';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

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
            message: t('prompts.libNameLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            validate: (libraryName): boolean | string => validateLibModuleName(libraryName),
            default: t('prompts.libNameDefault')
        } as InputQuestion<UI5LibraryAnswers>,
        {
            type: 'input',
            name: 'namespace',
            message: t('prompts.namespaceLabel'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            validate: (namespace, answers): boolean | string =>
                validateNamespace(namespace, answers?.libraryName, false),
            default: t('prompts.namespaceDefault')
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
            default: ui5LibPromptInput?.targetFolder || process.cwd(),
            validate: (target, answers): boolean | string =>
                validateProjectFolder(target, `${answers?.namespace}.${answers?.libraryName}`)
        } as FileBrowserQuestion<UI5LibraryAnswers>,
        {
            when: () => !!ui5LibPromptInput?.versions,
            type: getPlatform() === PLATFORMS.CLI ? 'autocomplete' : 'list',
            name: 'ui5Version',
            message: t('prompts.ui5VersionLabel'),
            guiOptions: {
                hint: t('prompts.ui5VersionTooltip'),
                breadcrumb: true
            },
            choices: () => ui5VersionChoices,
            source: (prevAnswers: Answers, input: string) =>
                searchChoices(input, ui5VersionChoices as ListChoiceOptions[])
        } as ListQuestion<UI5LibraryAnswers> | AutocompleteQuestionOptions<UI5LibraryAnswers>,
        {
            type: 'confirm',
            name: 'enableTypescript',
            message: t('prompts.typescriptLabel'),
            guiOptions: {
                breadcrumb: true
            },
            default: false
        } as ConfirmQuestion
    ] as Question<UI5LibraryAnswers>[];
}
