import { t } from '../i18n';
import type { ListChoiceOptions } from 'inquirer';
import { checkDependencies } from '@sap-ux/project-access';
import { extendWithOptions, type CheckBoxQuestion, type ListQuestion } from '@sap-ux/inquirer-common';
import {
    promptNames,
    type UI5LibraryReferenceQuestion,
    type ReuseLibChoice,
    type UI5LibraryReferenceAnswers,
    type UI5LibraryReferencePromptOptions
} from '../types';
import { hidePrompts } from './helpers';
import { SourceType } from './constants';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';

/**
 * Get the prompts for the UI5 library reference writing.
 *
 * @param projectChoices - workspace projects
 * @param reuseLibs - reuse libraries
 * @param promptOptions - optional inputs used to pre-populate some prompt choices, default values and other prompting options
 * @returns the prompts
 */
export function getQuestions(
    projectChoices?: ListChoiceOptions[],
    reuseLibs?: ReuseLibChoice[],
    promptOptions?: UI5LibraryReferencePromptOptions
): UI5LibraryReferenceQuestion[] {
    const keyedPrompts: Record<promptNames, UI5LibraryReferenceQuestion> = {
        [promptNames.targetProjectFolder]: getTargetProjectFolderPrompt(projectChoices),
        [promptNames.source]: getSourcePrompt(),
        [promptNames.referenceLibraries]: getReferenceLibrariesPrompt(reuseLibs)
    };

    // Hide not applicable prompts based on passed options
    let questions: UI5LibraryReferenceQuestion[] = hidePrompts(keyedPrompts, promptOptions);

    // Apply extended `validate`, `additionalMessages` or override `default` prompt properties
    if (promptOptions) {
        questions = extendWithOptions(questions, promptOptions);
    }

    return questions;
}

/**
 * Get the target project folder prompt.
 *
 * @param projectChoices workspace projects
 * @returns The `targetProjectFolder` prompt
 */
function getTargetProjectFolderPrompt(projectChoices?: ListChoiceOptions[]): UI5LibraryReferenceQuestion {
    return {
        type: 'list',
        guiOptions: {
            breadcrumb: true
        },
        name: promptNames.targetProjectFolder,
        message: t('prompts.targetProjectFolderLabel'),
        choices: projectChoices,
        default: () => {
            return projectChoices?.length ? 0 : undefined;
        },
        validate: () => {
            return !projectChoices?.length ? t('error.noProjectsFound') : true;
        }
    } as ListQuestion<UI5LibraryReferenceAnswers>;
}

/**
 * Get the source prompt.
 *
 * @returns The `source` prompt
 */
function getSourcePrompt(): UI5LibraryReferenceQuestion {
    return {
        type: 'list',
        guiOptions: {
            breadcrumb: true
        },
        name: promptNames.source,
        message: t('prompts.sourceLabel'),
        choices: [{ name: t('choices.workspace'), value: SourceType.Workspace }],
        default: 0
    } as ListQuestion<UI5LibraryReferenceAnswers>;
}

/**
 * Get the reference libraries prompt.
 *
 * @param reuseLibs reuse libraries
 * @returns The `referenceLibraries` prompt
 */
function getReferenceLibrariesPrompt(reuseLibs?: ReuseLibChoice[]): UI5LibraryReferenceQuestion {
    let missingDeps: string;
    return {
        type: 'checkbox',
        name: promptNames.referenceLibraries,
        message: t('prompts.referenceLibrariesLabel'),
        guiOptions: {
            breadcrumb: true
        },
        choices: reuseLibs,
        additionalMessages: (): IMessageSeverity | undefined => {
            const msg = {
                message: t('addtionalMsgs.missingDeps', { dependencies: missingDeps }),
                severity: Severity.warning
            };
            return missingDeps ? msg : undefined;
        },
        validate: (answer) => {
            if (!reuseLibs?.length) {
                return t('error.noLibsFound');
            } else if (answer?.length < 1) {
                return t('error.noLibSelected');
            } else if (answer?.length) {
                missingDeps = checkDependencies(
                    answer,
                    reuseLibs.map((libs) => libs.value)
                );
            }
            return true;
        }
    } as CheckBoxQuestion<UI5LibraryReferenceAnswers>;
}
