import type { Service } from '../base/service-provider';
import type { AxiosResponse } from 'axios';
import { Axios } from 'axios';
import { LogLevel } from '@sap-ux/logger';
import type { Logger } from '@sap-ux/logger';
import { readFileSync } from 'fs';
import { isAxiosError } from '../base/odata-request-error';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { TransportConfig } from './ui5-abap-repository-service';
import { logError } from './message';

export type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile & { [key: string]: unknown };
/**
 * Object structure representing a namespace: containing an id (variant id) and a reference (base application id).
 */
export type NamespaceObject = {
    /**
     * variant id
     */
    id: string;

    /**
     * base application id
     */
    reference: string;
};

/**
 * Type representing a namespace. It is either a string or an object.
 */
export type Namespace = NamespaceObject | string;

/**
 * Required configuration to deploy an adaptation project.
 */
export interface AdaptationConfig extends TransportConfig {
    /**
     * Namespace either as string or object
     */
    namespace: Namespace;

    /**
     * Optional layer (default: CUSTOMER_BASE)
     */
    layer?: Layer;
}

/**
 * Resulting structure after merging an app descriptor variant with the original app descriptor.
 */
export interface MergedAppDescriptor {
    name: string;
    url: string;
    manifest: Manifest;
    asyncHints: {
        libs: {
            name: string;
            lazy?: boolean;
            url?: {
                url: string;
                final: boolean;
            };
        }[];
        components: {
            name: string;
            lazy?: boolean;
            url?: {
                url: string;
                final: boolean;
            };
        }[];
        requests?: unknown[];
    };
}

/**
 * Structure of the result message.
 */
export interface Message {
    severity: 'Success' | 'Warning' | 'Error';
    text: string;
    details?: string[];
    id: string;
    variables?: string[];
}

/**
 * All available adaptation project types from system.
 */
export enum AdaptationProjectType {
    ON_PREMISE = 'onPremise',
    CLOUD_READY = 'cloudReady'
}

/**
 * Structure of the system info reponse data.
 */
export interface SystemInfo {
    /**
     * Supported adaptation project types from system.
     */
    adaptationProjectTypes: AdaptationProjectType[];
    activeLanguages: Language[];
}

interface Language {
    sap: string;
    description: string;
    i18n: string;
}
/**
 * Technically supported layers, however, in practice only `CUSTOMER_BASE` is used
 */
type Layer = 'VENDOR' | 'CUSTOMER_BASE';

/**
 * Returns the namespace as string.
 *
 * @param namespace either as string or as object
 * @returns serialized namespace
 */
function getNamespaceAsString(namespace: Namespace): string {
    return typeof namespace !== 'string' ? `apps/${namespace['reference']}/appVariants/${namespace['id']}/` : namespace;
}

/**
 * Check if a variable is a buffer.
 *
 * @param input variable to be checked
 * @returns true if the input is a buffer
 */
function isBuffer(input: string | Buffer): input is Buffer {
    return (input as Buffer).BYTES_PER_ELEMENT !== undefined;
}

/**
 * Path suffix for all DTA actions.
 */
const DTA_PATH_SUFFIX = '/dta_folder/';

/**
 * A class representing the design time adaptation service allowing to deploy adaptation projects to an ABAP system.
 */
export class LayeredRepositoryService extends Axios implements Service {
    public static readonly PATH = '/sap/bc/lrep';

    public log: Logger;

    /**
     * Simple request to fetch a CSRF token required for all writing operations.
     *
     * @returns the response
     */
    public async getCsrfToken() {
        try {
            return await this.get('/actions/getcsrftoken/');
        } catch (error) {
            if (isAxiosError(error)) {
                this.tryLogResponse(error.response);
            }
            throw error;
        }
    }

    /**
     * Merge a given app descriptor variant with the stord app descriptor.
     *
     * @param appDescriptorVariant zip file containing an app descriptor variant
     * @param workspacePath value for workspacePath URL parameter
     * @returns a promise with an object containing merged app descriptors with their id as keys.
     */
    public async mergeAppDescriptorVariant(
        appDescriptorVariant: Buffer,
        workspacePath?: string
    ): Promise<{ [key: string]: MergedAppDescriptor }> {
        const path = '/appdescr_variant_preview/';
        const params = new URLSearchParams(this.defaults?.params);

        if (workspacePath) {
            params.append('workspacePath', workspacePath);
        }

        try {
            const response = await this.put(path, appDescriptorVariant, {
                paramsSerializer: (params) => decodeURIComponent(params.toString()),
                params,
                headers: {
                    'Content-Type': 'application/zip'
                }
            });
            return JSON.parse(response.data);
        } catch (error) {
            if (isAxiosError(error)) {
                this.tryLogResponse(error.response);
            }
            throw error;
        }
    }

    /**
     * Check whether a variant with the given namespace already exists.
     *
     * @param namespace either as string or as object
     * @param [layer] optional layer
     * @returns the Axios response object for further processing
     */
    public async isExistingVariant(namespace: Namespace, layer: Layer = 'CUSTOMER_BASE'): Promise<AxiosResponse> {
        try {
            const response = await this.get(DTA_PATH_SUFFIX, {
                params: {
                    name: getNamespaceAsString(namespace),
                    layer,
                    timestamp: Date.now()
                }
            });
            this.tryLogResponse(response);
            return response;
        } catch (error) {
            if (isAxiosError(error)) {
                this.tryLogResponse(error.response);
                if (error.response?.status === 404) {
                    return error.response;
                }
            }
            throw error;
        }
    }

    /**
     * Deploy the given archive either by creating a new folder in the layered repository or updating an existing one.
     *
     * @param archive path to a zip archive or archive as buffer containing the adaptation project
     * @param config adataption project deployment configuration
     * @returns the Axios response object for futher processing
     */
    public async deploy(archive: Buffer | string, config: AdaptationConfig): Promise<AxiosResponse> {
        const data = isBuffer(archive) ? archive : readFileSync(archive);

        const checkResponse = await this.isExistingVariant(config.namespace);
        const params: object = {
            name: getNamespaceAsString(config.namespace),
            layer: config.layer ?? 'CUSTOMER_BASE'
        };

        params['package'] = config.package ?? '$TMP';
        if (params['package'].toUpperCase() !== '$TMP') {
            params['changelist'] = config.transport;
        }

        try {
            const response = await this.request({
                method: checkResponse.status === 200 ? 'PUT' : 'POST',
                url: DTA_PATH_SUFFIX,
                data,
                params,
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });
            this.tryLogResponse(response, 'Deployment successful.');
            return response;
        } catch (error) {
            logError({ error, log: this.log });
            throw error;
        }
    }

    /**
     * Undeploy the archive identified by the configuration.
     *
     * @param config adaptation project deployment configuration
     * @returns the Axios response object for further processing
     */
    public async undeploy(config: AdaptationConfig): Promise<AxiosResponse> {
        const checkResponse = await this.isExistingVariant(config.namespace);
        if (checkResponse.status !== 200) {
            throw new Error('Undeploy failed because the given project does not exist.');
        }
        const params: object = {
            name: getNamespaceAsString(config.namespace),
            layer: config.layer ?? 'CUSTOMER_BASE'
        };
        if (config.transport) {
            params['changelist'] = config.transport;
        }
        try {
            const response = await this.delete(DTA_PATH_SUFFIX, { params });
            this.tryLogResponse(response, 'Undeployment successful.');
            return response;
        } catch (error) {
            this.log.error('Undeployment failed');
            this.log.debug(error);
            if (isAxiosError(error) && error.response?.status === 405) {
                this.log.error(
                    'Newer version of SAP_UI required, please check https://help.sap.com/docs/bas/developing-sap-fiori-app-in-sap-business-application-studio/delete-adaptation-project'
                );
            }
            throw error;
        }
    }

    /**
     * Get system info.
     *
     * @param language
     * @param cloudPackage name
     * @returns the system info object
     */
    public async getSystemInfo(language: string = 'EN', cloudPackage?: string): Promise<SystemInfo> {
        try {
            const params = {
                'sap-language': language
            };
            if (cloudPackage) {
                params['package'] = cloudPackage;
            }

            const response = await this.get(`${DTA_PATH_SUFFIX}system_info`, { params });
            this.tryLogResponse(response, 'Successful getting system info.');
            return JSON.parse(response.data) as SystemInfo;
        } catch (error) {
            this.log.error('Getting system data failed.');
            this.log.debug(error);

            throw error;
        }
    }

    /**
     * Try parsing the response and log the result. If the parsing fails and an alternative is provided, log it instead.
     *
     * @param response axios response from the LREP service
     * @param alternativeMessage optional alternative message if the response cannot be parsed
     */
    private tryLogResponse(response, alternativeMessage?: string) {
        try {
            const info = response.data ? JSON.parse(response.data) : {};
            if (info.result) {
                this.logMessage(info.result);
            }
            (info.messages ?? []).forEach((message) => {
                this.logMessage(message);
            });
        } catch (error) {
            if (alternativeMessage) {
                this.log.info(alternativeMessage);
            }
            this.log.warn('Could not parse returned messages.');
        }
    }

    /**
     * Log a message from the backend.
     *
     * @param msg message to be logged
     */
    private logMessage(msg: Message) {
        const level = msg.severity === 'Error' ? LogLevel.Error : LogLevel.Info;
        this.log.log({ level, message: msg.text });
        (msg.details ?? []).forEach((message) => {
            this.log.log({ level, message });
        });
    }
}
