import type { AuthenticationType } from '@sap-ux/store';

export * from './ui5yaml';
export * from './middlewares';

export interface BspApp {
    name: string;
    package: string;
    description?: string;
    transport?: string;
}
export interface Adp {
    package: string;
    description?: string;
    transport?: string;
}

export interface UrlAbapTarget {
    url: string;
    client?: string;
    scp?: boolean;
    authenticationType?: AuthenticationType;
}

export interface DestinationAbapTarget {
    destination: string;
}

export type AbapTarget =
    | (UrlAbapTarget & Partial<DestinationAbapTarget>)
    | (DestinationAbapTarget & Partial<UrlAbapTarget>);

export interface AbapDeployConfig {
    target: AbapTarget;
    app: BspApp | Adp;
    ignoreCertError?: boolean;
    index?: boolean; // generate standalone index.html during deployment
    /**
     * The lrep namespace to be used for the deployment configuration for ADP projects
     */
    lrep?: string;
}

export interface FioriAppReloadConfig {
    port: number;
    path: string;
    delay: number;
}

/**
 * Interface representing the configuration for Fiori Preview.
 */
export interface FioriPreviewConfig {
    /**
     * The name of the component to be previewed.
     *
     * @deprecated This property is deprecated and will be removed in future versions.
     */
    component?: string;
    /**
     * The theme to be used for the SAP Fiori preview.
     * This defines the UI5 theme, such as "sap_fiori_3" or other available themes.
     *
     * @deprecated This property is deprecated and is now part of the `flp` configuration.
     */
    ui5Theme?: string;
    /**
     * Configuration object for the local Fiori launchpad
     */
    flp: {
        theme?: string; // Name of the UI5 Theme to be used
        path?: string; // The mount point of the local Fiori launchpad
        /**
         * Intent to be used for the application
         */
        intent?: {
            object?: string; // Intent object
            action?: string; // Intent action
        };
    };
}

export interface ServeStaticPath {
    path: string;
    src: string;
    fallthrough: boolean;
}

export type DataSourceConfig = {
    serviceName: string;
    servicePath: string;
    metadataPath?: string;
    resolveExternalServiceReferences?: boolean;
};
