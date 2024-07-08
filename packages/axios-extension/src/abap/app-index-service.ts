import type { Service } from '../base/service-provider';
import { Axios } from 'axios';
import type { Logger } from '@sap-ux/logger';
import { isAxiosError } from '../base/odata-request-error';

export interface App extends Record<string, unknown> {
    'sap.app/id': string;
    'sap.app/title': string;
    'sap.fiori/registrationIds': string[];
    url: string;
}

export type AppIndex = Partial<App>[];
export type AsyncHintsLib = {
    name: string;
};
export type AsyncHintsRequest = {
    name: string;
    reference: string;
};

export type Ui5AppInfo = Record<string, Ui5AppInfoContent>;
export interface Ui5AppInfoContent {
    name: string;
    url: string;
    manifestUrl?: string;
    manifest?: string;
    asyncHints: {
        libs: AsyncHintsLib[];
        requests: AsyncHintsRequest[];
    };
}

/**
 * A class representing the app index service allowing to search applications deployed on an ABAP system.
 */
export abstract class AppIndexService extends Axios implements Service {
    public static readonly PATH = '/sap/bc/ui2/app_index';

    public log: Logger;

    /**
     * Returns list of applications matching the search query from the catalog service.
     *
     * @param searchParams key/value list of search parameters
     * @param resultFields list of fields that should be used for the response
     * @returns list of applications
     */
    public async search(searchParams: { [property: string]: string } = {}, resultFields?: string[]): Promise<AppIndex> {
        const params = Object.assign({}, searchParams);
        if (resultFields) {
            params['fields'] = resultFields.join(',');
        }
        const response = await this.get('/', { params });
        return JSON.parse(response.data).results as AppIndex;
    }

    /**
     * Gets the app info for the specified id.
     *
     * @param {string} appId - The id of the app.
     * @returns {Promise<Ui5AppInfo>} App info.
     */
    public async getAppInfo(appId: string): Promise<Ui5AppInfo> {
        try {
            const response = await this.get('/ui5_app_info_json', { params: { id: appId } });
            return JSON.parse(response.data);
        } catch (error) {
            if (isAxiosError(error)) {
                this.log.error(`Failed fetching ui5_app_info_json for app with id ${appId}.`);
            } else {
                this.log.error(`Parsing error: ui5_app_info_json is not in expected format for app with id ${appId}.`);
            }
            this.log.debug(error);
            throw error;
        }
    }
}
