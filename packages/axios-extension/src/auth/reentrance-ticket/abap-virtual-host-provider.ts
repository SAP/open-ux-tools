import type { Logger } from '@sap-ux/logger';
import axios from 'axios';

/**
 * Makes requests to determine the virtual host names for UI and API access.
 */
export class ABAPVirtualHostProvider {
    private apiURL: URL;
    private uiURL: URL;
    private systemURL: URL;
    private logger: Logger;

    /**
     *
     * @param backendUrl backend Url
     * @param logger
     */
    constructor(backendUrl: string, logger?: Logger) {
        this.systemURL = new URL(backendUrl);
        this.logger = logger;
    }

    /**
     * Retrieves the virtual host names for UI and API access from the ABAP system public endpoint at the backend host.
     *
     * @returns An object containing the related URLs for API and UI access.
     */
    private async getVirtualHosts(): Promise<{ relatedUrls: { API: string; UI: string } }> {
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
        return response.data;
    }

    /**
     * Get the UI hostname, if not cached yet it will be fetched.
     *
     * @returns UI hostname
     */
    async uiHostname(): Promise<string> {
        if (!this.uiURL) {
            this.uiURL = new URL((await this.getVirtualHosts()).relatedUrls.UI);
        }
        return this.uiURL.origin;
    }

    /**
     * Get the API hostname, if not cached yet it will be fetched.
     *
     * @returns API hostname
     */
    async apiHostname(): Promise<string> {
        if (!this.apiURL) {
            this.apiURL = new URL((await this.getVirtualHosts()).relatedUrls.API);
        }
        return this.apiURL.origin;
    }

    /**
     * Get the logoff URL.
     *
     * @returns logoff URL
     */
    logoffUrl(): string {
        return this.uiHostname() + '/sap/public/bc/icf/logoff';
    }
}
