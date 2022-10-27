import type { Service } from '../base/service-provider';
import type { AxiosResponse } from 'axios';
import { Axios } from 'axios';
import { LogLevel } from '@sap-ux/logger';
import type { Logger } from '@sap-ux/logger';
import { readFileSync } from 'fs';
import { isAxiosError } from '../base/odata-request-error';

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
export interface AdaptationConfig {
    /**
     * Namespace either as string or object
     */
    namespace: Namespace;

    /**
     * Optional ABAP package name
     */
    package?: string;

    /**
     * Optional transport request
     */
    transport?: string;
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
 * Path suffix for all DTA actions.
 */
const DTA_PATH_SUFFIX = '/dta_folder/';

/**
 * A class respresenting the design time adaptation service allowing to deploy adaptation projects to an ABAP system.
 */
export class LayeredRepositoryService extends Axios implements Service {
    public static readonly PATH = '/sap/bc/lrep';

    public log: Logger;

    /**
     * Check whether a variant with the given namespace already exists.
     *
     * @param namespace either as string or as object
     * @returns the Axios response object for futher processing
     */
    public async isExistingVariant(namespace: Namespace): Promise<AxiosResponse> {
        try {
            const response = await this.get(DTA_PATH_SUFFIX, {
                params: {
                    name: getNamespaceAsString(namespace),
                    layer: 'CUSTOMER_BASE' as Layer,
                    timestamp: Date.now()
                }
            });
            this.tryLogResponse(response);
            return response;
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                return error.response;
            } else {
                throw error;
            }
        }
    }

    /**
     * Deploy the given archive either by creating a new folder in the layered repository or updating an existing one.
     *
     * @param archivePath path to a zip archive containing the adaptation project
     * @param config adataption project deployment configuration
     * @returns the Axios response object for futher processing
     */
    public async deploy(archivePath: string, config: AdaptationConfig): Promise<AxiosResponse> {
        const archive = readFileSync(archivePath);

        const checkResponse = await this.isExistingVariant(config.namespace);
        const params: object = {
            name: getNamespaceAsString(config.namespace),
            layer: 'CUSTOMER_BASE' as Layer
        };

        params['package'] = config.package ?? '$TMP';
        if (params['package'].toUpperCase() !== '$TMP') {
            params['changelist'] = config.transport;
        }

        const response = await this.request({
            method: checkResponse.status === 200 ? 'PUT' : 'POST',
            url: DTA_PATH_SUFFIX,
            data: archive,
            params,
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        });
        this.tryLogResponse(response, 'Deployment successful.');

        return response;
    }

    /**
     * Undeploy the archive identified by the configuration.
     *
     * @param config adataption project deployment configuration
     * @returns the Axios response object for futher processing
     */
    public async undeploy(config: AdaptationConfig): Promise<AxiosResponse> {
        const checkResponse = await this.isExistingVariant(config.namespace);
        if (checkResponse.status !== 200) {
            throw new Error('Undeploy failed because the given project does not exist.');
        }
        const params: object = {
            name: getNamespaceAsString(config.namespace),
            layer: 'CUSTOMER_BASE' as Layer
        };
        if (config.transport) {
            params['changelist'] = config.transport;
        }
        const response = await this.delete(DTA_PATH_SUFFIX, { params });
        this.tryLogResponse(response, 'Undeployment successful.');

        return response;
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
