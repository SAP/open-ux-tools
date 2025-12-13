import { type Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';

import type { ConfirmQuestion, InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
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
    EnableTypeScriptPromptOptions,
    AddDeployConfigPromptOptions,
    AddFlpConfigPromptOptions,
    OptionalPromptsConfig
} from '../types';
import { t } from '../../utils/i18n';
import { attributePromptNames, SystemType } from '../types';
import { getProjectNameTooltip } from './helper/tooltip';
import { getVersionAdditionalMessages } from './helper/additional-messages';
import { updateWizardSteps, getDeployPage, updateFlpWizardSteps } from '../../utils/steps';
import { getDefaultProjectName, getDefaultNamespace, getDefaultVersion } from './helper/default-values';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

/**
 * Returns all project attribute prompts, filtering based on promptOptions.
 *
 * @param {string} path - The project base path.
 * @param {OptionalPromptsConfig} config - Configuration values needed for conditional prompt logic.
 * @param {AttributePromptOptions} [promptOptions] - Optional settings to control visibility and defaults.
 * @returns {AttributesQuestion[]} An array of prompt objects for basic info input.
 */
export function getPrompts(
    path: string,
    config: OptionalPromptsConfig,
    promptOptions?: AttributePromptOptions
): AttributesQuestion[] {
    const { isVersionDetected, ui5Versions, systemType, projectType, layer, prompts, isCfEnv = false } = config;
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;

    const keyedPrompts: Record<attributePromptNames, AttributesQuestion> = {
        [attributePromptNames.projectName]: getProjectNamePrompt(
            path,
            isCustomerBase,
            isCfEnv,
            promptOptions?.[attributePromptNames.projectName]
        ),
        [attributePromptNames.title]: getApplicationTitlePrompt(promptOptions?.[attributePromptNames.title]),
        [attributePromptNames.namespace]: getNamespacePrompt(
            isCustomerBase,
            promptOptions?.[attributePromptNames.namespace]
        ),
        [attributePromptNames.targetFolder]: getTargetFolderPrompt(promptOptions?.[attributePromptNames.targetFolder]),
        [attributePromptNames.ui5Version]: getUi5VersionPrompt(ui5Versions, isVersionDetected, systemType),
        [attributePromptNames.ui5ValidationCli]: getUi5VersionValidationPromptForCli(),
        [attributePromptNames.enableTypeScript]: getEnableTypeScriptPrompt(
            promptOptions?.[attributePromptNames.enableTypeScript]
        ),
        [attributePromptNames.addDeployConfig]: getAddDeployConfigPrompt(
            prompts,
            promptOptions?.[attributePromptNames.addDeployConfig]
        ),
        [attributePromptNames.addFlpConfig]: getFlpConfigPrompt(
            prompts,
            projectType,
            promptOptions?.[attributePromptNames.addFlpConfig]
        )
    };

    const questions = Object.entries(keyedPrompts)
        .filter(([promptName]) => {
            const options = promptOptions?.[promptName as attributePromptNames];
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
 * @param {boolean} isCfEnv - Whether the project is in a CF environment.
 * @param {ProjectNamePromptOptions} [_] - Optional prompt options.
 * @returns {AttributesQuestion} The prompt configuration for project name.
 */
function getProjectNamePrompt(
    path: string,
    isCustomerBase: boolean,
    isCfEnv: boolean,
    _?: ProjectNamePromptOptions
): AttributesQuestion {
    return {
        type: 'input',
        name: attributePromptNames.projectName,
        message: t('prompts.projectNameLabel'),
        default: (answers: AttributesAnswers) => getDefaultProjectName(answers.targetFolder || path),
        guiOptions: {
            mandatory: true,
            breadcrumb: true,
            hint: getProjectNameTooltip(isCustomerBase)
        },
        validate: (value: string, answers: AttributesAnswers) =>
            validateProjectName(value, answers.targetFolder || path, isCustomerBase, isCfEnv),
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
        name: attributePromptNames.title,
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
        name: attributePromptNames.namespace,
        message: t('prompts.namespaceLabel'),
        default: (answers: AttributesAnswers) =>
            options?.default ?? getDefaultNamespace(answers.projectName, isCustomerBase),
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        store: false
    } as InputQuestion;

    if (!isCustomerBase) {
        prompt.guiOptions!.type = 'label';
        prompt.when = (answers): boolean => !!answers.projectName;
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
 * @param {boolean} systemType - The system type.
 * @returns {AttributesQuestion} The prompt configuration for UI5 version.
 */
function getUi5VersionPrompt(
    ui5Versions: string[],
    isVersionDetected: boolean,
    systemType?: SystemType
): AttributesQuestion {
    return {
        type: 'list',
        name: attributePromptNames.ui5Version,
        message: t('prompts.ui5VersionLabel'),
        when: systemType !== SystemType.CLOUD_READY,
        choices: ui5Versions,
        guiOptions: {
            applyDefaultWhenDirty: true,
            hint: t('prompts.ui5VersionTooltip'),
            breadcrumb: true,
            mandatory: true
        },
        validate: async (version: string) => await validateUI5VersionExists(version),
        default: async () => await getDefaultVersion(ui5Versions),
        additionalMessages: () => getVersionAdditionalMessages(isVersionDetected)
    } as ListQuestion<AttributesAnswers>;
}

/**
 * Only used in the CLI context when prompt is of type `list` because the validation does not run on CLI for the UI5 Version list prompt.
 *
 * @returns {YUIQuestion<AttributesAnswers>} Dummy prompt that runs in the CLI only.
 */
function getUi5VersionValidationPromptForCli(): YUIQuestion<AttributesAnswers> {
    return {
        name: attributePromptNames.ui5ValidationCli,
        when: async (answers: AttributesAnswers): Promise<boolean> => {
            if (!answers.ui5Version) {
                return false;
            }

            const result = await validateUI5VersionExists(answers.ui5Version);
            if (typeof result === 'string') {
                throw new Error(result);
            }

            return false;
        }
    } as YUIQuestion;
}

/**
 * Creates the TypeScript enablement confirm prompt.
 *
 * @param {EnableTypeScriptPromptOptions} [_] - Optional prompt options to control visibility.
 * @returns {AttributesQuestion} The prompt configuration for TypeScript confirmation.
 */
function getEnableTypeScriptPrompt(_?: EnableTypeScriptPromptOptions): AttributesQuestion {
    return {
        type: 'confirm',
        name: attributePromptNames.enableTypeScript,
        message: 'Enable TypeScript',
        default: false,
        guiOptions: {
            breadcrumb: true
        }
    } as ConfirmQuestion<AttributesAnswers>;
}

/**
 * Creates the Add Deployment Config confirm prompt.
 *
 * @param {YeomanUiSteps} prompts - The Yeoman UI pages.
 * @param {AddDeployConfigPromptOptions} [_] - Optional prompt options to control visibility.
 * @returns {AttributesQuestion} The prompt configuration for Add Deployment config confirmation.
 */
export function getAddDeployConfigPrompt(prompts: YeomanUiSteps, _?: AddDeployConfigPromptOptions): AttributesQuestion {
    return {
        type: 'confirm',
        name: attributePromptNames.addDeployConfig,
        message: t('prompts.addDeployConfig'),
        default: false,
        guiOptions: {
            breadcrumb: true
        },
        validate: (value: boolean) => {
            updateWizardSteps(prompts, getDeployPage(), t('yuiNavSteps.projectAttributesName'), value);
            return true;
        }
    } as ConfirmQuestion<AttributesAnswers>;
}

/**
 * Creates the Add FLP Config confirm prompt.
 *
 * @param {YeomanUiSteps} prompts - The Yeoman UI pages.
 * @param {boolean} projectType - The project type.
 * @param {AddFlpConfigPromptOptions} options - Optional prompt options to control visibility.
 * @returns {AttributesQuestion} The prompt configuration for Add FLP config confirmation.
 */
export function getFlpConfigPrompt(
    prompts: YeomanUiSteps,
    projectType?: AdaptationProjectType,
    options?: AddFlpConfigPromptOptions
): AttributesQuestion {
    return {
        type: 'confirm',
        name: attributePromptNames.addFlpConfig,
        message: t('prompts.addFlpConfig'),
        default: false,
        guiOptions: {
            breadcrumb: true
        },
        when: () => projectType === AdaptationProjectType.CLOUD_READY,
        validate: (value: boolean, answers: AttributesAnswers) => {
            updateFlpWizardSteps(!!options?.hasBaseAppInbounds, prompts, answers.projectName, value);
            return true;
        }
    } as ConfirmQuestion<AttributesAnswers>;
}
