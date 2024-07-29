import { AtoService } from '@sap-ux/axios-extension';
import { t } from '../i18n';
import { deleteCachedServiceProvider, getOrCreateServiceProvider } from './abap-service-provider';
import { uniformAtoFormat } from '../utils';
import LoggerHelper from '../logger-helper';
import type { AtoSettings } from '@sap-ux/axios-extension';
import type { TransportConfig, InitTransportConfigResult, AbapDeployConfigPromptOptions, SystemConfig } from '../types';

/**
 * Dummy transport configuration.
 */
class DummyTransportConfig implements TransportConfig {
    /**
     * Returns the package.
     *
     * @returns string | undefined
     */
    getPackage(): string | undefined {
        return undefined;
    }
    /**
     * Returns the application prefix.
     *
     * @returns string | undefined
     */
    getApplicationPrefix(): string | undefined {
        return undefined;
    }
    /**
     * Returns whether transport is required.
     *
     * @returns boolean
     */
    isTransportRequired(): boolean {
        return false;
    }
    /**
     * Returns the transport.
     *
     * @returns string | undefined
     */
    getDefaultTransport(): string | undefined {
        return undefined;
    }
    /**
     * Returns the operations type.
     *
     * @returns string | undefined
     */
    getOperationsType(): string | undefined {
        return undefined;
    }
}

/**
 * Default transport configuration.
 */
class DefaultTransportConfig implements TransportConfig {
    private static readonly S4C_DEFAULT_TRANSPORT = '';
    private static readonly S4C_DEFAULT_PACKAGE = 'TEST_YY1_DEFAULT';

    /**
     * Returns the default transport.
     *
     * @returns string | undefined
     */
    getDefaultTransport(): string | undefined {
        return this.defaultTransport;
    }

    private atoSettings: AtoSettings = {};
    private defaultTransport: string | undefined = undefined;

    /**
     * Returns the development package.
     *
     * @returns string | undefined
     */
    public getPackage(): string | undefined {
        return this.atoSettings.developmentPackage;
    }

    /**
     * Returns the application prefix.
     *
     * @returns string | undefined
     */
    public getApplicationPrefix(): string | undefined {
        return this.atoSettings.developmentPrefix;
    }

    /**
     * Returns whether a transport request is required.
     *
     * @returns boolean
     */
    public isTransportRequired(): boolean {
        return !!this.atoSettings.isTransportRequestRequired;
    }

    /**
     * Returns the operations type.
     *
     * @returns string | undefined
     */
    public getOperationsType(): string | undefined {
        return this.atoSettings?.operationsType;
    }

    /**
     * Initialises the transport configuration.
     *
     * @param initParams - init transport config parameters
     * @param initParams.options - abap deploy config prompt options
     * @param initParams.systemConfig - system configuration
     * @returns init transport config result
     */
    public async init({
        options,
        systemConfig
    }: {
        options: AbapDeployConfigPromptOptions;
        systemConfig: SystemConfig;
    }): Promise<InitTransportConfigResult> {
        const result: InitTransportConfigResult = {};
        try {
            const provider = await getOrCreateServiceProvider(options, systemConfig);
            const atoService = await provider.getAdtService<AtoService>(AtoService);
            const atoSettings = await atoService?.getAtoInfo();

            if (atoSettings) {
                result.error = this.handleAtoResponse(atoSettings);
            }
        } catch (err) {
            await deleteCachedServiceProvider();
            if (err.response?.status === 401) {
                const auth: string = err.response.headers['www-authenticate'];

                if (auth?.toLowerCase()?.startsWith('basic')) {
                    result.transportConfigNeedsCreds = true;
                }
            } else {
                // Everything from network errors to service being inactive is a warning.
                // Will be logged and the user is allowed to move on
                // Business errors will be returned by the ATO response above and these act as hard stops
                result.warning = err?.toString();
                result.transportConfigNeedsCreds = false;
            }

            LoggerHelper.logger.debug(t('errors.debugAbapTargetSystem', { method: 'init', error: err.message }));
        }
        const initSuccessful = !result.error && !result.transportConfigNeedsCreds;
        // transportConfig is not initialised, so use dummy transport config
        result.transportConfig = initSuccessful ? this : this.getDummyConfig();

        return result;
    }

    /**
     * Checks the ATO response.
     *
     * @param response - ato settings
     * @returns error message or undefined
     */
    private handleAtoResponse(response: AtoSettings): string | undefined {
        let validationRequired = false;
        this.atoSettings = uniformAtoFormat(response);

        // Ignore ATO settings if these parameters are not met
        if (
            this.atoSettings.isConfigured &&
            this.atoSettings.tenantType === 'CUSTOMER' &&
            this.atoSettings.operationsType === 'C'
        ) {
            if (!this.atoSettings.isExtensibilityDevelopmentSystem) {
                return t('errors.s4SystemNoExtensible');
            }
            if (!this.atoSettings.developmentPrefix) {
                return t('errors.incorrectAtoSettings');
            }

            validationRequired = true;
            this.applyS4CDefaults();
        }

        // We only validate if it's a customer system with Cloud operations type
        if (!validationRequired) {
            this.atoSettings = { operationsType: this.atoSettings.operationsType };
        }
        return undefined; // No errors
    }

    /**
     * Applies the S/4HANA Cloud defaults.
     */
    private applyS4CDefaults(): void {
        this.defaultTransport = DefaultTransportConfig.S4C_DEFAULT_TRANSPORT;
        this.atoSettings.isTransportRequestRequired = false;
        this.atoSettings.developmentPackage = DefaultTransportConfig.S4C_DEFAULT_PACKAGE;
    }

    /**
     * Returns a dummy transport configuration.
     *
     * @returns dummy transport configuration
     */
    private getDummyConfig(): TransportConfig {
        const config = new DummyTransportConfig();
        // we still need to expose the ato settings operation type
        // this will be used to determine the default package i.e if on-prem (P) then default to $tmp
        config.getOperationsType = this.getOperationsType;
        return config;
    }
}

/**
 * Returns the transport configuration instance.
 *
 * @param transportConfigOptions - transport configuration options
 * @param transportConfigOptions.options - aba deploy config prompt options
 * @param transportConfigOptions.scp - scp
 * @param transportConfigOptions.systemConfig - system configuration
 * @returns transport configuration instance
 */
export async function getTransportConfigInstance({
    options,
    scp,
    systemConfig
}: {
    options: AbapDeployConfigPromptOptions;
    scp?: boolean;
    systemConfig: SystemConfig;
}): Promise<InitTransportConfigResult> {
    if (scp) {
        return { transportConfig: new DummyTransportConfig() };
    }

    return new DefaultTransportConfig().init({ options, systemConfig });
}
