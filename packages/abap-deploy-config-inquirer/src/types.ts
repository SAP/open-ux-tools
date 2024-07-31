import type { AbapTarget } from '@sap-ux/system-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
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
    abapServiceProvider?: AbapServiceProvider;
    type?: 'application' | 'library';
}

export interface DeployTaskConfig {
    name: string;
    description?: string;
    package?: string;
    transport: string;
    [key: string]: unknown;
}

export interface AbapDeployConfigPromptOptions {
    backendTarget?: BackendTarget;
    existingDeployTaskConfig?: DeployTaskConfig;
    showOverwriteQuestion?: boolean;
    indexGenerationAllowed?: boolean;
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
    targetSystem = 'targetSystem',
    url = 'url',
    scp = 'scp',
    clientChoice = 'clientChoice',
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
    transportConfig?: TransportConfig;
    transportConfigError?: string;
    transportConfigNeedsCreds?: boolean;
    transportList?: TransportListItem[];
    newTransportNumber?: string;
}

export interface AbapDeployConfigAnswers {
    abort?: boolean;
    destination?: string;
    targetSystem?: string;
    url?: string;
    client?: string;
    clientChoice?: string;
    scp?: boolean;
    username?: string;
    isS4HC?: boolean;
    packageInputChoice?: PackageInputChoices;
    packageManual?: string;
    packageAutocomplete?: string;
    transportInputChoice?: TransportChoices;
    transportManual?: string;
    ui5AbapRepo?: string; // reconciles to upper case
    description?: string;
    package?: string;
    transport?: string;
    index?: boolean;
    overwrite?: boolean;
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

export type AbapDeployConfigQuestion = YUIQuestion<AbapDeployConfigAnswers>;
