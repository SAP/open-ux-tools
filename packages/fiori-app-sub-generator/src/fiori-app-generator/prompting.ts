import { isFeatureEnabled } from '@sap-ux/feature-toggle';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { InputQuestion } from '@sap-ux/inquirer-common';
import type { Logger } from '@sap-ux/logger';
import {
    type CapService,
    type ConnectedSystem,
    DatasourceType,
    type OdataServicePromptOptions,
    OdataVersion,
    promptNames as odataServiceInquirerPromptNames,
    prompt as promptOdataService
} from '@sap-ux/odata-service-inquirer';
import { ClientFactory } from '@sap-ux/telemetry';
import type {
    PromptDefaultValue,
    UI5ApplicationAnswers,
    UI5ApplicationCommonPromptOptions,
    UI5ApplicationPromptOptions
} from '@sap-ux/ui5-application-inquirer';
import { prompt as promptUI5App, promptNames as ui5AppInquirerPromptNames } from '@sap-ux/ui5-application-inquirer';
import { getSapSystemUI5Version, getUI5Versions, latestVersionString } from '@sap-ux/ui5-info';
import type { Question } from 'inquirer';
import merge from 'lodash/merge';
import { join } from 'path';
import type { Adapter } from 'yeoman-environment';
import type { FioriAppGeneratorPromptSettings, Floorplan, Project, Service, YeomanUiStepConfig } from '../types';
import { Features, defaultPromptValues } from '../types';
import { getMinSupportedUI5Version, t, validateNextStep } from '../utils';

/**
 * Validates the view name.
 * The view name must be a valid identifier and must not be empty.
 * The view name must not exceed 120 characters.
 * The view name must start with a letter and can contain letters, numbers, hyphens, and underscores.
 *
 * @param {string} name The view name to validate.
 * @returns {boolean | string} true if the view name is valid, otherwise a string with the error message
 */
function validateViewName(name: string): boolean | string {
    // Validate input is not empty
    if (!name) {
        return t('prompts.viewName.validationMessages.viewNameRequired');
    }
    // Validate view names matches the allowed pattern
    const regExp = /^[a-zA-Z]+[a-zA-Z0-9-_]{0,120}$/;
    const result = regExp.test(name);

    if (name.length > 120) {
        return t('prompts.viewName.validationMessages.viewNameTooLong');
    }
    if (!result) {
        return t('prompts.viewName.validationMessages.viewNameInvalid');
    }
    return true;
}

const viewNamePromptName = 'viewName';
export interface ViewNameAnswer {
    [viewNamePromptName]: string;
}

export const getViewQuestion = (): Question<ViewNameAnswer> => {
    return {
        type: 'input',
        name: viewNamePromptName,
        message: t('prompts.viewName.message'),
        guiOptions: {
            breadcrumb: true
        },
        default: 'View1',
        validate: validateViewName
    } as InputQuestion<ViewNameAnswer>;
};

/**
 * Options for getting UI5 application answers
 */
type PromptUI5AppAnswersOptions = {
    projectName?: Project['name'];
    targetFolder?: Project['targetFolder'];
    service: Partial<Service>;
    promptSettings?: FioriAppGeneratorPromptSettings;
    floorplan: Floorplan;
    promptExtension?: UI5ApplicationPromptOptions;
};

/**
 * Creates the prompt options for UI5 application prompting and calls `prompt`.
 * The answers to the questions are returned.
 *
 * @param param0
 * @param param0.service
 * @param param0.projectName
 * @param param0.targetFolder
 * @param param0.promptSettings
 * @param param0.floorplan
 * @param param0.promptExtension
 * @param yeomanUiStepConfig
 * @param adapter
 * @returns
 */
export async function promptUI5ApplicationAnswers(
    {
        service,
        projectName,
        targetFolder,
        promptSettings,

        floorplan,
        promptExtension
    }: PromptUI5AppAnswersOptions,
    yeomanUiStepConfig: YeomanUiStepConfig[],
    adapter: Adapter
): Promise<{ ui5AppAnswers: UI5ApplicationAnswers; localUI5Version: string | undefined }> {
    let inquirerAdapter;
    // type `any` will be replaced when we can import ESM modules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((adapter as any)?.actualAdapter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inquirerAdapter = (adapter as any).actualAdapter;
    } else {
        inquirerAdapter = adapter;
    }

    const promptOptions = await createUI5ApplicationPromptOptions(
        service,
        yeomanUiStepConfig,
        floorplan,
        projectName,
        targetFolder,
        promptSettings,
        promptExtension
    );
    const ui5AppAnswers: UI5ApplicationAnswers = await promptUI5App(
        inquirerAdapter,
        promptOptions,
        service.capService?.cdsUi5PluginInfo,
        getHostEnvironment() !== hostEnvironment.cli
    );
    // Get the (latest) version available from npm, instead of UI5 versions service in case of unpublished versions
    const localUI5Version = (
        await getUI5Versions({
            minSupportedUI5Version: promptOptions.ui5Version?.minUI5Version,
            onlyVersionNumbers: true,
            onlyNpmVersion: true,
            ui5SelectedVersion: ui5AppAnswers?.ui5Version ?? latestVersionString
        })
    )[0]?.version;
    return { ui5AppAnswers, localUI5Version };
}

/**
 * Prompts the user for the OData service answers.
 *
 * @param options
 * @param logger
 * @param adapter
 * @param connectedSystem
 * @returns {Promise<Service>}
 */
export async function promptOdataServiceAnswers(
    options: OdataServiceInquirerOptions,
    logger: Logger,
    adapter: Adapter,
    connectedSystem?: ConnectedSystem
): Promise<Service> {
    let inquirerAdapter;
    // type `any` will be replaced when we can import ESM modules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((adapter as any)?.actualAdapter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inquirerAdapter = (adapter as any).actualAdapter;
    } else {
        inquirerAdapter = adapter;
    }

    const promptOptions = createOdataServicePromptOptions(options);
    const answers = await promptOdataService(
        inquirerAdapter,
        promptOptions,
        logger,
        isFeatureEnabled(Features.enableGAIntegration),
        ClientFactory.getTelemetryClient(),
        getHostEnvironment() !== hostEnvironment.cli,
        connectedSystem
    );

    const service: Service = {
        host: answers.origin,
        client: answers.sapClient,
        servicePath: answers.servicePath,
        serviceId: answers.serviceId,
        edmx: answers.metadata,
        annotations: answers.annotations,
        version: answers.odataVersion,
        capService: answers.capService,
        source: answers.datasourceType,
        localEdmxFilePath: answers.metadataFilePath,
        connectedSystem: answers.connectedSystem,
        ignoreCertError: answers.ignoreCertError
    };
    return service;
}

/**
 * Creates the `UIApplicationPromptOptions`.
 * Note that setting 'default', the default prompt value or function, or 'hide', whether the prompt should be shown,
 * to `undefined` should mean that the setting is ignored by the prompt.
 *
 * @param service
 * @param appGenStepConfigList
 * @param floorplan
 * @param projectName
 * @param targetFolder
 * @param promptSettings
 * @param extensions
 * @returns {Promise<UI5ApplicationPromptOptions>} prompt options that may be used to configure UI5 application prompting
 */
export async function createUI5ApplicationPromptOptions(
    service: Partial<Readonly<Service>>,
    appGenStepConfigList: YeomanUiStepConfig[],
    floorplan: Floorplan,
    projectName?: Project['name'],
    targetFolder?: Project['targetFolder'],
    promptSettings?: FioriAppGeneratorPromptSettings,
    extensions?: UI5ApplicationPromptOptions
): Promise<UI5ApplicationPromptOptions> {
    // prompt settings may be additionally provided e.g. set by adaptors
    const ui5VersionPromptOptions: UI5ApplicationPromptOptions['ui5Version'] = {
        hide: promptSettings?.[ui5AppInquirerPromptNames.ui5Version]?.hide ?? false,
        minUI5Version: getMinSupportedUI5Version(service.version ?? OdataVersion.v2, floorplan),
        includeSeparators: getHostEnvironment() !== hostEnvironment.cli,
        useAutocomplete: getHostEnvironment() === hostEnvironment.cli
    };

    const systemVersion = service.host ? await getSapSystemUI5Version(service.host) : undefined;
    if (systemVersion) {
        ui5VersionPromptOptions.defaultChoice = {
            name: `${systemVersion} (Source system version)`,
            value: systemVersion
        };
    }

    let defaultTargetFolderOption;
    if (service.capService?.projectPath) {
        // CAP override
        defaultTargetFolderOption = {
            default: join(service.capService.projectPath, service.capService.appPath ?? '')
        };
    } else {
        // Non-CAP combine project path with existing default logic
        defaultTargetFolderOption = {
            defaultValue: targetFolder,
            validateFioriAppFolder: true
        };
    }
    // Add more prompt options as required
    const preMergedPromptOpts: UI5ApplicationPromptOptions = {
        [ui5AppInquirerPromptNames.name]: {
            defaultValue: projectName
        },
        [ui5AppInquirerPromptNames.targetFolder]: defaultTargetFolderOption,
        [ui5AppInquirerPromptNames.ui5Version]: ui5VersionPromptOptions,
        [ui5AppInquirerPromptNames.skipAnnotations]: {
            hide: !service.capService
        },
        [ui5AppInquirerPromptNames.addDeployConfig]: {
            validatorCallback: (addDeployConfigAnswer: boolean) => {
                validateNextStep(
                    addDeployConfigAnswer,
                    t('steps.projectAttributesConfig.title'),
                    appGenStepConfigList,
                    t('steps.deployConfig.title')
                );
            }
        },
        [ui5AppInquirerPromptNames.addFlpConfig]: {
            validatorCallback: (addFlpConfigAnswer: boolean) => {
                validateNextStep(
                    addFlpConfigAnswer,
                    t('steps.projectAttributesConfig.title'),
                    appGenStepConfigList,
                    t('steps.flpConfig.title')
                );
            }
        },
        [ui5AppInquirerPromptNames.enableTypeScript]: {
            default: defaultPromptValues[ui5AppInquirerPromptNames.enableTypeScript]
        },
        [ui5AppInquirerPromptNames.enableVirtualEndpoints]: {
            hide: service.capService?.capType === 'Java'
        }
    };
    const promptOptions = merge(preMergedPromptOpts, promptSettings);

    // Configure the prompts which should be hidden behind the advanced option switch
    const advancedPrompts = [
        ui5AppInquirerPromptNames.enableCodeAssist,
        ui5AppInquirerPromptNames.skipAnnotations,
        ui5AppInquirerPromptNames.enableEslint,
        ui5AppInquirerPromptNames.ui5Theme
    ];
    advancedPrompts.forEach((advPromptKey) => {
        const promptOpt = promptOptions[advPromptKey] as PromptDefaultValue<boolean | string> &
            UI5ApplicationCommonPromptOptions;
        // Advanced options are hidden by default and so we must assign a default value or an answer may not be returned (since advanced options are not shown by default)
        const defaultValue = defaultPromptValues[advPromptKey as keyof typeof defaultPromptValues];
        // We have a prompt option defined so update it with the advanced option
        if (promptOpt) {
            promptOpt.advancedOption = true;
            // Set the default value if not already set and a default value is available
            if (!promptOpt.default && defaultValue !== undefined) {
                promptOpt.default = defaultValue;
            }
        } else {
            // No prompt option defined so create a new one
            promptOptions[advPromptKey] = {
                advancedOption: true
            };
            // Set the default value if default value is available
            if (defaultValue !== undefined) {
                (promptOptions[advPromptKey] as PromptDefaultValue<boolean | string>).default = defaultValue;
            }
        }
    });

    // Configure the generator extension settings by converting to prompt options
    if (extensions) {
        Object.entries(extensions).forEach(([key, ext]) => {
            Object.assign(
                promptOptions[key as keyof typeof ui5AppInquirerPromptNames] ??
                    Object.assign(promptOptions, { [key]: {} })[key],
                ext
            );
        });
    }

    return promptOptions;
}

/**
 * Convienience type for the options of the `createOdataServicePromptOptions` function.
 */
export interface OdataServiceInquirerOptions {
    requiredOdataVersion?: OdataVersion;
    allowNoDatasource?: boolean;
    capService?: CapService;
    /**
     * Note: only some of the allowed prompt options are currently supported.
     * Eventually all should be supported by merging the options with the prompt specific options.
     */
    promptOptions?: FioriAppGeneratorPromptSettings;
    showCollabDraftWarning?: boolean;
    workspaceFolders?: string[];
}

/**
 * Creates the prompt options for OData service prompting.
 * Note that if a capService is provided, this takes precedence over the datasource type setting.
 *
 * @param options
 * @param options.requiredOdataVersion will trigger warnings in prompts if the OData version is not supported.
 * @param options.allowNoDatasource If true, the user will be able to select 'None' as the datasource type. Fiori Freestyle specific.
 * @param options.capService If provided, the user will not be prompted for the CAP project and the default datasource type will be set to CAP project.
 * @param options.promptOptions A limited set of prompt options that can be set by the caller.
 * @param options.showCollabDraftWarning If true, a warning will be shown in the prompt if the service is a collaborative draft service.
 * @returns
 */
function createOdataServicePromptOptions(options: OdataServiceInquirerOptions): OdataServicePromptOptions {
    let defaultDatasourceSelection;
    const isYUI = getHostEnvironment() !== hostEnvironment.cli;

    if (options.capService) {
        defaultDatasourceSelection = DatasourceType.capProject;
    } else if (options.promptOptions?.systemSelection?.defaultChoice) {
        defaultDatasourceSelection = DatasourceType.sapSystem;
    }

    return {
        [odataServiceInquirerPromptNames.datasourceType]: {
            default: defaultDatasourceSelection,
            includeNone: !!options.allowNoDatasource
        },
        [odataServiceInquirerPromptNames.metadataFilePath]: {
            requiredOdataVersion: options.requiredOdataVersion
        },
        [odataServiceInquirerPromptNames.capProject]: {
            capSearchPaths: options.workspaceFolders ?? [],
            defaultChoice: options.capService?.projectPath
        },
        [odataServiceInquirerPromptNames.capService]: {
            defaultChoice: options.capService
        },
        [odataServiceInquirerPromptNames.serviceUrl]: {
            requiredOdataVersion: options.requiredOdataVersion,
            showCollaborativeDraftWarning: options.showCollabDraftWarning && isYUI
        },
        [odataServiceInquirerPromptNames.serviceSelection]: {
            useAutoComplete: getHostEnvironment() === hostEnvironment.cli,
            requiredOdataVersion:
                options.requiredOdataVersion ?? options.promptOptions?.serviceSelection?.requiredOdataVersion,
            showCollaborativeDraftWarning: options.showCollabDraftWarning && isYUI,
            serviceFilter: options.promptOptions?.serviceSelection?.serviceFilter
        },
        [odataServiceInquirerPromptNames.systemSelection]: {
            destinationFilters: {
                odata_abap: true,
                full_service_url: true,
                partial_service_url: true
            },
            useAutoComplete: !isYUI,
            includeCloudFoundryAbapEnvChoice: true,
            ...options.promptOptions?.systemSelection
        }
    };
}
