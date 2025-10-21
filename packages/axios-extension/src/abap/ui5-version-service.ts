import type { Logger } from '@sap-ux/logger';
import { Axios } from 'axios';
import type { Service } from 'base/service-provider';

/**
 * Stores the version of the UI5 framework.
 */
interface UI5VersionInfo {
    Version: string;
}

/**
 * Exception thrown when the get UI5 version api call succeed but does not provide
 * a valid version.
 */
class UI5VersionError extends Error {
    constructor() {
        super('UI5 version not provided.');
    }
}

/**
 * The service implements a request for getting the UI5 framework version on ABAP system.
 */
export class UI5VersionService extends Axios implements Service {
    /**
     * The base endpoint path used by this service for requests.
     */
    public static readonly PATH: string = '/sap/public/bc/ui5_ui5';

    /**
     * Instance of the logger.
     */
    public log: Logger;

    /**
     * Util method used to parse json string as a javascript plain object.
     *
     * @param data The json data as a string.
     * @returns The parsed javascript object.
     */
    private readonly toJSON = (data: string): unknown => JSON.parse(data);

    /**
     * The method returns a valid version of the UI5 framework on the ABAP system
     *  or throws an error if the version is not provided, malformed or there are connectivity
     *  issues or server errors.
     *
     * @returns The UI5 version on the ABAP system.
     */
    public async getUI5Version(): Promise<string> {
        try {
            const response = await this.get<UI5VersionInfo>('/bootstrap_info.json', {
                transformResponse: this.toJSON
            });
            const { Version: version } = response.data;
            if (!version) {
                throw new UI5VersionError();
            }
            return version;
        } catch (error) {
            this.log.error('Could not get UI5 Version.');
            this.log.debug(error);
            throw error;
        }
    }
}
