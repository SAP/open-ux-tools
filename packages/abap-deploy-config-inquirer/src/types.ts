import type { AbapTarget } from '@sap-ux/system-access';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { YUIQuestion } from '@sap-ux/inquirer-common';

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

export interface BackendTarget {
    systemName?: string; // name given for backend system
    abapTarget: AbapTarget;
    serviceProvider?: ServiceProvider;
    type?: 'application' | 'library';
}

export interface DeployTaskConfig {
    name?: string;
    description?: string;
    package?: string;
    transport?: string;
    [key: string]: unknown;
}

/**
 * AbapDeployConfigPromptOptions
 *
 * @param backendTarget - the backend target which may have been used to generate the application (useful for default values)
 * @param existingDeployTaskConfig - the existing deploy task configuration, will be used to prefill certain prompt answers
 * @param hideUi5AbapRepoPrompt - whether to hide the UI5 ABAP repository prompt
 * @param showOverwriteQuestion - whether to show the overwrite question (this can be determined by the caller)
 * @param indexGenerationAllowed - whether generating an index.html is allowed
 * @param useAutocomplete -  determines if the prompt(s) (currently only package prompt) should use auto completion
 */
export interface AbapDeployConfigPromptOptions {
    backendTarget?: BackendTarget;
    existingDeployTaskConfig?: DeployTaskConfig;
    hideUi5AbapRepoPrompt?: boolean;
    showOverwriteQuestion?: boolean;
    indexGenerationAllowed?: boolean;
    useAutocomplete?: boolean;
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
 * Enumeration of internal prompt names used internally and not supported for modification using ....
 */
export enum abapDeployConfigInternalPromptNames {
    destination = 'destination',
    destinationCliSetter = 'destinationCliSetter',
    targetSystem = 'targetSystem',
    targetSystemCliSetter = 'targetSystemCliSetter',
    url = 'url',
    scp = 'scp',
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

export interface TransportAnswers {
    transportRequired?: boolean;
    transportConfig?: TransportConfig;
    transportConfigError?: string;
    transportConfigNeedsCreds?: boolean;
    transportList?: TransportListItem[];
    newTransportNumber?: string;
}

export interface AbapDeployConfigAnswers {
    destination?: string;
    targetSystem?: string;
    url?: string;
    client?: string;
    scp?: boolean;
    ui5AbapRepo?: string;
    description?: string;
    package?: string;
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
