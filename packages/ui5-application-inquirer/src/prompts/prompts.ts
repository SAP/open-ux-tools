import { type CdsUi5PluginInfo } from '@sap-ux/cap-config-writer';
import {
    getUI5ThemesChoices,
    searchChoices,
    ui5VersionsGrouped,
    type ConfirmQuestion,
    type FileBrowserQuestion,
    type InputQuestion,
    type ListQuestion
} from '@sap-ux/inquirer-common';
import { getMtaPath } from '@sap-ux/project-access';
import { validateModuleName, validateNamespace, validateProjectFolder } from '@sap-ux/project-input-validator';
import {
    defaultVersion,
    getDefaultUI5Theme,
    minUi5VersionSupportingCodeAssist,
    type UI5Version
} from '@sap-ux/ui5-info';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../i18n';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from '../types';
import { promptNames } from '../types';
import { defaultAppName, extendWithOptions, hidePrompts, isVersionIncluded, withCondition } from './prompt-helpers';
import { validateAppName } from './validators';

// Nullish coalescing operator lint warnings disabled as its not appropriate in most cases where empty strings are not considered valid
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/**
 * Get the prompts that will provide input for UI5 applcation writing.
 *
 * @param ui5Versions - ui5 versions to prompt for selection
 * @param promptOptions - optional inputs used to pre-populate some prompt choices, default values and other prompting options. See {@link UI5ApplicationPromptOptions}.
 * @param [isCli] - optional, default is `true`. Changes the behaviour of some prompts as CLI executes prompts serially
 * @param [capCdsInfo] - optional, additional information about CAP projects
 * @returns the prompts
 */
export function getQuestions(
    ui5Versions: UI5Version[],
    promptOptions?: UI5ApplicationPromptOptions,
    isCli = true,
    capCdsInfo?: CdsUi5PluginInfo
): UI5ApplicationQuestion[] {
    // Set shared defaults
    const appName =
        typeof promptOptions?.[promptNames.name]?.default === 'string'
            ? promptOptions[promptNames.name].default
            : undefined; // Default functions will be applied later, these replace the existing defaults
    const targetDir =
        typeof promptOptions?.[promptNames.targetFolder]?.default === 'string'
            ? promptOptions[promptNames.targetFolder].default // Default functions will be applied later, these replace the existing defaults
            : process.cwd();
    const isCapProject = !!capCdsInfo;

    const keyedPrompts: Record<promptNames, UI5ApplicationQuestion> = {
        [promptNames.name]: getNamePrompt(targetDir, isCli, isCapProject, appName),
        [promptNames.title]: getTitlePrompt(),
        [promptNames.namespace]: getNamespacePrompt(appName),
        [promptNames.description]: getDescriptionPrompt(),
        [promptNames.targetFolder]: getTargetFolderPrompt(targetDir),
        [promptNames.ui5Version]: getUI5VersionPrompt(ui5Versions, promptOptions?.ui5Version),
        [promptNames.addDeployConfig]: getAddDeployConfigPrompt(
            targetDir,
            promptOptions?.addDeployConfig,
            isCapProject
        ),
        [promptNames.addFlpConfig]: getAddFlpConfigPrompt(promptOptions?.addFlpConfig),
        [promptNames.showAdvanced]: getShowAdvancedPrompt(),
        [promptNames.ui5Theme]: getUI5ThemePrompt(),
        [promptNames.enableEslint]: getEnableEsLintPrompt(),
        [promptNames.enableCodeAssist]: getEnableCodeAssistPrompt(),
        [promptNames.skipAnnotations]: getSkipAnnotationsPrompt(),
        [promptNames.enableNPMWorkspaces]: getEnableNPMWorkspacesPrompt(capCdsInfo),
        [promptNames.enableTypeScript]: getEnableTypeScriptPrompt(capCdsInfo)
    };

    // Hide not applicable prompts based on passed options or if this is a CAP project
    let questions: UI5ApplicationQuestion[] = hidePrompts(keyedPrompts, promptOptions, isCapProject);

    // Add an additonal condition to 'advanced' prompts so they can be shown/hidden at runtime
    applyAdvancedOption(questions, promptOptions);

    // Apply extended `validate`, `additionalMessages` or override `default` prompt properties
    if (promptOptions) {
        questions = extendWithOptions(questions, promptOptions);
    }
    return questions;
}

/**
 * Get the `enableTypeScript` prompt.
 *
 * @param capCdsInfo CDS UI5 plugin information
 * @returns The `enableTypeScript` prompt
 */
function getEnableTypeScriptPrompt(capCdsInfo?: CdsUi5PluginInfo): UI5ApplicationQuestion {
    return {
        when: (answers): boolean => {
            if (capCdsInfo) {
                return capCdsInfo.isCdsUi5PluginEnabled || answers?.enableNPMWorkspaces ? true : false;
            }
            return true;
        },
        type: 'confirm',
        name: promptNames.enableTypeScript,
        message: t('prompts.appEnableTypeScriptMessage'),
        default: false,
        guiOptions: {
            breadcrumb: true
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `enableNPMWorkspaces` prompt.
 *
 * @param capCdsInfo CDS UI5 plugin information
 * @returns The `enableNPMWorkspaces` prompt
 */
function getEnableNPMWorkspacesPrompt(capCdsInfo?: CdsUi5PluginInfo): UI5ApplicationQuestion {
    return {
        when: () => {
            if (capCdsInfo) {
                return capCdsInfo.hasMinCdsVersion && !capCdsInfo.hasCdsUi5Plugin;
            }
            return false;
        },
        type: 'confirm',
        name: promptNames.enableNPMWorkspaces,
        message: t('prompts.appEnableNpmWorkspacesMessage'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.appEnableNpmWorkspacesBreadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `skipAnnotations` prompt.
 *
 * @returns The `skipAnnotations` prompt
 */
function getSkipAnnotationsPrompt(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: promptNames.skipAnnotations,
        message: t('prompts.appSkipAnnotationsMessage'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.appSkipAnnotationsBreadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `enableCodeAssist` prompt.
 *
 * @returns The `enableCodeAssist` prompt
 */
function getEnableCodeAssistPrompt(): UI5ApplicationQuestion {
    return {
        when: (answers): boolean =>
            isVersionIncluded(answers?.ui5Version || defaultVersion, minUi5VersionSupportingCodeAssist),
        type: 'confirm',
        name: promptNames.enableCodeAssist,
        message: t('prompts.appEnableCodeAssistMessage'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.appEnableCodeAssistBreadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `enableEslint` prompt.
 *
 * @returns The `enableEslint` prompt
 */
function getEnableEsLintPrompt(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: promptNames.enableEslint,
        message: t('prompts.appEnableEslintMessage'),
        default: false,
        guiOptions: {
            breadcrumb: t('prompts.appEnableEslintBreadcrumb')
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `ui5Theme` prompt.
 *
 * @returns The `ui5Theme` prompt
 */
function getUI5ThemePrompt(): UI5ApplicationQuestion {
    return {
        type: 'list',
        name: promptNames.ui5Theme,
        message: t('prompts.appUi5ThemeMessage'),
        guiOptions: {
            applyDefaultWhenDirty: true,
            breadcrumb: true
        },
        choices: ({ ui5Version = defaultVersion }): ListChoiceOptions[] => getUI5ThemesChoices(ui5Version),
        default: ({ ui5Theme, ui5Version }: UI5ApplicationAnswers): string => {
            if (!ui5Theme) {
                ui5Theme = getDefaultUI5Theme(ui5Version);
            }
            return ui5Theme;
        }
    } as ListQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `showAdvanced` prompt.
 *
 * @returns The `showAdvanced` prompt
 */
function getShowAdvancedPrompt(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: 'showAdvanced',
        message: t('prompts.appShowAdvancedOptionsMessage'),
        guiOptions: {
            hint: t('prompts.appShowAdvancedOptionsHint')
        },
        default: false
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `addFlpConfig` prompt.
 *
 * @param addFlpConfigOptions the
 * @returns The `addFlpConfig` prompt
 */
function getAddFlpConfigPrompt(
    addFlpConfigOptions?: UI5ApplicationPromptOptions[promptNames.addFlpConfig]
): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: promptNames.addFlpConfig,
        guiOptions: {
            breadcrumb: t('prompts.appAddFlpConfigBreadcrumb')
        },
        message: (): string => t('prompts.appAddFlpConfigMessage'),
        default: false,
        validate: (addFlpConfig: boolean): boolean => {
            if (typeof addFlpConfigOptions?.validatorCallback === 'function') {
                addFlpConfigOptions.validatorCallback(addFlpConfig, promptNames.addFlpConfig);
            }
            return true;
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `addDeployConfig` prompt.
 *
 * @param targetDir determines the path to search for `mta.yaml`
 * @param addDeployConfigOptions add deploy configuration prompt options
 * @param isCapProject is this a CAP project
 * @returns the `addDeployConfig` prompt
 */
function getAddDeployConfigPrompt(
    targetDir: string,
    addDeployConfigOptions?: UI5ApplicationPromptOptions[promptNames.addDeployConfig],
    isCapProject = false
): UI5ApplicationQuestion {
    let mtaPath: Awaited<Promise<string | undefined>>; // cache mta path discovery
    return {
        type: 'confirm',
        name: promptNames.addDeployConfig,
        guiOptions: {
            breadcrumb: t('prompts.appAddDeployConfigBreadcrumb')
        },
        // If the target directory is a CAP project then only offer `addDeployConfig (addToMta)` if an mta file is found
        when: async (answers: UI5ApplicationAnswers): Promise<boolean> =>
            !!((mtaPath = (await getMtaPath(answers?.targetFolder || targetDir))?.mtaPath) && isCapProject) ||
            !isCapProject,
        message: (): string => {
            return mtaPath
                ? t('prompts.appAddDeployConfigToMtaMessage', {
                      path: mtaPath,
                      interpolation: { escapeValue: false }
                  })
                : t('prompts.appAddDeployConfigMessage');
        },
        default: async () => !!mtaPath,
        validate: (addDeployConfig: boolean): boolean => {
            if (typeof addDeployConfigOptions?.validatorCallback === 'function') {
                addDeployConfigOptions.validatorCallback(addDeployConfig, promptNames.addDeployConfig);
            }
            return true;
        }
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `ui5Version` prompt.
 *
 * @param ui5Versions the UI5 versions that will be available for selection
 * @param ui5VersionPromptOptions UI5 version prompt options
 * @returns the `ui5Version` prompt
 */
function getUI5VersionPrompt(
    ui5Versions: UI5Version[] = [],
    ui5VersionPromptOptions?: UI5ApplicationPromptOptions[promptNames.ui5Version]
): UI5ApplicationQuestion {
    const ui5VersionChoices = ui5VersionsGrouped(
        ui5Versions,
        ui5VersionPromptOptions?.includeSeparators,
        ui5VersionPromptOptions?.defaultChoice
    );
    return {
        when: () => !!ui5VersionChoices,
        type: ui5VersionPromptOptions?.useAutocomplete ? 'autocomplete' : 'list',
        name: promptNames.ui5Version,
        guiOptions: {
            hint: t('prompts.appUi5VersionTooltip'),
            breadcrumb: t('prompts.appUi5VersionBreadcrumb')
        },
        choices: () => ui5VersionChoices,
        source: (prevAnswers: UI5ApplicationAnswers, input: string) =>
            searchChoices(input, ui5VersionChoices as ListChoiceOptions[]),
        message: t('prompts.appUi5VersionMessage'),
        default: () => {
            // Set the default to be the passed value or the default as defined by ui5 version service
            return (
                ui5VersionPromptOptions?.defaultChoice?.value ||
                ui5Versions.find((ui5Ver) => ui5Ver.default && ui5Ver.version)?.version
            );
        }
    } as ListQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `targetFolder` prompt.
 *
 * @param targetDir provides a default value for the target folder path
 * @returns the `targetFolder` prompt
 */
function getTargetFolderPrompt(targetDir: string): UI5ApplicationQuestion {
    return {
        type: 'input',
        name: promptNames.targetFolder,
        message: t('prompts.appFolderPathMessage'),
        guiType: 'folder-browser',
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.appFolderPathBreadcrumb')
        },
        default: (answers: UI5ApplicationAnswers) => answers.targetFolder || targetDir,
        validate: (target, { name = '' }: UI5ApplicationAnswers): boolean | string => {
            if (name.length > 2) {
                return validateProjectFolder(target, name);
            }
            return false;
        }
    } as FileBrowserQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `description` prompt.
 *
 * @returns the `description` prompt
 */
function getDescriptionPrompt(): UI5ApplicationQuestion {
    return {
        type: 'input',
        name: promptNames.description,
        guiOptions: {
            hint: t('prompts.appDescTooltip'),
            breadcrumb: true
        },
        message: t('prompts.appDescMessage'),
        default: (answers: UI5ApplicationAnswers) => answers.description || t('prompts.appDescDefault')
    } as InputQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `namespace` prompt.
 *
 * @param appName the application is used as part of namespace validation to determine max combined length
 * @returns the `namespace` prompt
 */
function getNamespacePrompt(appName?: string): UI5ApplicationQuestion {
    return {
        type: 'input',
        guiOptions: {
            hint: t('prompts.appNamespaceTooltip'),
            breadcrumb: true
        },
        name: promptNames.namespace,
        message: t('prompts.appNamespaceMessage'),
        default: (answers: UI5ApplicationAnswers) => answers.namespace ?? '',
        validate: (namespace: string, answers: UI5ApplicationAnswers): boolean | string => {
            if (namespace) {
                return validateNamespace(namespace, answers.name || appName);
            }
            return true;
        }
    } as InputQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `title` prompt.
 *
 * @returns the `title` prompt
 */
function getTitlePrompt(): UI5ApplicationQuestion {
    return {
        type: 'input',
        guiOptions: {
            hint: t('prompts.appTitleTooltip'),
            breadcrumb: true
        },
        name: promptNames.title,
        message: t('prompts.appTitleMessage'),
        default: (answers: UI5ApplicationAnswers) => answers.title || t('prompts.appTitleDefault')
    } as InputQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `name` prompt.
 *
 * @param targetDir the directory path to search for exiting apps with the same name
 * @param isCli if this prompt is to be executed on the CLI the validator will ensure the app name is unique for the target dir (usually `cwd`)
 * @param isCapProject if the app is to be generated in a CAP project ensure that the name is unique within the CAP apps folder path
 * @param appName the default app name, if not provided a default app name will be suggested
 * @returns the UI5 application `name` prompt
 */
function getNamePrompt(
    targetDir: string,
    isCli: boolean,
    isCapProject: boolean,
    appName?: string
): UI5ApplicationQuestion {
    return {
        type: 'input',
        guiOptions: {
            applyDefaultWhenDirty: true,
            hint: t('prompts.appNameTooltip'),
            mandatory: true,
            breadcrumb: true
        },
        name: promptNames.name,
        message: t('prompts.appNameMessage'),
        default: (answers: UI5ApplicationAnswers) => answers.name || appName || defaultAppName(targetDir),
        validate: (name, answers: UI5ApplicationAnswers): boolean | string => {
            if (isCli || isCapProject) {
                return validateAppName(name, answers.targetFolder || targetDir);
            } else {
                return validateModuleName(name);
            }
        }
    } as InputQuestion<UI5ApplicationAnswers>;
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
