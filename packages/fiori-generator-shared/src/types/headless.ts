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

export interface FLPConfig {
    readonly action?: string;
    readonly title?: string;
    readonly semanticObject?: string;
}
