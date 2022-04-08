import type { Service } from '../base/service-provider';
import type { AxiosResponse } from 'axios';
import { Axios } from 'axios';
import { LogLevel } from '@sap-ux/logger';
import type { Logger } from '@sap-ux/logger';
import { readFileSync } from 'fs';

/**
 * Type representing a namespace. It is either a string or an object containing an id (variant id) and a reference (base application id).
 */
export type Namespace =
    | string
    | {
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
 * Technically supported layers, however, in practice only `CUSTOMER_BASE` is used
 */
type Layer = 'VENDOR' | 'CUSTOMER_BASE';

/**
 * Structure of the result message.
 */
interface Message {
    severity: 'Success' | 'Warning' | 'Error';
    text: string;
    details?: string[];
    id: string;
    variables?: string[];
}

/**
 * Returns the namespace as string.
 *
 * @param namespace either as string or as object
 * @returns serialized namespace
 */
function getNamespaceAsString(namespace: Namespace): string {
    return namespace['id'] ? `apps/${namespace['reference']}/appVariants/${namespace['id']}/` : (namespace as string);
}

/**
 * A class respresenting the design time adaptation service allowing to deploy adaptation projects to an ABAP system.
 */
export abstract class LayeredRepositoryService extends Axios implements Service {
    public static readonly PATH = '/sap/bc/lrep';

    public log: Logger;

    /**
     * Check whether a variant with the given namespace already exists.
     *
     * @param namespace either as string or as object
     * @returns the Axios response object for futher processing
     */
    public async check(namespace: Namespace): Promise<AxiosResponse> {
        return this.get('/dta_folder/', {
            params: {
                name: getNamespaceAsString(namespace),
                layer: 'CUSTOMER_BASE' as Layer
            }
        });
    }

    /**
     * Fetch a csrf token required for deployment. The token will be returned as header 'x-csrf-token'.
     *
     * @returns the Axios response object for futher processing
     */
    public async getCsrfToken(): Promise<AxiosResponse> {
        return this.get('/actions/getcsrftoken/', {
            headers: {
                'X-Csrf-Token': 'Fetch'
            }
        });
    }

    /**
     * Deploy the given archive either by creating a new folder in the layered repository or updating an existing one.
     *
     * @param archivePath path to a zip archive containing the adaptation project
     * @param config adataption project deployment configuration
     * @returns the Axios response object for futher processing
     */
    public async deploy(archivePath: string, config: AdaptationConfig): Promise<AxiosResponse> {
        const base64Data = readFileSync(archivePath, { encoding: 'base64' });

        const tokenResponse = await this.getCsrfToken();
        const checkResponse = await this.check(config.namespace);
        const params: object = {
            name: getNamespaceAsString(config.namespace),
            layer: 'CUSTOMER_BASE' as Layer
        };
        if (config.package) {
            params['package'] = config.package;
            if (config.package.toLowerCase() !== '$tmp') {
                params['changeList'] = config.transport;
            }
        }
        const response = await this.request({
            method: checkResponse.status === 200 ? 'PUT' : 'POST',
            url: '/dta_folder/',
            data: base64Data,
            params,
            headers: {
                'Content-Type': 'application/octet-stream',
                'X-Csrf-Token': tokenResponse.headers['x-csrf-token']
            }
        });

        const info = JSON.parse(response.data);
        if (info.result) {
            this.logMessage(info.result);
        }
        if (info.messages) {
            (info.messages ?? []).forEach((message) => {
                this.logMessage(message);
            });
        }

        return response;
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
