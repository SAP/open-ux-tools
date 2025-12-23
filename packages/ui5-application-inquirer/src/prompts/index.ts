// Nullish coalescing operator lint warnings disabled as its not appropriate in most cases where empty strings are not considered valid
import os from 'node:os';
import { join } from 'node:path';
import { withCondition, extendWithOptions } from '@sap-ux/inquirer-common';
import {
    getNamePrompt,
    getTitlePrompt,
    getNamespacePrompt,
    getDescriptionPrompt,
    getTargetFolderPrompt,
    getUI5VersionPrompt,
    getEnableTypeScriptPrompt,
    getAddDeployConfigPrompt,
    getAddFlpConfigPrompt,
    getEnableVirtualEndpoints
} from './prompts1';
import {
    getShowAdvancedPrompt,
    getUI5ThemePrompt,
    getEnableEsLintPrompt,
    getEnableCodeAssistPrompt,
    getSkipAnnotationsPrompt
} from './prompts2';
import { validateFioriAppProjectFolder } from '@sap-ux/project-input-validator';
import { promptNames } from '../types';
import { hidePrompts } from './prompt-helpers';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from '../types';
import type { UI5Version } from '@sap-ux/ui5-info';
import type { CdsUi5PluginInfo } from '@sap-ux/project-access';

/**
 * Get the prompts that will provide input for UI5 application writing.
 *
 * @param ui5Versions - ui5 versions to prompt for selection
 * @param promptOptions - optional inputs used to pre-populate some prompt choices, default values and other prompting options. See {@link UI5ApplicationPromptOptions}.
 * @param [capCdsInfo] - optional, additional information about CAP projects
 * @param [isYUI] - optional, default is `false`. Changes the behaviour of some validation since YUI does not re-validate prompts that may be inter-dependant.
 * @returns the prompts
 */
export async function getQuestions(
    ui5Versions: UI5Version[],
    promptOptions?: UI5ApplicationPromptOptions,
    capCdsInfo?: CdsUi5PluginInfo,
    isYUI = false
): Promise<UI5ApplicationQuestion[]> {
    // Set shared defaults
    const appName =
        typeof promptOptions?.[promptNames.name]?.default === 'string'
            ? promptOptions[promptNames.name].default
            : promptOptions?.[promptNames.name]?.defaultValue;

    let targetDir =
        typeof promptOptions?.[promptNames.targetFolder]?.default === 'string'
            ? promptOptions[promptNames.targetFolder].default // Default functions will be applied later, these replace the existing defaults
            : (promptOptions?.[promptNames.targetFolder]?.defaultValue ?? process.cwd());

    const shouldValidateFioriAppFolder = promptOptions?.[promptNames.targetFolder]?.validateFioriAppFolder;
    if (shouldValidateFioriAppFolder) {
        const isValidFolder = await validateFioriAppProjectFolder(targetDir);
        if (isValidFolder !== true) {
            targetDir = join(os.homedir(), 'projects');
        }
    }

    const isCapProject = !!capCdsInfo;

    const keyedPrompts: Record<promptNames, UI5ApplicationQuestion> = {
        [promptNames.name]: getNamePrompt(targetDir, isCapProject, appName, isYUI),
        [promptNames.title]: getTitlePrompt(),
        [promptNames.namespace]: getNamespacePrompt(appName),
        [promptNames.description]: getDescriptionPrompt(),
        [promptNames.targetFolder]: getTargetFolderPrompt(targetDir, shouldValidateFioriAppFolder),
        [promptNames.ui5Version]: getUI5VersionPrompt(ui5Versions, promptOptions?.ui5Version),
        [promptNames.enableTypeScript]: getEnableTypeScriptPrompt(),
        [promptNames.addDeployConfig]: getAddDeployConfigPrompt(
            targetDir,
            promptOptions?.addDeployConfig,
            isCapProject
        ),
        [promptNames.addFlpConfig]: getAddFlpConfigPrompt(promptOptions?.addFlpConfig),
        [promptNames.enableVirtualEndpoints]: getEnableVirtualEndpoints(),
        [promptNames.showAdvanced]: getShowAdvancedPrompt(),
        [promptNames.ui5Theme]: getUI5ThemePrompt(),
        [promptNames.enableEslint]: getEnableEsLintPrompt(),
        [promptNames.enableCodeAssist]: getEnableCodeAssistPrompt(),
        [promptNames.skipAnnotations]: getSkipAnnotationsPrompt()
    };

    // Hide not applicable prompts based on passed options or if this is a CAP project
    let questions: UI5ApplicationQuestion[] = hidePrompts(keyedPrompts, promptOptions, capCdsInfo);

    // Add an additional condition to 'advanced' prompts so they can be shown/hidden at runtime
    applyAdvancedOption(questions, promptOptions);

    // Apply extended `validate`, `additionalMessages` or override `default` prompt properties
    if (promptOptions) {
        questions = extendWithOptions(questions, promptOptions);
    }
    return questions;
}

/**
 * Applies the advanced grouping option which will hide the specified prompts behind and advanced options prompt.
 *
 * @param questions the questions to which the advanced option condition may be applied
 * @param promptOptions the prompt options which specify which prompts should be grouped as advanced options
 */
function applyAdvancedOption(questions: UI5ApplicationQuestion[], promptOptions?: UI5ApplicationPromptOptions) {
    withCondition(
        questions.filter(({ name }) => promptOptions?.[name as keyof typeof promptNames]?.advancedOption),
        (answers: UI5ApplicationAnswers) => answers.showAdvanced ?? false
    );
}
