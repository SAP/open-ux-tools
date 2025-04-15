import { searchChoices, ui5VersionsGrouped, getDefaultUI5VersionChoice } from '@sap-ux/inquirer-common';
import { getMtaPath } from '@sap-ux/project-access';
import { validateModuleName, validateNamespace, validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { t } from '../../i18n';
import { promptNames } from '../../types';
import { defaultAppName } from '../prompt-helpers';
import { validateAppName } from '../validators';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { UI5Version } from '@sap-ux/ui5-info';
import type { ListChoiceOptions } from 'inquirer';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from '../../types';
import type { CdsUi5PluginInfo } from '@sap-ux/project-access';
import type { ConfirmQuestion, FileBrowserQuestion, InputQuestion, ListQuestion } from '@sap-ux/inquirer-common';

/**
 * Gets the `name` prompt.
 *
 * @param targetDir the directory path to search for exiting apps with the same name
 * @param isCapProject if the app is to be generated in a CAP project ensure that the name is unique within the CAP apps folder path
 * @param appName the default app name, if not provided a default app name will be suggested
 * @param isYUI If true, do not use `targetFolder` value when validating the name for existence, since YUI will not re-validate when `targetFolder` is updated.
 * @returns the UI5 application `name` prompt
 */
export function getNamePrompt(
    targetDir: string,
    isCapProject: boolean,
    appName?: string,
    isYUI?: boolean
): UI5ApplicationQuestion {
    return {
        type: 'input',
        guiOptions: {
            applyDefaultWhenDirty: true,
            hint: t('prompts.main.name.tooltip'),
            mandatory: true,
            breadcrumb: true
        },
        name: promptNames.name,
        message: t('prompts.main.name.message'),
        default: (answers: UI5ApplicationAnswers) => answers.name || appName || defaultAppName(targetDir),
        validate: (name, answers: UI5ApplicationAnswers): boolean | string => {
            if (!isYUI || isCapProject) {
                return validateAppName(name, answers.targetFolder || targetDir);
            } else {
                return validateModuleName(name);
            }
        }
    } as InputQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `title` prompt.
 *
 * @returns the `title` prompt
 */
export function getTitlePrompt(): UI5ApplicationQuestion {
    return {
        type: 'input',
        guiOptions: {
            hint: t('prompts.main.title.tooltip'),
            breadcrumb: true
        },
        name: promptNames.title,
        message: t('prompts.main.title.message'),
        default: (answers: UI5ApplicationAnswers) => answers.title || t('prompts.main.title.default')
    } as InputQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `namespace` prompt.
 *
 * @param appName the application is used as part of namespace validation to determine max combined length
 * @returns the `namespace` prompt
 */
export function getNamespacePrompt(appName?: string): UI5ApplicationQuestion {
    return {
        type: 'input',
        guiOptions: {
            hint: t('prompts.main.namespace.tooltip'),
            breadcrumb: true
        },
        name: promptNames.namespace,
        message: t('prompts.main.namespace.message'),
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
 * Gets the `description` prompt.
 *
 * @returns the `description` prompt
 */
export function getDescriptionPrompt(): UI5ApplicationQuestion {
    return {
        type: 'input',
        name: promptNames.description,
        guiOptions: {
            hint: t('prompts.main.description.tooltip'),
            breadcrumb: true
        },
        message: t('prompts.main.description.message'),
        default: (answers: UI5ApplicationAnswers) => answers.description || t('prompts.main.description.default')
    } as InputQuestion<UI5ApplicationAnswers>;
}

/**
 * Gets the `targetFolder` prompt.
 *
 * @param targetDir provides a default value for the target folder path
 * @param validateFioriAppFolder validates the target folder path as a Fiori app project
 * @returns the `targetFolder` prompt
 */
export function getTargetFolderPrompt(targetDir: string, validateFioriAppFolder?: boolean): UI5ApplicationQuestion {
    return {
        type: 'input',
        name: promptNames.targetFolder,
        message: t('prompts.main.targetFolder.message'),
        guiType: 'folder-browser',
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.main.targetFolder.breadcrumb')
        },
        default: (answers: UI5ApplicationAnswers) => answers.targetFolder || targetDir,
        validate: async (target, { name = '' }: UI5ApplicationAnswers): Promise<boolean | string> => {
            if (name.length > 2) {
                return await validateFioriAppTargetFolder(target, name, validateFioriAppFolder);
            }
            return false;
        }
    } as FileBrowserQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `ui5Version` prompt. If the ui5VersionPromptOption `defaultChoice` has been specified and an exact verion match is found
 * then the label from that option will be used instead of any other labels e.g. `(Maintained version)`
 *
 * @param ui5Versions the UI5 versions that will be available for selection
 * @param ui5VersionPromptOptions UI5 version prompt options
 * @returns the `ui5Version` prompt
 */
export function getUI5VersionPrompt(
    ui5Versions: UI5Version[] = [],
    ui5VersionPromptOptions?: UI5ApplicationPromptOptions[promptNames.ui5Version]
): UI5ApplicationQuestion {
    // Set the default to be closest to the passed value or the default as defined by ui5 version service
    const defaultChoice = getDefaultUI5VersionChoice(ui5Versions, ui5VersionPromptOptions?.defaultChoice);
    const ui5VersionChoices = ui5VersionsGrouped(
        ui5Versions,
        ui5VersionPromptOptions?.includeSeparators,
        defaultChoice,
        !!ui5VersionPromptOptions?.defaultChoice && ui5VersionPromptOptions.defaultChoice.value === defaultChoice?.value
    );
    return {
        when: () => !!ui5VersionChoices,
        type: ui5VersionPromptOptions?.useAutocomplete ? 'autocomplete' : 'list',
        name: promptNames.ui5Version,
        guiOptions: {
            hint: t('prompts.main.ui5Version.tooltip'),
            breadcrumb: t('prompts.main.ui5Version.breadcrumb')
        },
        choices: () => ui5VersionChoices,
        source: (prevAnswers: UI5ApplicationAnswers, input: string) =>
            searchChoices(input, ui5VersionChoices as ListChoiceOptions[]),
        message: t('prompts.main.ui5Version.message'),
        default: () => {
            return defaultChoice?.value;
        }
    } as ListQuestion<UI5ApplicationAnswers>;
}

/**
 * Get the `enableTypeScript` prompt.
 *
 * @param capCdsInfo CDS UI5 plugin information
 * @returns The `enableTypeScript` prompt
 */
export function getEnableTypeScriptPrompt(capCdsInfo?: CdsUi5PluginInfo): UI5ApplicationQuestion {
    return {
        when: (): boolean => {
            if (capCdsInfo) {
                return capCdsInfo.isCdsUi5PluginEnabled || (capCdsInfo.hasMinCdsVersion && !capCdsInfo.hasCdsUi5Plugin);
            }
            return true;
        },
        additionalMessages: (val: boolean) => {
            if (val && capCdsInfo?.hasMinCdsVersion && !capCdsInfo?.hasCdsUi5Plugin) {
                return { message: t('prompts.main.enableTypeScript.warningMsg'), severity: Severity.warning };
            }
        },
        type: 'confirm',
        name: promptNames.enableTypeScript,
        message: t('prompts.main.enableTypeScript.message'),
        default: false,
        guiOptions: {
            breadcrumb: true
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
export function getAddDeployConfigPrompt(
    targetDir: string,
    addDeployConfigOptions?: UI5ApplicationPromptOptions[promptNames.addDeployConfig],
    isCapProject = false
): UI5ApplicationQuestion {
    let mtaPath: Awaited<Promise<string | undefined>>; // cache mta path discovery
    return {
        type: 'confirm',
        name: promptNames.addDeployConfig,
        guiOptions: {
            breadcrumb: t('prompts.main.addDeployConfig.breadcrumb')
        },
        // If the target directory is a CAP project then only offer `addDeployConfig (addToMta)` if an mta file is found
        when: async (answers: UI5ApplicationAnswers): Promise<boolean> => {
            mtaPath = (await getMtaPath(answers?.targetFolder || targetDir))?.mtaPath;
            return !!(mtaPath && isCapProject) || !isCapProject;
        },
        message: (): string => {
            return mtaPath
                ? t('prompts.main.addDeployConfig.mtaMessage', {
                      path: mtaPath,
                      interpolation: { escapeValue: false }
                  })
                : t('prompts.main.addDeployConfig.message');
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
 * Get the `addFlpConfig` prompt.
 *
 * @param addFlpConfigOptions the
 * @returns The `addFlpConfig` prompt
 */
export function getAddFlpConfigPrompt(
    addFlpConfigOptions?: UI5ApplicationPromptOptions[promptNames.addFlpConfig]
): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: promptNames.addFlpConfig,
        guiOptions: {
            breadcrumb: t('prompts.main.addFlpConfig.breadcrumb')
        },
        message: (): string => t('prompts.main.addFlpConfig.message'),
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
 * Get the `useVirtualEndpoints` prompt.
 *
 * @returns the `useVirtualEndpoints` prompt
 */
export function getUseVirtualEndpoints(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: promptNames.useVirtualEndpoints,
        guiOptions: {
            hint: t('prompts.main.useVirtualEndpoints.tooltip'),
            breadcrumb: t('prompts.main.useVirtualEndpoints.breadcrumb')
        },
        message: (): string => t('prompts.main.useVirtualEndpoints.message'),
        default: true
    };
}

/**
 * Get the `showAdvanced` prompt.
 *
 * @returns The `showAdvanced` prompt
 */
export function getShowAdvancedPrompt(): UI5ApplicationQuestion {
    return {
        type: 'confirm',
        name: 'showAdvanced',
        message: t('prompts.main.showAdvanced.message'),
        guiOptions: {
            hint: t('prompts.main.showAdvanced.tooltip')
        },
        default: false
    } as ConfirmQuestion<UI5ApplicationAnswers>;
}
