import { ToolsLogger, type Logger } from '@sap-ux/logger';
import axios from 'axios';

type RelatedUrls = {
    relatedUrls?: {
        API?: string;
        UI?: string;
    };
};
/**
 * Makes requests to determine the virtual host names for UI and API access.
 */
export class ABAPVirtualHostProvider {
    private apiURL: URL;
    private uiURL: URL;
    private readonly systemURL: URL;
    private relatedUrls: RelatedUrls;
    private readonly logger: Logger = new ToolsLogger();

    /**
     *
     * @param backendUrl backend Url
     * @param logger
     */
    constructor(backendUrl: string, logger?: Logger) {
        this.systemURL = new URL(backendUrl);
        if (logger) {
            this.logger = logger;
        }
    }

    /**
     * Retrieves the virtual host names for UI and API access from the ABAP system public endpoint at the backend host.
     *
     * @returns An object containing the related URLs for API and UI access.
     */
    private async getVirtualHosts(): Promise<RelatedUrls> {
        if (!this.relatedUrls) {
            this.logger.debug(`Requesting virtual hosts from: ${this.systemURL}`);
            const url = new URL('/sap/public/bc/icf/virtualhost', this.systemURL.origin);
            const response = await axios.get(url.href, {
                headers: {
                    Accept: 'application/json'
                }
            });

            if (response.status !== 200) {
                this.logger.debug(`Failed to fetch virtual hosts: from: ${url}. Error: ${response.statusText}`);
                throw new Error(`Failed to fetch virtual hosts: ${response.statusText}`);
            }
            this.relatedUrls = response.data;
        }
        return this.relatedUrls;
    }

    /**
     * Get the UI hostname, if not cached yet it will be fetched.
     *
     * Mirrors ADT: when the backend's virtual host endpoint does not return a UI URL (e.g. it
     * responds with `{}` because UCON is not active, or with 404 on older backends), fall back to
     * the configured system URL rather than failing.
     *
     * @returns UI hostname
     */
    async uiHostname(): Promise<string> {
        if (!this.uiURL) {
            const ui = (await this.getVirtualHosts()).relatedUrls?.UI;
            this.uiURL = ui ? new URL(ui) : this.systemURL;
        }
        return this.uiURL.origin;
    }

    /**
     * Get the API hostname, if not cached yet it will be fetched.
     *
     * Mirrors ADT: when the backend's virtual host endpoint does not return an API URL, fall back
     * to the configured system URL rather than failing.
     *
     * @returns API hostname
     */
    async apiHostname(): Promise<string> {
        if (!this.apiURL) {
            const api = (await this.getVirtualHosts()).relatedUrls?.API;
            this.apiURL = api ? new URL(api) : this.systemURL;
        }
        return this.apiURL.origin;
    }

    /**
     * Get the logoff URL.
     *
     * @returns logoff URL
     */
    async logoffUrl(): Promise<string> {
        return (await this.uiHostname()) + '/sap/public/bc/icf/logoff';
    }
}
