import type { ConfirmQuestion, InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { type AttributesAnswers, FlexLayer, validateUI5VersionExists } from '@sap-ux/adp-tooling';
import {
    validateEmptyString,
    validateNamespaceAdp,
    validateProjectFolder,
    validateProjectName
} from '@sap-ux/project-input-validator';

import type {
    AttributesQuestion,
    AttributePromptOptions,
    ProjectNamePromptOptions,
    ApplicationTitlePromptOptions,
    NamespacePromptOptions,
    TargetFolderPromptOptions,
    EnableTypeScriptPromptOptions
} from '../types';
import { basicPromptNames } from '../types';
import { t } from '../../utils/i18n';
import { getProjectNameTooltip } from './helper/tooltip';
import { getDefaultProjectName, generateValidNamespace, getVersionDefaultValue } from './helper/default-values';
import { getVersionAdditionalMessages } from './helper/additional-messages';

interface Config {
    isCloudProject: boolean;
    layer: FlexLayer;
    ui5Versions: string[];
    isVersionDetected: boolean;
}

/**
 * Returns all basic info prompts, filtering based on promptOptions.
 *
 * @param {string} path - The project base path.
 * @param {Config} config - Configuration values needed for conditional prompt logic.
 * @param {BasicPromptOptions} [promptOptions] - Optional settings to control visibility and defaults.
 * @returns {AttributesQuestion[]} An array of prompt objects for basic info input.
 */
export function getPrompts(path: string, config: Config, promptOptions?: AttributePromptOptions): AttributesQuestion[] {
    const { isVersionDetected, ui5Versions, isCloudProject, layer } = config;
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;

    const keyedPrompts: Record<basicPromptNames, AttributesQuestion> = {
        [basicPromptNames.projectName]: getProjectNamePrompt(
            path,
            isCustomerBase,
            promptOptions?.[basicPromptNames.projectName]
        ),
        [basicPromptNames.title]: getApplicationTitlePrompt(promptOptions?.[basicPromptNames.title]),
        [basicPromptNames.namespace]: getNamespacePrompt(isCustomerBase, promptOptions?.[basicPromptNames.namespace]),
        [basicPromptNames.targetFolder]: getTargetFolderPrompt(promptOptions?.[basicPromptNames.targetFolder]),
        [basicPromptNames.ui5Version]: getUi5VersionPrompt(ui5Versions, isVersionDetected, isCloudProject),
        [basicPromptNames.enableTypeScript]: getEnableTypeScriptPrompt(
            promptOptions?.[basicPromptNames.enableTypeScript]
        )
    };

    const questions = Object.entries(keyedPrompts)
        .filter(([promptName]) => {
            const options = promptOptions?.[promptName as basicPromptNames];
            return !(options && 'hide' in options && options.hide);
        })
        .map(([_, question]) => question);

    return questions;
}

/**
 * Creates the project name input prompt.
 *
 * @param {string} path - The base project path.
 * @param {boolean} isCustomerBase - Whether the layer is CUSTOMER_BASE.
 * @param {ProjectNamePromptOptions} [_] - Optional prompt options.
 * @returns {AttributesQuestion} The prompt configuration for project name.
 */
function getProjectNamePrompt(path: string, isCustomerBase: boolean, _?: ProjectNamePromptOptions): AttributesQuestion {
    return {
        type: 'input',
        name: basicPromptNames.projectName,
        message: t('prompts.projectNameLabel'),
        default: (answers: AttributesAnswers) => getDefaultProjectName(answers.targetFolder || path),
        guiOptions: {
            mandatory: true,
            breadcrumb: true,
            hint: getProjectNameTooltip(isCustomerBase)
        },
        validate: (value: string, answers: AttributesAnswers) =>
            validateProjectName(value, answers.targetFolder || path, isCustomerBase),
        store: false
    } as InputQuestion<AttributesAnswers>;
}

/**
 * Creates the application title input prompt.
 *
 * @param {ApplicationTitlePromptOptions} [options] - Optional prompt options.
 * @returns {AttributesQuestion} The prompt configuration for application title.
 */
function getApplicationTitlePrompt(options?: ApplicationTitlePromptOptions): AttributesQuestion {
    return {
        type: 'input',
        name: basicPromptNames.title,
        message: t('prompts.appTitleLabel'),
        default: options?.default ?? t('prompts.appTitleDefault'),
        guiOptions: {
            mandatory: true,
            breadcrumb: true,
            hint: t('prompts.appTitleTooltip')
        },
        validate: validateEmptyString,
        store: false
    } as InputQuestion<AttributesAnswers>;
}

/**
 * Creates the namespace input prompt.
 *
 * @param {boolean} isCustomerBase - Whether the layer is CUSTOMER_BASE.
 * @param {NamespacePromptOptions} [options] - Optional prompt options.
 * @returns {AttributesQuestion} The prompt configuration for namespace.
 */
function getNamespacePrompt(isCustomerBase: boolean, options?: NamespacePromptOptions): AttributesQuestion {
    const prompt: InputQuestion<AttributesAnswers> = {
        type: 'input',
        name: basicPromptNames.namespace,
        message: t('prompts.namespaceLabel'),
        default: (answers: AttributesAnswers) =>
            options?.default ?? generateValidNamespace(answers.projectName, isCustomerBase),
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        store: false
    } as InputQuestion;

    if (!isCustomerBase) {
        prompt.guiOptions!.type = 'label';
        prompt.when = (answers) => !!answers.projectName;
    } else {
        prompt.guiOptions!.mandatory = true;
        prompt.guiOptions!.breadcrumb = true;
        prompt.validate = (value, answers: AttributesAnswers) =>
            validateNamespaceAdp(value, answers.projectName, isCustomerBase);
    }

    return prompt;
}

/**
 * Creates the target folder prompt.
 *
 * @param {TargetFolderPromptOptions} [options] - Optional prompt options.
 * @returns {AttributesQuestion} The prompt configuration for target folder.
 */
function getTargetFolderPrompt(options?: TargetFolderPromptOptions): AttributesQuestion {
    return {
        type: 'input',
        name: 'targetFolder',
        message: t('prompts.projectFolderLabel'),
        guiOptions: {
            type: 'folder-browser',
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.projectFolderPath')
        },
        validate: (value: string, answers: AttributesAnswers) => validateProjectFolder(value, answers.projectName),
        default: (answers: AttributesAnswers) => answers.targetFolder || options?.default,
        store: false
    } as InputQuestion<AttributesAnswers>;
}

/**
 * Creates the UI5 version selection prompt.
 *
 * @param {string[]} ui5Versions - Array of available UI5 versions.
 * @param {boolean} isVersionDetected - Whether a UI5 version was detected from the system.
 * @param {boolean} isCloudProject - Whether the project is for a cloud-based system.
 * @returns {AttributesQuestion} The prompt configuration for UI5 version.
 */
function getUi5VersionPrompt(
    ui5Versions: string[],
    isVersionDetected: boolean,
    isCloudProject: boolean
): AttributesQuestion {
    return {
        type: 'list',
        name: basicPromptNames.ui5Version,
        message: t('prompts.ui5VersionLabel'),
        when: () => !isCloudProject,
        choices: () => ui5Versions,
        guiOptions: {
            applyDefaultWhenDirty: true,
            hint: t('prompts.ui5VersionTooltip'),
            breadcrumb: t('prompts.ui5VersionBreadcrumb'),
            mandatory: true
        },
        validate: async (version: string) => await validateUI5VersionExists(version),
        default: async () => await getVersionDefaultValue(ui5Versions),
        additionalMessages: () => getVersionAdditionalMessages(isVersionDetected)
    } as ListQuestion<AttributesAnswers>;
}

/**
 * Creates the TypeScript enablement confirm prompt.
 *
 * @param {EnableTypeScriptPromptOptions} [options] - Optional prompt options to control visibility.
 * @returns {AttributesQuestion} The prompt configuration for TypeScript confirmation.
 */
function getEnableTypeScriptPrompt(options?: EnableTypeScriptPromptOptions): AttributesQuestion {
    return {
        type: 'confirm',
        name: basicPromptNames.enableTypeScript,
        message: 'Enable TypeScript',
        default: false,
        when: () => options?.hide ?? true,
        guiOptions: {
            breadcrumb: true
        }
    } as ConfirmQuestion<AttributesAnswers>;
}
