import { isAppStudio } from '@sap-ux/btp-utils';
import { isSameSystem } from '../utils';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { AuthenticationType } from '@sap-ux/store';
import { PromptState } from '../prompts/prompt-state';
import LoggerHelper from '../logger-helper';
import type { AbapServiceProvider, AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';
import type { DestinationAbapTarget, UrlAbapTarget } from '@sap-ux/system-access';
import type { BackendTarget, Credentials, SystemConfig } from '../types';
import type { AbapTarget } from '@sap-ux/ui5-config';

/**
 * Class to manage the ABAP service provider used during prompting.
 */
export class AbapServiceProviderManager {
    public static abapServiceProvider: AbapServiceProvider | undefined;
    private static system?: SystemConfig;

    /**
     * Get or create an ABAP service provider.
     *
     * @param backendTarget - backend target from prompt options
     * @param credentials - user credentials
     * @returns abap service provider
     */
    public static async getOrCreateServiceProvider(
        backendTarget?: BackendTarget,
        credentials?: Credentials
    ): Promise<AbapServiceProvider> {
        // 1. Use existing service provider
        if (this.isExistingServiceProviderValid()) {
            return this.abapServiceProvider as AbapServiceProvider;
        }

        // 2. Use connected service provider passed in prompt options with backend target
        if (this.isBackendTargetServiceProviderValid(backendTarget)) {
            this.abapServiceProvider = backendTarget?.serviceProvider as AbapServiceProvider;
            return this.abapServiceProvider;
        }

        // 3. Create a new service provider
        this.abapServiceProvider = await this.createNewServiceProvider(credentials);
        return this.abapServiceProvider;
    }

    /**
     * Ensures if there is existing service provider, that it matches with the system configuration used when it was created.
     *
     * @returns true if existing service provider is valid, otherwise false
     */
    private static isExistingServiceProviderValid(): boolean {
        if (
            this.abapServiceProvider &&
            isSameSystem(
                {
                    url: PromptState.abapDeployConfig.url,
                    client: PromptState.abapDeployConfig.client,
                    destination: PromptState.abapDeployConfig.destination
                },
                this.system?.url,
                this.system?.client,
                this.system?.destination
            )
        ) {
            this.system = {
                url: PromptState.abapDeployConfig.url,
                client: PromptState.abapDeployConfig.client,
                destination: PromptState.abapDeployConfig.destination
            };
            return true;
        }
        return false;
    }

    /**
     * Check if the backend target is valid. There are two scenarios where the backend target is valid:
     * 1. If the service provider (created during system selection) is connected to the same system as the backend target.
     * 2. The prompt state system configuration is empty, meaning the system prompts have not been used, then the backend target must be deemed valid.
     *
     * @param backendTarget
     * @returns true if service provider passed with the backend target is valid, otherwise false
     */
    private static isBackendTargetServiceProviderValid(backendTarget?: BackendTarget): boolean {
        if (
            backendTarget?.serviceProvider &&
            (isSameSystem(
                {
                    url: PromptState.abapDeployConfig.url,
                    client: PromptState.abapDeployConfig.client,
                    destination: PromptState.abapDeployConfig.destination
                },
                backendTarget?.abapTarget.url,
                backendTarget?.abapTarget.client,
                backendTarget?.abapTarget.destination
            ) ||
                (!PromptState.abapDeployConfig.url && !PromptState.abapDeployConfig.destination))
        ) {
            this.system = backendTarget?.abapTarget;
            return true;
        }
        return false;
    }

    /**
     * Create a new ABAP service provider using @sap-ux/system-access.
     *
     * @param credentials - user credentials
     * @returns abap service provider
     */
    private static async createNewServiceProvider(credentials?: Credentials): Promise<AbapServiceProvider> {
        const abapTarget: AbapTarget = this.buildAbapTarget();
        const requestOptions = this.buildRequestOptions(credentials);
        const serviceProvider = await createAbapServiceProvider(abapTarget, requestOptions, false, LoggerHelper.logger);

        this.system = {
            url: PromptState.abapDeployConfig.url,
            client: PromptState.abapDeployConfig.client,
            destination: PromptState.abapDeployConfig.destination
        };

        return serviceProvider;
    }

    /**
     * Build the ABAP target using the prompt state, containing the config assigned during system selection.
     *
     * @returns abap target
     */
    private static buildAbapTarget(): AbapTarget {
        let abapTarget: AbapTarget;
        if (isAppStudio()) {
            abapTarget = { destination: PromptState.abapDeployConfig.destination } as DestinationAbapTarget;
        } else {
            abapTarget = {
                url: PromptState.abapDeployConfig.url,
                client: PromptState.abapDeployConfig.client,
                scp: PromptState.abapDeployConfig.scp
            } as UrlAbapTarget;

            if (PromptState.abapDeployConfig.isS4HC) {
                abapTarget.authenticationType = AuthenticationType.ReentranceTicket;
            }
        }
        return abapTarget;
    }

    /**
     * Build the request options.
     *
     * @param credentials - user credentials
     * @returns request options
     */
    private static buildRequestOptions(credentials?: Credentials): AxiosRequestConfig & Partial<ProviderConfiguration> {
        let auth;
        if (credentials?.username && credentials?.password) {
            auth = {
                username: credentials.username,
                password: credentials.password
            };
        }

        return {
            ignoreCertErrors: false,
            auth
        };
    }

    /**
     * Clear the cached service provider.
     */
    public static deleteExistingServiceProvider(): void {
        this.abapServiceProvider = undefined;
    }
}
