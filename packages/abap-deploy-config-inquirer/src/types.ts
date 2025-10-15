import type { AbapTarget } from '@sap-ux/system-access';
import type { ServiceProvider, SystemInfo } from '@sap-ux/axios-extension';
import type { CommonPromptOptions, YUIQuestion } from '@sap-ux/inquirer-common';

export const enum TargetSystemType {
    Url = 'Url'
}

export const enum ClientChoiceValue {
    Base = 'base',
    New = 'new',
    Blank = 'blank'
}

export interface Credentials {
    username?: string;
    password?: string;
}

/**
 * The target system used during generation.
 */
export interface BackendTarget {
    /**
     * The name of the backend system.
     */
    systemName?: string;
    /**
     * ABAP Target - can be either a URL Abap Target or a destination.
     */
    abapTarget: AbapTarget;
    /**
     * The connected service provider for the backend system. Passing this removes the need for re-authentication.
     */
    serviceProvider?: ServiceProvider;
    /**
     * The type of project that the deployment configuration is for.
     */
    type?: 'application' | 'library';
}

export interface AbapSystemChoice {
    name: string;
    value: string;
    scp?: boolean;
    url?: string;
    client?: string;
    isDefault?: boolean;
    isAbapCloud?: boolean;
}

/**
 * Enumeration of prompt names used by
 *
 * N.B. as these prompts are merged with CF prompts (see `promptNames` in packages/cf-deploy-config-inquirer/src/types.ts),
 * ensure that the names are unique across both files.
 */
export enum promptNames {
    destination = 'destination',
    destinationCliSetter = 'destinationCliSetter',
    targetSystem = 'targetSystem',
    targetSystemCliSetter = 'targetSystemCliSetter',
    url = 'url',
    scp = 'scp',
    scpSetter = 'scpSetter',
    clientChoice = 'clientChoice',
    clientChoiceCliSetter = 'clientChoiceCliSetter',
    client = 'client',
    username = 'username',
    password = 'password',
    ui5AbapRepo = 'ui5AbapRepo',
    description = 'description',
    packageInputChoice = 'packageInputChoice',
    packageCliExecution = 'packageCliExecution',
    packageManual = 'packageManual',
    packageAutocomplete = 'packageAutocomplete',
    transportInputChoice = 'transportInputChoice',
    transportCliExecution = 'transportCliExecution',
    transportCreated = 'transportCreated',
    transportFromList = 'transportFromList',
    transportManual = 'transportManual',
    index = 'index',
    overwriteAbapConfig = 'overwriteAbapConfig'
}

/**
 * Options for the UI5 ABAP repository prompt.
 * If `hide` is set to `true`, the prompt will not be shown, it is required to add a default value in this case.
 */
export type UI5AbapRepoPromptOptions =
    | {
          hide?: false;
          default?: string;
          /**
           * If set to true, the prompt will be hidden if the target system is on-premise.
           */
          hideIfOnPremise?: boolean;
      }
    | {
          hide: true;
          default: string;
      };

export type DescriptionPromptOptions = {
    /**
     * Default description value.
     */
    default?: string;
};

export type PackagePromptOptions = {
    /**
     * Indicator for the validations to be performed on the package input.
     */
    additionalValidation?: {
        /**
         * Check if the given package is appropriate to the system of the created project
         */
        shouldValidatePackageType?: boolean;

        /**
         * Check if the given package matches ui5AbapRepo starting preffix or namespace
         */
        shouldValidatePackageForStartingPrefix?: boolean;

        /**
         * Check if the given package matches appropriate format and special characters
         */
        shouldValidateFormatAndSpecialCharacters?: boolean;
    };
};

export type PackageManualPromptOptions = PackagePromptOptions & {
    /**
     * Default package value.
     */
    default?: string;
};

export type TransportManualPromptOptions = {
    /**
     * Default transport value.
     */
    default?: string;
};

export type TransportCreatedPromptOptions = {
    /**
     * Custom description for the new transport request.
     */
    description?: string;
};

export type OverwritePromptOptions = {
    /**
     * This option allows the prompt to be hidden and should be used when the overwrite prompt should not be shown.
     * It should be set to false when existing configuration will be overwritten.
     */
    hide?: boolean;
};

export type IndexPromptOptions = {
    /**
     * This option indicates if an generating an index.html is allowed.
     */
    indexGenerationAllowed?: boolean;
};

export type PackageAutocompletePromptOptions = PackagePromptOptions & {
    /**
     * Determines if the package autocomplete prompt should use auto complete prompt for packages.
     * Note that the auto-complete module must be registered with the inquirer instance to use this feature.
     */
    useAutocomplete?: boolean;
};

export type TransportInputChoicePromptOptions = {
    /**
     * If set to true, the prompt will be hidden if the target system is on-premise.
     */
    hideIfOnPremise?: boolean;
    /**
     * This options determines if createDuringDeploy option should be shown in the list of transport choices.
     */
    showCreateDuringDeploy?: boolean;
};

export type TargetSystemPromptOptions = {
    additionalValidation?: {
        shouldRestrictDifferentSystemType: boolean;
    };
};

type AbapPromptsCommonOptions =
    | promptNames.destination
    | promptNames.url
    | promptNames.scp
    | promptNames.clientChoice
    | promptNames.client
    | promptNames.username
    | promptNames.password
    | promptNames.packageInputChoice
    | promptNames.transportFromList;

type abapPromptOptions = {
    [K in AbapPromptsCommonOptions]: CommonPromptOptions;
} & {
    [promptNames.targetSystem]: TargetSystemPromptOptions & CommonPromptOptions;
    [promptNames.ui5AbapRepo]: UI5AbapRepoPromptOptions & CommonPromptOptions;
    [promptNames.description]: DescriptionPromptOptions & CommonPromptOptions;
    [promptNames.packageManual]: PackageManualPromptOptions & CommonPromptOptions;
    [promptNames.transportManual]: TransportManualPromptOptions & CommonPromptOptions;
    [promptNames.transportCreated]: TransportCreatedPromptOptions & CommonPromptOptions;
    [promptNames.overwriteAbapConfig]: OverwritePromptOptions & CommonPromptOptions;
    [promptNames.index]: IndexPromptOptions & CommonPromptOptions;
    [promptNames.packageAutocomplete]: PackageAutocompletePromptOptions & CommonPromptOptions;
    [promptNames.transportInputChoice]: TransportInputChoicePromptOptions & CommonPromptOptions;
};

/**
 * The options which are common for the abap deploy config inquirer.
 */
type AbapDeployConfigCommonInquirerOptions = {
    backendTarget?: BackendTarget;
};

/**
 * The options for the abap deploy config inquirer & the prompts.
 */
export type AbapDeployConfigPromptOptions = Partial<abapPromptOptions> & AbapDeployConfigCommonInquirerOptions;

export interface TransportAnswers {
    transportRequired?: boolean;
    transportConfig?: TransportConfig;
    transportConfigError?: string;
    transportConfigNeedsCreds?: boolean;
    transportList?: TransportListItem[];
    newTransportNumber?: string;
}

export interface AbapDeployConfigAnswers {
    url: string;
    destination?: string;
    targetSystem?: string;
    client?: string;
    scp?: boolean;
    ui5AbapRepo?: string;
    description?: string;
    package: string;
    transport?: string;
    index?: boolean;
    overwrite?: boolean;
}

export interface AbapDeployConfigAnswersInternal extends AbapDeployConfigAnswers {
    clientChoice?: string;
    username?: string;
    isAbapCloud?: boolean;
    packageInputChoice?: PackageInputChoices;
    packageManual?: string;
    packageAutocomplete?: string;
    transportInputChoice?: TransportChoices;
    transportCreated?: string;
    transportFromList?: string;
    transportManual?: string;
    abort?: boolean;
}

export interface TransportListItem {
    transportReqNumber: string;
    transportReqDescription: string;
}

export interface TransportConfig {
    /**
     *
     */
    getPackage(): string | undefined;
    /**
     *
     */
    getApplicationPrefix(): string | undefined;
    /**
     *
     */
    isTransportRequired(): boolean;
    /**
     *
     */
    getDefaultTransport(): string | undefined;
    /**
     *
     */
    getOperationsType(): string | undefined;
}

export interface InitTransportConfigResult {
    transportConfig?: TransportConfig;
    transportConfigNeedsCreds?: boolean;
    error?: string;
}

export interface SystemConfig {
    url?: string;
    client?: string;
    destination?: string;
}

export enum PackageInputChoices {
    EnterManualChoice = 'EnterManualChoice',
    ListExistingChoice = 'ListExistingChoice'
}

export enum TransportChoices {
    EnterManualChoice = 'EnterManualChoice',
    ListExistingChoice = 'ListExistingChoice',
    CreateNewChoice = 'CreateNewChoice',
    CreateDuringDeployChoice = 'CreateDuringDeployChoice'
}

export type AbapDeployConfigQuestion = YUIQuestion<AbapDeployConfigAnswersInternal>;

export type SystemInfoResult = {
    systemInfo?: SystemInfo;
    apiExist: boolean;
};
