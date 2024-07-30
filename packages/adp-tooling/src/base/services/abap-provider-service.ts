import { AbapServiceProvider, AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { Logger } from '@sap-ux/logger';
import { AuthenticationType } from '@sap-ux/store';
import {
    getCredentialsFromStore,
    createAbapServiceProvider,
    DestinationAbapTarget,
    UrlAbapTarget
} from '@sap-ux/system-access';
import { AbapTarget } from '@sap-ux/ui5-config';
import { EndpointsService } from './endpoints-service';

export type RequestOptions = AxiosRequestConfig & Partial<ProviderConfiguration>;

/**
 * Service for managing and providing access to an ABAP service provider.
 */
export class ProviderService {
    private provider: AbapServiceProvider;

    /**
     * Constructs an instance of ProviderService.
     *
     * @param {ProviderService} endpointsService - The endpoints service for retrieving system details.
     */
    constructor(private endpointsService: EndpointsService) {}

    /**
     * Retrieves the configured ABAP service provider if set, otherwise throws an error.
     *
     * @returns {AbapServiceProvider} - The configured ABAP service provider.
     */
    public getProvider(): AbapServiceProvider {
        if (!this.provider) {
            throw new Error('Provider was not set!');
        }
        return this.provider;
    }

    /**
     * Configures the ABAP service provider using the specified system details and credentials.
     *
     * @param {string} system - The system identifier.
     * @param {string} [client] - The client, if applicable.
     * @param {string} [username] - The username for authentication.
     * @param {string} [password] - The password for authentication.
     */
    public async setProvider(system: string, client?: string, username?: string, password?: string) {
        const requestOptions: RequestOptions = {
            ignoreCertErrors: false
        };

        const target = await this.determineTarget(requestOptions, system, client);

        if (username && password) {
            requestOptions.auth = { username, password };
        }

        this.provider = await createAbapServiceProvider(target, requestOptions, false, {} as Logger);
    }

    /**
     * Determines the target configuration for the ABAP service provider based on whether the application
     * is running within SAP App Studio or outside of it.
     *
     * @param {RequestOptions} requestOptions - The request options to be configured during this setup.
     * @param {string} system - The system identifier, which could be a URL or a system name.
     * @param {string} [client] - Optional client number, used in systems where multiple clients exist.
     * @returns {Promise<AbapTarget>} - The configuration object for the ABAP service provider, tailored based on the running environment.
     */
    private async determineTarget(
        requestOptions: RequestOptions,
        system: string,
        client?: string
    ): Promise<AbapTarget> {
        let target: AbapTarget;

        if (isAppStudio()) {
            target = {
                destination: system
            };
        } else {
            const details = this.endpointsService.getSystemDetails(system);

            target = {
                url: details?.url,
                client: details?.client ?? client
            } as AbapTarget;

            const storedSystem = await getCredentialsFromStore(
                { url: details?.url ?? system, client: details?.client },
                {} as Logger
            );

            if (storedSystem?.username && storedSystem?.password) {
                requestOptions.auth = { username: storedSystem?.username, password: storedSystem?.password };
            }

            if (storedSystem?.authenticationType === AuthenticationType.ReentranceTicket) {
                target.authenticationType = AuthenticationType.ReentranceTicket;
            }
        }

        return target;
    }
}
