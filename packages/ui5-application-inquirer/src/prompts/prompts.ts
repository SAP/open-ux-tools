import {
    type ConfirmQuestion,
    type FileBrowserQuestion,
    type InputQuestion,
    type ListQuestion,
    type YUIQuestion,
    searchChoices,
    ui5VersionsGrouped,
    getUI5ThemesChoices
} from '@sap-ux/inquirer-common';
import { getMtaPath } from '@sap-ux/project-access';
import { type CdsUi5PluginInfo } from '@sap-ux/cap-config-writer';
import { validateModuleName, validateNamespace, validateProjectFolder } from '@sap-ux/project-input-validator';
import {
    defaultVersion,
    getDefaultUI5Theme,
    minUi5VersionSupportingCodeAssist,
    type UI5Version
} from '@sap-ux/ui5-info';
import type { ListChoiceOptions } from 'inquirer';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import { t } from '../i18n';
import { promptNames, type UI5ApplicationAnswers, type UI5ApplicationPromptOptions } from '../types';
import { defaultAppName, extendWithOptions, isVersionIncluded, withCondition } from './utility';
import { validateAppName } from './validators';

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
): YUIQuestion<UI5ApplicationAnswers>[] {
    // Nullish coalescing operator lint warnings disabled as its not appropriate in most cases where empty strings are not considered valid
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    const ui5VersionChoices = ui5VersionsGrouped(
        ui5Versions,
        promptOptions?.ui5Version?.includeSeparators,
        promptOptions?.ui5Version?.defaultChoice
    );

    // Set shared defaults
    const appName =
        typeof promptOptions?.[promptNames.name]?.default === 'string'
            ? promptOptions[promptNames.name].default
            : undefined; // Default functions will be applied later, these replace the existing defaults
    const targetDir =
        typeof promptOptions?.[promptNames.targetFolder]?.default === 'string'
            ? promptOptions[promptNames.targetFolder].default // Default functions will be applied later, these replace the existing defaults
            : process.cwd();
    let mtaPath: Awaited<Promise<string | undefined>>; // cache mta path discovery
    const isCapProject = !!capCdsInfo;
    // Always show breadcrumbs in YUI - opt. in
    const breadcrumb = true;

    let questions: YUIQuestion<UI5ApplicationAnswers>[] = [];

    const keyedPrompts: Record<promptNames, YUIQuestion<UI5ApplicationAnswers>> = {
        [promptNames.name]: {
            type: 'input',
            guiOptions: {
                applyDefaultWhenDirty: true,
                hint: t('prompts.appNameTooltip'),
                mandatory: true,
                breadcrumb
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
        } as InputQuestion<UI5ApplicationAnswers>,
        [promptNames.title]: {
            type: 'input',
            guiOptions: {
                hint: t('prompts.appTitleTooltip'),
                breadcrumb
            },
            name: promptNames.title,
            message: t('prompts.appTitleMessage'),
            default: (answers: UI5ApplicationAnswers) => answers.title || t('prompts.appTitleDefault')
        } as InputQuestion<UI5ApplicationAnswers>,
        [promptNames.namespace]: {
            type: 'input',
            guiOptions: {
                hint: t('prompts.appNamespaceTooltip'),
                breadcrumb
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
        } as InputQuestion<UI5ApplicationAnswers>,
        [promptNames.description]: {
            type: 'input',
            name: promptNames.description,
            guiOptions: {
                hint: t('prompts.appDescTooltip'),
                breadcrumb
            },
            message: t('prompts.appDescMessage'),
            default: (answers: UI5ApplicationAnswers) => answers.description || t('prompts.appDescDefault')
        } as InputQuestion<UI5ApplicationAnswers>,
        [promptNames.targetFolder]: {
            type: 'input',
            name: promptNames.targetFolder,
            message: t('prompts.appFolderPathMessage'),
            guiType: 'folder-browser',
            guiOptions: {
                applyDefaultWhenDirty: true,
                mandatory: true,
                breadcrumb: t('prompts.appFolderPathBreadcrumb')
            },
            default: (answers: UI5ApplicationAnswers) => answers.targetFolder || targetDir || process.cwd(),
            validate: (target, { name = '' }: UI5ApplicationAnswers): boolean | string => {
                if (name.length > 2) {
                    return validateProjectFolder(target, name);
                }
                return false;
            }
        } as FileBrowserQuestion<UI5ApplicationAnswers>,
        [promptNames.ui5Version]: {
            when: () => !!ui5VersionChoices,
            type: promptOptions?.ui5Version?.useAutocomplete ? 'autocomplete' : 'list',
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
                    promptOptions?.ui5Version?.default ||
                    promptOptions?.ui5Version?.defaultChoice?.value ||
                    ui5Versions.find((ui5Ver) => ui5Ver.default && ui5Ver.version)?.version
                );
            }
        } as ListQuestion<UI5ApplicationAnswers>,
        [promptNames.addDeployConfig]: {
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
            validate: (add: boolean): boolean => {
                if (typeof promptOptions?.[promptNames.addDeployConfig]?.validatorCallback === 'function') {
                    promptOptions?.[promptNames.addDeployConfig].validatorCallback(add, promptNames.addDeployConfig);
                }
                return true;
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>,
        [promptNames.addFlpConfig]: {
            type: 'confirm',
            name: promptNames.addFlpConfig,
            guiOptions: {
                breadcrumb: t('prompts.appAddFlpConfigBreadcrumb')
            },
            message: (): string => t('prompts.appAddFlpConfigMessage'),
            default: false,
            validate: (add: boolean): boolean => {
                if (typeof promptOptions?.[promptNames.addFlpConfig]?.validatorCallback === 'function') {
                    promptOptions?.[promptNames.addFlpConfig].validatorCallback(add, promptNames.addFlpConfig);
                }
                return true;
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>,
        [promptNames.showAdvanced]: {
            type: 'confirm',
            name: 'showAdvanced',
            message: t('prompts.appShowAdvancedOptionsMessage'),
            guiOptions: {
                hint: t('prompts.appShowAdvancedOptionsHint')
            },
            default: false
        } as ConfirmQuestion<UI5ApplicationAnswers>,
        [promptNames.ui5Theme]: {
            type: 'list',
            name: promptNames.ui5Theme,
            message: t('prompts.appUi5ThemeMessage'),
            guiOptions: {
                applyDefaultWhenDirty: true, // Selected theme may change based on ui5 version selection,
                breadcrumb
            },
            choices: ({ ui5Version = defaultVersion }): ListChoiceOptions[] => getUI5ThemesChoices(ui5Version),
            default: ({ ui5Theme, ui5Version }: UI5ApplicationAnswers): string => {
                if (!ui5Theme) {
                    ui5Theme = getDefaultUI5Theme(ui5Version);
                }
                return ui5Theme;
            }
        } as ListQuestion<UI5ApplicationAnswers>,
        [promptNames.enableEslint]: {
            type: 'confirm',
            name: promptNames.enableEslint,
            message: t('prompts.appEnableEslintMessage'),
            default: promptOptions?.[promptNames.enableEslint]?.default ?? false,
            guiOptions: {
                breadcrumb: t('prompts.appEnableEslintBreadcrumb')
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>,
        [promptNames.enableCodeAssist]: {
            when: (answers): boolean =>
                isVersionIncluded(answers?.ui5Version || defaultVersion, minUi5VersionSupportingCodeAssist),
            type: 'confirm',
            name: promptNames.enableCodeAssist,
            message: t('prompts.appEnableCodeAssistMessage'),
            default: promptOptions?.[promptNames.enableCodeAssist]?.default ?? false,
            guiOptions: {
                breadcrumb: t('prompts.appEnableCodeAssistBreadcrumb')
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>,
        [promptNames.skipAnnotations]: {
            type: 'confirm',
            name: promptNames.skipAnnotations,
            message: t('prompts.appSkipAnnotationsMessage'),
            default: promptOptions?.[promptNames.skipAnnotations]?.default ?? false,
            guiOptions: {
                breadcrumb: t('prompts.appSkipAnnotationsBreadcrumb')
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>,
        [promptNames.enableNPMWorkspaces]: {
            when: () => {
                if (capCdsInfo) {
                    return capCdsInfo.hasMinCdsVersion && !capCdsInfo.hasCdsUi5Plugin;
                }
                return false;
            },
            type: 'confirm',
            name: 'enableNPMWorkspaces',
            message: t('prompts.appEnableNpmWorkspacesMessage'),
            default: false,
            guiOptions: {
                breadcrumb: t('prompts.appEnableNpmWorkspacesBreadcrumb')
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>,
        [promptNames.enableTypeScript]: {
            when: (answers): boolean => {
                if (capCdsInfo) {
                    return capCdsInfo.isCdsUi5PluginEnabled || answers?.enableNPMWorkspaces ? true : false;
                }
                return true;
            },
            type: 'confirm',
            name: promptNames.enableTypeScript,
            message: t('prompts.appEnableTypeScriptMessage'),
            default: promptOptions?.[promptNames.enableTypeScript]?.default ?? false,
            guiOptions: {
                breadcrumb
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>
    };

    // Hide not applicable prompts based on passed options or if this is a CAP project
    if (promptOptions || isCapProject) {
        Object.keys(keyedPrompts).forEach((key) => {
            const promptKey = key as keyof typeof promptNames;
            if (
                !promptOptions?.[promptKey]?.hide &&
                // Target directory is determined by the CAP project. `enableEsLint` and `targetFolder` are not available for CAP projects
                !([promptNames.targetFolder, promptNames.enableEslint].includes(promptNames[promptKey]) && isCapProject)
            ) {
                questions.push(keyedPrompts[promptKey]);
            }
        });
    } else {
        questions.push(...Object.values(keyedPrompts));
    }

    // Add an additonal condition to 'advanced' prompts so they can be shown/hidden at runtime
    withCondition(
        questions.filter(({ name }) => promptOptions?.[name as keyof typeof promptNames]?.advancedOption),
        (answers: UI5ApplicationAnswers) => answers.showAdvanced ?? false
    );

    // Apply extended `validate`, `additionalMessages` or override `default` prompt properties
    if (promptOptions) {
        questions = extendWithOptions(questions, promptOptions);
    }
    return questions as YUIQuestion<UI5ApplicationAnswers>[] | AutocompleteQuestionOptions<UI5ApplicationAnswers>[];
}
