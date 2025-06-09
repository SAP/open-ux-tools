import { Authentication } from '@sap-ux/btp-utils';
/**
 * Shared types used by headless generation from multiple modules
 */
export enum DeployTarget {
    CF = 'CF',
    ABAP = 'ABAP'
}
/**
 * Defines the additional external inputs required for deployment configuration file generation
 */
export interface DeployConfig {
    readonly deployTarget: DeployTarget;
}

export interface CFDeployConfig extends DeployConfig {
    readonly deployTarget: DeployTarget.CF;
    readonly destinationName: string; // Destination name to be used in mta file
    /**
     * See {@link Authentication} for possible values
     */
    readonly destinationAuthType?: string;
    readonly addToManagedAppRouter?: boolean; // Add to the managed app router yaml
    readonly addMTADestination?: boolean; // Add CAP destination
    readonly lcapModeOnly?: boolean; // Only make local Fiori app changes when parent project is a CAP project
    readonly cloudServiceName?: string; // Add Cloud Service name
}

export interface AbapDeployConfigOptions extends DeployConfig {
    /**
     * The deploy target for the ABAP deployment configuration.
     */
    readonly deployTarget: DeployTarget.ABAP;
    /**
     * Destination name to be used in abap deployment (BAS Only).
     */
    readonly destination?: string;
    /**
     * Target URL for the ABAP deployment (VSCode Only).
     */
    readonly url?: string;
    /**
     * Target client for the ABAP deployment (VSCode Only).
     */
    readonly client?: string;
    /**
     * This value is required in VSCode if the system is not saved in the local keystore.
     * The `scp` flag will mean the running app will look for an auth key in the local keystore.
     */
    readonly scp?: boolean;
    /**
     * Name for the UI5 ABAP repository.
     */
    readonly ui5AbapRepo: string;
    /**
     * Description for the ABAP deployment.
     */
    readonly description?: string;
    /**
     * Package for the deployment.
     */
    readonly package: string;
    /**
     * Transport request for the deployment.
     */
    readonly transport?: string;
}

export interface FLPConfig {
    readonly action?: string;
    readonly title?: string;
    readonly semanticObject?: string;
}
