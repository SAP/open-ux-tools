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
     */
    component: string;
    /**
     * The theme to be used for the SAP Fiori preview.
     * This defines the UI5 theme, such as "sap_fiori_3" or other available themes.
     */
    ui5Theme: string;
}

export interface ServeStaticPath {
    path: string;
    src: string;
    fallthrough: boolean;
}
