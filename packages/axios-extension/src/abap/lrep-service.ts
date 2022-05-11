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
    return namespace['id'] ? `apps/${namespace['reference']}/appVariants/${namespace['id']}/` : (namespace as string);
}

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
    public async check(namespace: Namespace): Promise<AxiosResponse> {
        return this.get('/dta_folder/', {
            params: {
                name: getNamespaceAsString(namespace),
                layer: 'CUSTOMER_BASE' as Layer
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
        const archive = readFileSync(archivePath);

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
            data: archive,
            params,
            headers: {
                'Content-Type': 'application/octet-stream'
            }
        });

        try {
            const info = response.data ? JSON.parse(response.data) : {};
            if (info.result) {
                this.logMessage(info.result);
            }
            (info.messages ?? []).forEach((message) => {
                this.logMessage(message);
            });
        } catch (error) {
            this.log.info('Deployment successful.');
            this.log.warn('Could not parse returned messages.');
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
