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
import { setGlobalRejectUnauthorized } from '@sap-ux/nodejs-utils';
import { t } from '../i18n';

/**
 * Class to manage the ABAP service provider used during prompting.
 */
export class AbapServiceProviderManager {
    private static abapServiceProvider: AbapServiceProvider | undefined;
    private static system: SystemConfig;
    private static isDefaultProviderAbapCloud: boolean | undefined;

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
        // Log the warning about NODE_TLS_REJECT_UNAUTHORIZED here so it is logged for both existing and new service providers (standalone new provider or connected provider)
        let ignoreCertErrors = false;
        if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
            LoggerHelper.logger.warn(t('warnings.allowingUnauthorizedCertsNode'));
            // Will only applied to new service providers, not existing ones. Passed service provider would be expected to have the cert setting already configured.
            ignoreCertErrors = true;
            setGlobalRejectUnauthorized(false);
        }
        // 1. Use existing service provider
        if (this.isExistingServiceProviderValid(backendTarget)) {
            return this.abapServiceProvider as AbapServiceProvider;
        }

        // 2. Use connected service provider passed in prompt options with backend target
        if (this.isBackendTargetServiceProviderValid(backendTarget)) {
            this.abapServiceProvider = backendTarget?.serviceProvider as AbapServiceProvider;
            await this.setIsDefaultAbapCloud();

            return this.abapServiceProvider;
        }
        // 3. Create a new service provider
        this.abapServiceProvider = await this.createNewServiceProvider(credentials, backendTarget, ignoreCertErrors);
        await this.setIsDefaultAbapCloud();

        return this.abapServiceProvider;
    }

    /**
     * Checks if the service provider has a valid connection.
     *
     * @returns true if the system is cloud and the service provider is connected
     */
    public static isConnected(): boolean {
        return !!AbapServiceProviderManager.abapServiceProvider?.cookies;
    }

    /**
     * Returns the system config from the prompt state or the backend target.
     *
     * @param backendTarget - backend target from prompt options
     * @returns - system config
     */
    private static getSystemConfig(backendTarget?: BackendTarget): SystemConfig {
        return {
            url: PromptState.abapDeployConfig.url ?? backendTarget?.abapTarget.url,
            client: PromptState.abapDeployConfig.client ?? backendTarget?.abapTarget.client,
            destination: PromptState.abapDeployConfig.destination ?? backendTarget?.abapTarget.destination
        };
    }

    /**
     * Ensures if there is existing service provider, that it matches with the system configuration used when it was created.
     *
     * @param backendTarget - backend target from prompt options
     * @returns true if existing service provider is valid, otherwise false
     */
    private static isExistingServiceProviderValid(backendTarget?: BackendTarget): boolean {
        const systemConfig = this.getSystemConfig(backendTarget);
        if (
            this.abapServiceProvider &&
            isSameSystem(systemConfig, this.system?.url, this.system?.client, this.system?.destination)
        ) {
            this.system = systemConfig;
            return true;
        }
        return false;
    }

    /**
     * Check if the backend target is valid. There are two scenarios where the backend target is valid:
     * 1. If the service provider (created during system selection) is connected to the same system as the backend target.
     * 2. The prompt state system configuration is empty, meaning the system prompts have not been used, then the backend target must be deemed valid.
     *
     * @param backendTarget - backend target from prompt options
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
     * @param backendTarget - backend target from prompt options
     * @param ignoreCertErrors
     * @returns abap service provider
     */
    private static async createNewServiceProvider(
        credentials?: Credentials,
        backendTarget?: BackendTarget,
        ignoreCertErrors: boolean = false
    ): Promise<AbapServiceProvider> {
        const abapTarget: AbapTarget = this.buildAbapTarget(backendTarget);
        const requestOptions = this.buildRequestOptions(credentials, ignoreCertErrors);
        const serviceProvider = await createAbapServiceProvider(abapTarget, requestOptions, false, LoggerHelper.logger);

        this.system = this.getSystemConfig(backendTarget);

        return serviceProvider;
    }

    /**
     * Build the ABAP target using the prompt state, containing the config assigned during system selection.
     *
     * @param backendTarget - backend target from prompt options
     * @returns abap target
     */
    private static buildAbapTarget(backendTarget?: BackendTarget): AbapTarget {
        let abapTarget: AbapTarget;
        if (isAppStudio()) {
            abapTarget = {
                destination: PromptState.abapDeployConfig.destination ?? backendTarget?.abapTarget.destination
            } as DestinationAbapTarget;
        } else {
            abapTarget = {
                url: PromptState.abapDeployConfig.url ?? backendTarget?.abapTarget.url,
                client: PromptState.abapDeployConfig.client ?? backendTarget?.abapTarget.client,
                scp: PromptState.abapDeployConfig.scp ?? backendTarget?.abapTarget.scp
            } as UrlAbapTarget;

            if (
                PromptState.abapDeployConfig.isAbapCloud ??
                backendTarget?.abapTarget.authenticationType === AuthenticationType.ReentranceTicket
            ) {
                abapTarget.authenticationType = AuthenticationType.ReentranceTicket;
            }
        }
        return abapTarget;
    }

    /**
     * Build the request options.
     *
     * @param credentials - user credentials
     * @param ignoreCertErrors
     * @returns request options
     */
    private static buildRequestOptions(
        credentials?: Credentials,
        ignoreCertErrors = false
    ): AxiosRequestConfig & Partial<ProviderConfiguration> {
        let auth;
        if (credentials?.username && credentials?.password) {
            auth = {
                username: credentials.username,
                password: credentials.password
            };
        }

        return {
            ignoreCertErrors,
            auth
        };
    }

    /**
     * Set if the default provider is AbapCloud.
     */
    private static async setIsDefaultAbapCloud(): Promise<void> {
        if (this.isDefaultProviderAbapCloud === undefined && this.abapServiceProvider) {
            this.isDefaultProviderAbapCloud = await this.abapServiceProvider?.isAbapCloud();
        }
    }

    /**
     * Retrieves the status of whether the default provider is an ABAP Cloud system.
     *
     * @returns {boolean|undefined} if the default provider is an ABAP Cloud system or not or undefined if the status is not set
     */
    public static getIsDefaultProviderAbapCloud(): boolean | undefined {
        return this.isDefaultProviderAbapCloud;
    }

    /**
     * Clear the cached is default provider abap cloud.
     */
    public static resetIsDefaultProviderAbapCloud(): void {
        this.isDefaultProviderAbapCloud = undefined;
    }

    /**
     * Clear the cached service provider.
     */
    public static deleteExistingServiceProvider(): void {
        this.abapServiceProvider = undefined;
    }
}
