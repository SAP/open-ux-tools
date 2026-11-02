import type { Annotations, ODataVersion } from '@sap-ux/axios-extension';
import type { ApiHubType, SapSystemSourceType } from '../constants.js';

/**
 * Base service configuration shared across Fiori generation and migration tools.
 *
 * This interface contains the common fields used by both app generation and migration workflows.
 * Domain-specific packages should extend this with their additional fields.
 */
export interface BaseServiceConfig {
    /** SAP client parameter for the service */
    client?: string;

    /** URL path of the OData or CAP service */
    servicePath?: string;

    /** Annotations metadata for the service */
    annotations?: Annotations[];

    /** OData version (not present for Freestyle without datasource) */
    version?: ODataVersion;

    /**
     * Data source type (File, OData URL, CAP, SAP System, etc.)
     * Each package defines its own DatasourceType enum/const with domain-specific values
     */
    source: string;

    /** SAP system source type (used for README and documentation) */
    sapSystemSource?: SapSystemSourceType;

    /** Local path to the EDMX metadata file */
    localEdmxFilePath?: string;

    /** Authentication type for the destination (used by adaptors) */
    destinationAuthType?: string;

    /** API Hub configuration for enterprise and non-enterprise versions */
    apiHubConfig?: ApiHubConfig;

    /** Whether to ignore certificate errors */
    ignoreCertError?: boolean;
}

/**
 * API Hub service configuration for enterprise and non-enterprise versions
 */
export interface ApiHubConfig {
    apiHubKey: string;
    apiHubType: ApiHubType;
}
