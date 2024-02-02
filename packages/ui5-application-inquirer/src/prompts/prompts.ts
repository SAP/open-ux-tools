import { type UI5Version, defaultVersion, getDefaultTheme } from '@sap-ux/ui5-info';
import { t } from '../i18n';
import {
    YUIQuestion,
    promptNames,
    type UI5ApplicationAnswers,
    type UI5ApplicationPromptOptions,
    ListQuestion,
    FileBrowserQuestion,
    ConfirmQuestion
} from '../types';
import { defaultAppName, getUI5ThemesChoices, searchChoices, ui5VersionsGrouped } from './utility';
import { validateAppName } from './validators';
import { validateModuleName, validateNamespace, validateProjectFolder } from '@sap-ux/project-input-validator';
import { ListChoiceOptions } from 'inquirer';
import { getMtaPath } from '@sap-ux/project-access';
import { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Get the prompts that will provide input for UI5 applcation writing.
 *
 * @param ui5Versions - ui5 versions to prompt for selection
 * @param options - optional inputs used to pre-populate some prompt choices, default values and other prompting options. See {@link UI5LibraryPromptOptions}.
 * @param [isCli=true] - optional, default is `true`. Changes the behaviour of some prompts as CLI executes prompts serially
 * @param [isCapProject=false] - optional, default is `false`. Changes the behaviour of some prompts to accomodate CAP projects
 * @returns the prompts
 */
export function getQuestions(
    ui5Versions: UI5Version[],
    promptOptions?: UI5ApplicationPromptOptions,
    isCli = true,
    isCapProject = false
): YUIQuestion<UI5ApplicationAnswers>[] {
    const ui5VersionChoices = ui5VersionsGrouped(ui5Versions, promptOptions?.ui5Version?.includeSeparators);

    // Set shared defaults
    const projectName = promptOptions?.[promptNames.name]?.value;
    const targetDir = promptOptions?.[promptNames.targetFolder]?.value ?? process.cwd();
    let mtaPath: Awaited<Promise<string | undefined>>; // cache mta path discovery
    // Always show breadcrumbs in YUI - opt. in
    const breadcrumb = true;

    const questions: YUIQuestion<UI5ApplicationAnswers>[] = [];

    // todo: use all prompt names as record key
    const keyedPrompts: Record<
        | promptNames.name
        | promptNames.title
        | promptNames.description
        | promptNames.namespace
        | promptNames.targetFolder
        | promptNames.ui5Version
        | promptNames.addDeployConfig
        | promptNames.addFlpConfig
        | promptNames.ui5Theme
        | promptNames.enableEslint,
        YUIQuestion<UI5ApplicationAnswers>
    > = {
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
            default: (answers: UI5ApplicationAnswers) => answers.name || projectName || defaultAppName(targetDir),
            validate: (name, answers: UI5ApplicationAnswers): boolean | string => {
                if (isCli || isCapProject) {
                    return validateAppName(name, answers.targetFolder || targetDir);
                } else {
                    return validateModuleName(name);
                }
            }
        },
        [promptNames.title]: {
            type: 'input',
            guiOptions: {
                hint: t('prompts.appTitleTooltip'),
                breadcrumb
            },
            name: promptNames.title,
            message: t('prompts.appTitleMessage'),
            default: (answers: UI5ApplicationAnswers) => answers.title || t('prompts.appTitleDefault')
        },
        [promptNames.namespace]: {
            type: 'input',
            guiOptions: {
                hint: t('prompts.appNamespaceTooltip'),
                breadcrumb
            },
            name: promptNames.namespace,
            message: t('prompts.appNamespaceMessage'),
            default: (answers: UI5ApplicationAnswers) => answers.namespace || '',
            validate: (namespace: string, answers: UI5ApplicationAnswers): boolean | string => {
                if (namespace) {
                    return validateNamespace(namespace, answers.name || projectName);
                }
                return true;
            }
        },
        [promptNames.description]: {
            type: 'input',
            name: promptNames.description,
            guiOptions: {
                hint: t('prompts.appDescTooltip'),
                breadcrumb
            },
            message: t('prompts.appDescMessage'),
            default: (answers: UI5ApplicationAnswers) => answers.description || t('prompts.appDescDefault')
        },
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
                // todo: why not check for valid name
                if (name.length > 2) {
                    return validateProjectFolder(target, name);
                }
                return false;
            }
        } as FileBrowserQuestion,
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
                    promptOptions?.ui5Version?.value ||
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
            default: async (answers: UI5ApplicationAnswers) => !!mtaPath,
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
                    ui5Theme = getDefaultTheme(ui5Version);
                }
                return ui5Theme;
            }
        } as ListQuestion<UI5ApplicationAnswers>,
        [promptNames.enableEslint]: {
            type: 'confirm',
            name: promptNames.enableEslint,
            message: t('prompts.appEnableEslintMessage'),
            default: promptOptions?.[promptNames.enableEslint]?.value ?? false,
            guiOptions: {
                breadcrumb: t('prompts.appEnableEslintBreadcrumb')
            }
        } as ConfirmQuestion<UI5ApplicationAnswers>
    };

    // Hide not applicable prompts based on passed options or if this is a CAP project
    // Dynamic prompt 'when' conditions are evaluated by the executing framework e.g. YUI, Yo
    if (promptOptions || isCapProject) {
        Object.entries(keyedPrompts).forEach(([key, options]) => {
            const promptKey = key as keyof typeof promptNames;
            if (
                !promptOptions?.[promptKey]?.hide &&
                // Target directory is determined by the CAP project. `enableEsLint` is not available for CAP projects
                !([promptNames.targetFolder, promptNames.enableEslint].includes(promptNames[promptKey]) && isCapProject)
            ) {
                questions.push(keyedPrompts[key as keyof typeof promptNames]);
            }
        });
    } else {
        questions.push(...Object.values(keyedPrompts));
    }

    // todo: apply default values

    return questions as YUIQuestion<UI5ApplicationAnswers>[] | AutocompleteQuestionOptions<UI5ApplicationAnswers>[];
}
