import { Authentication } from '@sap-ux/btp-utils'; // eslint-disable-line @typescript-eslint/no-unused-vars
import type { Annotations } from '@sap-ux/axios-extension';
import type { FloorplanKey } from './app-gen';
import type { CapRuntime } from './cap';

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

/**
 * Defines the external interface used to generate in headless mode (no prompts)
 * This is a deliberate re-definition of internal interfaces to avoid consumers having
 * to update when internal interfaces are changed
 * NOTE: Any breaking changes to this interface require a version bump
 */
export interface AppConfig {
    readonly version: string; // The interface version
    readonly floorplan: FloorplanKey;
    project: {
        readonly name: string;
        targetFolder?: string; // Current working directory will be used if not provided
        readonly namespace?: string;
        readonly title?: string;
        readonly description?: string;
        readonly ui5Theme?: string;
        readonly ui5Version?: string;
        readonly localUI5Version?: string;
        readonly sapux?: boolean;
        readonly skipAnnotations?: boolean;
        readonly enableCodeAssist?: boolean;
        readonly enableEslint?: boolean;
        readonly enableTypeScript?: boolean;
    };
    service?: {
        readonly host?: string;
        readonly servicePath?: string;
        readonly client?: string;
        readonly scp?: boolean; // If available key store entry must be available or provided at app runtime
        readonly destination?: string;
        readonly destinationInstance?: string;
        readonly edmx?: string;
        readonly annotations?: Annotations | Annotations[];
        readonly capService?: {
            readonly projectPath: string;
            readonly serviceName: string;
            readonly serviceCdsPath: string;
            readonly capType?: CapRuntime;
            readonly appPath?: string; // Alternative app path
        };
        readonly apiHubApiKey?: string; // Non-enterprise support only currently
    };
    deployConfig?: DeployConfig;
    flpConfig?: FLPConfig;
    /**
     * Adds telemetry data when passed to generator `@sap/generator-fiori:headless`
     */
    telemetryData?: {
        generationSourceName?: string;
        generationSourceVersion?: string;
    };
}
