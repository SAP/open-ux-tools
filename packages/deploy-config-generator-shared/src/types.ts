import type { AbapTarget } from '@sap-ux/system-access';
import type { ServiceProvider } from '@sap-ux/axios-extension';

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

export interface Credentials {
    username?: string;
    password?: string;
}

export interface SystemConfig {
    url?: string;
    client?: string;
    destination?: string;
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

export interface TransportAnswers {
    transportRequired?: boolean;
    transportConfig?: TransportConfig;
    transportConfigError?: string;
    transportConfigNeedsCreds?: boolean;
    transportList?: TransportListItem[];
    newTransportNumber?: string;
}
