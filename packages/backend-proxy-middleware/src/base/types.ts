import type { Options } from 'http-proxy-middleware';

export interface BaseBackendConfig {
    /**
     * Path that is to be proxied
     */
    path: string;
    /**
     * If provided then the path will be replaced with this value before forwarding.
     */
    pathReplace?: string;
    /**
     * sap-client parameter
     */
    client?: string;
    /**
     * If set to true the proxy will execute the required OAuth routine for the ABAP environment on SAP BTP
     */
    scp?: boolean;
    /**
     * If set to true then the proxy will connect to the SAP API Business Hub
     */
    apiHub?: boolean;
    /**
     * If set then it will override the proxy settings from node.
     */
    proxy?: string;
    /**
     * The BSP property for the FLP Embedded Flow. The property refers to the BSP Application Name.
     * In that case, we need to redirect the manifest.appdescr request to the local manifest.json in order to overwrite the deployed application with the local one.
     */
    bsp?: string;
}

export interface DestinationBackendConfig extends BaseBackendConfig {
    /**
     * Optional URL pointing to the backend system
     */
    url?: string;
    /**
     * Required if the backend system is available as destination in SAP Business Application Studio.
     */
    destination: string;
    /**
     * If a destination needs to be read by a specific instance of a destination service then you need to provide the id of the service as optional property `destinationInstance`.
     */
    destinationInstance?: string;
}

export interface LocalBackendConfig extends BaseBackendConfig {
    /**
     * Mandatory URL pointing to the backend system
     */
    url: string;
}

export type BackendConfig = LocalBackendConfig | DestinationBackendConfig;

export interface BackendMiddlewareConfig {
    backend: BackendConfig;
    options?: Partial<Options>;
}

export interface MiddlewareParameters<T> {
    resources: object;
    options: {
        configuration: T;
    };
}
