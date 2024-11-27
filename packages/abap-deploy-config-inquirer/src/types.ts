import type { AbapTarget } from '@sap-ux/system-access';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { Validator } from 'inquirer';

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
    isS4HC?: boolean;
}

/**
 * Enumeration of prompt names used by
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
    overwrite = 'overwrite'
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

type PackagePromptOptions = {
    /**
     * Add custom validation
     */
    validate?: Validator<AbapDeployConfigAnswers>;
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

type abapDeployConfigPromptOptions = Record<promptNames.ui5AbapRepo, UI5AbapRepoPromptOptions> &
    Record<promptNames.description, DescriptionPromptOptions> &
    Record<promptNames.packageManual, PackageManualPromptOptions> &
    Record<promptNames.transportManual, TransportManualPromptOptions> &
    Record<promptNames.overwrite, OverwritePromptOptions> &
    Record<promptNames.index, IndexPromptOptions> &
    Record<promptNames.packageAutocomplete, PackageAutocompletePromptOptions>;

/**
 * The options which are common for the abap deploy config inquirer.
 */
type AbapDeployConfigCommonInquirerOptions = {
    backendTarget?: BackendTarget;
};

/**
 * The options for the abap deploy config inquirer & the prompts.
 */
export type AbapDeployConfigPromptOptions = Partial<abapDeployConfigPromptOptions> &
    AbapDeployConfigCommonInquirerOptions;

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
    isS4HC?: boolean;
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
    warning?: string;
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
