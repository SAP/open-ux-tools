import type { Service } from '../base/service-provider';
import type { AxiosResponse } from 'axios';
import { Axios } from 'axios';
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
     * @returns true if the variant exists
     */
    public async check(namespace: Namespace): Promise<boolean> {
        try {
            await this.get('/dta_folder', {
                params: {
                    name: getNamespaceAsString(namespace),
                    layer: 'CUSTOMER_BASE' as Layer
                }
            });
            return true;
        } catch (error) {
            if (error.status === 404) {
                return false;
            } else {
                throw error;
            }
        }
    }

    /**
     * Fetch a csrf token required for deployment. The token will be returned as header 'x-csrf-token'.
     *
     * @returns the Axios response object for futher processing
     */
    public async getCsrfToken(): Promise<AxiosResponse> {
        return this.get('/actions/getcsrftoken', {
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
        try {
            const tokenResponse = await this.getCsrfToken();
            const appExists = await this.check(config.namespace);
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
                method: appExists ? 'PUT' : 'POST',
                url: '/dta_folder',
                data: base64Data,
                params,
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-Csrf-Token': tokenResponse.headers['x-csrf-token']
                }
            });
            // TODO: read response
            this.log.info('Deployment successful.');
            return response;
        } catch (error) {
            switch (error.response?.status) {
                case 400:
                    // TODO: check the body for error details
                    break;
                case 409:
                    this.log.error('The adapted app already exists.');
                    break;
                default:
                    this.log.error('An unknown error occured.');
                    break;
            }
            throw error;
        }
    }
}
/*
{
    "result": {
        "severity": "<Success|Warning|Error>",
        "text": "<error text>",
        "details": [
            "<detailed description>",
            "<if available>"
        ],
        "id": "<message type>:<message class>:<message number>",
        "variables: [
                "<message variable 1>",
                ...
            ]
        },
    },
    "messages": [
        {
            "severity": "<Success|Info|Warning|Error>",
            "text": "<error text>",
            "details": [
                "<detailed description>",
                "<if available>"
            ],
            "id": "<message type>:<message class>:<message number>",
            "variables: [
                "<message variable>",
                ...
            ]
        },
        ...
    ],
    "backendExecution": {
        "atTimeStamp": <time stamp backend execution>,
        "forMs": <backend execution time in ms>
   }
}

*/
