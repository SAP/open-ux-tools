import type { Service } from '../base/service-provider';
import type { AxiosResponse } from 'axios';
import { Axios } from 'axios';
import type { Logger } from '@sap-ux/logger';
import { readFileSync } from 'fs';

/**
 * Required configuration to deploy an adaptation project.
 */
export interface DTAConfig {
    name: string;
    package: string;
    transport: string;
}

/**
 * Technically supported layers, however, in practice only `CUSTOMER_BASE` is used
 */
type Layer = 'VENDOR' | 'CUSTOMER_BASE';

/**
 * A class respresenting the design time adaptation service allowing to deploy adaptation projects to an ABAP system.
 */
export abstract class DesigntimeAdaptationService extends Axios implements Service {
    public static readonly PATH = '/sap/bc/lrep/dta_folder';

    public log: Logger;

    /**
     * Deploy the given archive either by creating a new folder in the layered repository or updating an existing one.
     *
     * @param archivePath path to a zip archive containing the adaptation project
     * @param app application configuration
     * @returns the Axios response object for futher processing
     */
    public async deploy(archivePath: string, dta: DTAConfig): Promise<AxiosResponse> {
        const base64Data = readFileSync(archivePath, { encoding: 'base64' });
        try {
            const response = await this.post('', base64Data, {
                params: {
                    name: dta.name,
                    layer: 'CUSTOMER_BASE' as Layer,
                    package: dta.package,
                    changeList: dta.transport
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
