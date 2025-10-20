import type {
    AbapServiceProvider,
    AxiosError,
    AxiosRequestConfig,
    CatalogService,
    ODataService,
    ProviderConfiguration,
    ServiceInfo,
    ServiceProvider
} from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    ODataVersion,
    create,
    createForAbap,
    createForAbapOnCloud,
    createForDestination
} from '@sap-ux/axios-extension';
import {
    Authentication,
    type Destination,
    getDestinationUrlForAppStudio,
    isAppStudio,
    isFullUrlDestination,
    isPartialUrlDestination
} from '@sap-ux/btp-utils';
import { setGlobalRejectUnauthorized } from '@sap-ux/nodejs-utils';
import { ERROR_TYPE, ErrorHandler } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import type { ConnectedSystem } from '../types';
import { SAP_CLIENT_KEY } from '../types';
import LoggerHelper from './logger-helper';
import { errorHandler } from './prompt-helpers';
import type { ValidationResult } from './types';

/**
 * Structure to store validity information about url to be validated.
 */
interface Validity {
    // True if the url is in a valid format
    urlFormat?: boolean;
    // True if the url is reachable
    reachable?: boolean;
    // True if the url requires authentication, i.e. returns a 401/403  (note even once authenticated, this will remain true)
    authRequired?: boolean;
    // True if the url is authenticated and accessible
    authenticated?: boolean;
    // True if the url has a cert error that can be skipped
    canSkipCertError?: boolean;
}

// Cert errors that may be ignored by the ignore cert errors prompt and NODE_TLS_REJECT_UNAUTHORIZED=0 setting
const ignorableCertErrors = [
    ERROR_TYPE.CERT_SELF_SIGNED,
    ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN,
    ERROR_TYPE.CERT_EXPIRED,
    ERROR_TYPE.CERT_UKNOWN_OR_INVALID,
    ERROR_TYPE.INVALID_SSL_CERTIFICATE
];

// Makes AxiosRequestConfig url properties required
interface AxiosExtensionRequestConfig extends AxiosRequestConfig {
    url: string;
    baseURL: string;
}
// System specific authentication mechanism, used to determine the connection auth type
export type SystemAuthType = 'serviceKey' | 'reentranceTicket' | 'basic' | 'unknown';
/**
 * Class that can be used to determine the connectivity using a service url, system url, or service info (UAA Key details) or reentrance ticket.
 * This will determine if if the service/catalog is reachable, authentication is required and generates ting messages to guide the user.
 * Certain types of certificate errors can be ignored if required. However, the end-user should be warned about the risks using a prompt message.
 * Catalog requests may be made multiple times for the same url, but the underlying connectivity module (@sap-ux/axios-extension) will cache the results to avoid repeated network requests.
 * The class also stores the current connection state, including the service provider, odata service, and catalog services.
 */
export class ConnectionValidator {
    public readonly validity: Validity = {};
    // The current valid url (not necessarily authenticated but the url is in a valid format), for destination connections this will be in the form: <protocol>://<destinationName>.dest
    private _validatedUrl: string | undefined;
    // Only in the case of destination connections does this store the destination `url` value, this is the fully expanded destination url and any user specified service paths
    private _destinationUrl: string | undefined;
    // The full destination object
    private _destination: Destination | undefined;
    // The current client code used for requests, the client code has been validated by a successful request
    private _validatedClient: string | undefined;

    private _odataService: ODataService | undefined;
    private _serviceProvider: ServiceProvider | undefined;
    private _axiosConfig: AxiosExtensionRequestConfig & ProviderConfiguration;
    private _catalogV2: CatalogService | undefined;
    private _catalogV4: CatalogService | undefined;
    private _systemAuthType: SystemAuthType | undefined;
    private _serviceInfo: ServiceInfo | undefined;
    private _connectedUserName: string | undefined;
    private _connectedSystemName: string | undefined;
    private _refreshToken: string | undefined;
    // For the current validated URL connection attempts will ignore cert errors
    private _ignoreCertError: boolean | undefined;

    /**
     * Get the ignoreCertError value.
     *
     * @returns the ignoreCertError value, true indicates that cert errors may have been ignored
     */
    public get ignoreCertError(): boolean | undefined {
        return this._ignoreCertError;
    }

    /**
     * Getter for the axios configuration.
     *
     * @returns the axios configuration
     */
    public get axiosConfig(): AxiosRequestConfig & ProviderConfiguration {
        return this._axiosConfig;
    }

    /**
     * Get the odata service instance.
     *
     * @returns the odata service instance
     */
    public get odataService(): ODataService | undefined {
        return this._odataService;
    }

    /**
     * Get the catalogs for the odata versions. Note that one of these may not be defined where a specific odata version is required.
     *
     * @returns the catalog services for each the odata versions
     */
    public get catalogs(): Record<ODataVersion, CatalogService | undefined> {
        return {
            [ODataVersion.v2]: this._catalogV2,
            [ODataVersion.v4]: this._catalogV4
        };
    }

    /**
     *
     * @returns the current connections service provider
     */
    public get serviceProvider(): ServiceProvider | undefined {
        return this._serviceProvider;
    }

    /**
     * The auth type used to create an authenticated connection to the system.
     *
     * @returns the system auth type
     */
    public get systemAuthType(): SystemAuthType | undefined {
        return this._systemAuthType;
    }
    /**
     * The auth type used to create an authenticated connection to the system.
     *
     * @param value the system auth type
     */
    public set systemAuthType(value: SystemAuthType) {
        this._systemAuthType = value;
    }

    /**
     * Get the validated url. This is the url that has been successfully validated (not necessarily connected). Use validity to check if the url is reachable.
     *
     * @returns the validated url
     */
    public get validatedUrl(): string | undefined {
        return this._validatedUrl;
    }

    /**
     * Get the validated client code. This is the client code that has been successfully validated by a request.
     *
     * @returns the validated client code
     */
    public get validatedClient(): string | undefined {
        return this._validatedClient;
    }

    /**
     * Get the service info used to connect to the system.
     *
     * @returns the service info
     */
    public get serviceInfo(): ServiceInfo | undefined {
        return this._serviceInfo;
    }

    /**
     * Set the service info used to connect to the system.
     *
     * @param serviceInfo the service info
     */
    public set serviceInfo(serviceInfo: ServiceInfo) {
        this._serviceInfo = serviceInfo;
    }

    /**
     * Get the connected user name.
     *
     * @returns the connected user name
     */
    public get connectedUserName(): string | undefined {
        return this._connectedUserName;
    }

    /**
     * Get the refresh token.
     *
     * @returns the refresh token
     */
    public get refreshToken(): string | undefined {
        return this._refreshToken;
    }

    /**
     * Get the full expanded destination url as defined in the destination configuration. This should not be used to connect from App Studio (use the .dest form).
     *
     * @returns the connected destination 'URL' attribute value
     */
    public get destinationUrl(): string | undefined {
        return this._destinationUrl;
    }

    /**
     * Get the  destination.
     *
     * @returns the connected destination 'URL' attribute value
     */
    public get destination(): Destination | undefined {
        return this._destination;
    }

    /**
     * Get the connected system name. If previously set this will be used, otherwise the name is determined
     * by the system auth type, or the validated url.
     *
     * @returns the connected system name
     */
    public get connectedSystemName(): string | undefined {
        if (this._connectedSystemName) {
            return this._connectedSystemName;
        }

        if (this.systemAuthType === 'serviceKey') {
            return this.serviceInfo?.systemid;
        }
        return this.validatedUrl;
    }
    /**
     *
     */
    public set connectedSystemName(value: string | undefined) {
        this._connectedSystemName = value;
    }

    /**
     * Setting an existing connected system will prevent re-authentication.
     * This should be used where the user has previously authenticated to prevent re-authentication (e.g. via browser) and the previous
     * connected system is still valid. Only Abap connected backend systems are currently supported for cached connection use.
     * For non-Abap backend systems, or basic auth connections, the user will be prompted to re-authenticate.
     *
     * @param connectedSystem A connected system object containing the service provider and backend system information. Not relevant for destination connections.
     * @param connectedSystem.serviceProvider
     * @param connectedSystem.backendSystem
     */
    public setConnectedSystem({ serviceProvider, backendSystem }: ConnectedSystem): void {
        // Set the state using the provided ConnectedSystem to prevent re-authentication if this is a valid AbapServiceProvider connection only
        if (!(serviceProvider as AbapServiceProvider).catalog) {
            LoggerHelper.logger.debug(
                'ConnectionValidator.setConnectedSystem(): Use of a cached connected system is only supported for AbapServiceProviders. Re-authorization will be required.'
            );
            return;
        }
        this._serviceProvider = serviceProvider;
        this._catalogV2 = (this._serviceProvider as AbapServiceProvider).catalog(ODataVersion.v2);
        this._catalogV4 = (this._serviceProvider as AbapServiceProvider).catalog(ODataVersion.v4);
        this._validatedUrl = (backendSystem?.serviceKeys as ServiceInfo)?.url ?? backendSystem?.url;
        this._connectedUserName = backendSystem?.userDisplayName;
        this._validatedClient = backendSystem?.client;
        this._refreshToken = backendSystem?.refreshToken;
        this._serviceInfo = backendSystem?.serviceKeys as ServiceInfo;
        this.validity.authenticated = true;
        this.validity.reachable = true;
        this.validity.urlFormat = true;
        this.validity.authRequired = true;
        // Do we need to explictly set the ignore cert error flag with an existing connection or are we calling checkUrl() again?

        if (backendSystem?.authenticationType === 'reentranceTicket') {
            this.systemAuthType = 'reentranceTicket';
        } else if (backendSystem?.serviceKeys) {
            this.systemAuthType = 'serviceKey';
        } else {
            this.systemAuthType = 'basic';
        }
    }

    /**
     * Calls a given service or system url to test its reachability and authentication requirements.
     * If the url is a system url, it will attempt to use the catalog service to get the service info.
     *
     * @param url a service url (<protocol://<host>:<port>/<service-path>) or a system url (<protocol://<host>:<port>)
     * @param username optional username
     * @param password optional password
     * @param options options for the connection validation
     * @param options.ignoreCertError ignore some certificate errors
     * @param options.isSystem if true, the url will be treated as a system url rather than a service url
     * @param options.odataVersion if specified will restrict catalog requests to only the specified odata version
     * @returns the status code or error returned by the connection attempt
     * @throws an error if the connection attempt fails and the error is a 500 on App Studio or a non-axios error is caught
     */
    private async checkUrl(
        url: URL,
        username?: string,
        password?: string,
        {
            ignoreCertError = false,
            isSystem = false,
            odataVersion
        }: { ignoreCertError?: boolean; isSystem?: boolean; odataVersion?: ODataVersion } = {}
    ): Promise<number | string> {
        const isBAS = isAppStudio();
        try {
            // Auto add trailing '/' to path
            url.pathname = !url.pathname?.endsWith('/') ? `${url.pathname}/` : url.pathname;

            // VSCode default extension proxy setting does not allow bypassing cert errors using httpsAgent (as used by Axios)
            // so we must use globalAgent to bypass cert validation
            if (ignoreCertError === true) {
                setGlobalRejectUnauthorized(!ignoreCertError);
            }
            if (isBAS) {
                url.searchParams.append('saml2', 'disabled');
            }

            const axiosConfig: AxiosExtensionRequestConfig & ProviderConfiguration = this.createAxiosConfig(
                url,
                ignoreCertError,
                username,
                password
            );

            if (isSystem) {
                await this.createSystemConnection({ axiosConfig, url, odataVersion });
                const systemInfo = await (this.serviceProvider as AbapServiceProvider).getSystemInfo();
                this._connectedUserName = systemInfo?.userName;
                this._connectedSystemName = systemInfo?.systemID;
            } else {
                // Full service URL
                await this.createOdataServiceConnection(axiosConfig, url.pathname);
            }
            this._validatedClient = url.searchParams.get(SAP_CLIENT_KEY) ?? undefined;
            return 200;
        } catch (e) {
            LoggerHelper.logger.debug(`ConnectionValidator.checkUrl() - error: ${e.message}`);
            if (e?.isAxiosError) {
                // Error handling for BAS specific 500 errors
                if (e?.response?.status.toString().match(/5\d\d/) && isBAS) {
                    throw e;
                }
                return e?.response?.status || e?.code;
            } else {
                throw e;
            }
        }
    }

    /**
     * Create the axios configuration object for the service or system connection.
     *
     * @param url the service or system url
     * @param ignoreCertError if true the config will be set to ignore cert errors
     * @param username provided for basic authentication
     * @param password provided for basic authentication
     * @returns the axios configuration object
     */
    private createAxiosConfig(
        url: URL,
        ignoreCertError: boolean,
        username: string | undefined,
        password: string | undefined
    ): AxiosExtensionRequestConfig & ProviderConfiguration {
        let axiosConfig: AxiosExtensionRequestConfig & ProviderConfiguration = {
            params: Object.fromEntries(url.searchParams),
            ignoreCertErrors: ignoreCertError,
            cookies: '',
            baseURL: url.origin,
            url: url.pathname,
            logger: LoggerHelper.logger
        };

        if (username && password) {
            axiosConfig = Object.assign(axiosConfig, {
                auth: {
                    username,
                    password
                }
            });
        }
        return axiosConfig;
    }

    /**
     * Create the connection for a service url. The base url should be provided with the axios config property.
     *
     * @param axiosConfig the axios request configuration
     * @param servicePath the service path without the origin
     */
    private async createOdataServiceConnection(
        axiosConfig: AxiosExtensionRequestConfig & ProviderConfiguration,
        servicePath: string
    ): Promise<void> {
        if (await this.shouldIgnoreCertError(axiosConfig)) {
            this._ignoreCertError = true;
            axiosConfig.ignoreCertErrors = true;
            setGlobalRejectUnauthorized(false);
        }
        this._axiosConfig = axiosConfig;
        this._serviceProvider = create(this._axiosConfig);
        this._odataService = this._serviceProvider.service<ODataService>(servicePath);
        LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);
        await this._odataService.get('');
    }

    /**
     * Resets any connection state and validity information.
     *
     * @param resetValidity if true, the validity information will be reset also
     */
    public resetConnectionState(resetValidity = false): void {
        this._serviceProvider = undefined;
        this._odataService = undefined;
        this._catalogV2 = undefined;
        this._catalogV4 = undefined;
        this._serviceInfo = undefined;
        this._connectedUserName = undefined;
        this._refreshToken = undefined;
        this._connectedSystemName = undefined;
        this._ignoreCertError = undefined;

        if (resetValidity) {
            this.resetValidity();
        }
    }

    /**
     * When the env has set `NODE_TLS_REJECT_UNAUTHORIZED=0` we make an intial request to check for cert errors.
     * We log these errors to the console so the user is informed of the risks.
     *
     * @param axiosConfig the axios request configuration for Abap on prem connection
     * @param odataVersion the odata version to restrict the catalog requests if only a specific version is required
     * @returns true if the cert error should be ignored based on the environment setting `NODE_TLS_REJECT_UNAUTHORIZED=0`
     */
    private async shouldIgnoreCertError(
        axiosConfig: AxiosRequestConfig & ProviderConfiguration,
        odataVersion?: ODataVersion
    ): Promise<boolean> {
        LoggerHelper.logger.debug(`ConnectionValidator.shouldIgnoreCertError() - url: ${axiosConfig.baseURL}`);

        let shouldIgnoreCertError = false;
        const nodeAllowBadCerts = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
        if (nodeAllowBadCerts) {
            try {
                const odataVerCatalog =
                    !odataVersion || odataVersion === ODataVersion.v2 ? ODataVersion.v2 : ODataVersion.v4;
                const abapProvider = createForAbap(axiosConfig);
                LoggerHelper.attachAxiosLogger(abapProvider.interceptors);
                await abapProvider.catalog(odataVerCatalog).listServices();
            } catch (error) {
                const errorType = ErrorHandler.getErrorType(error?.response?.status ?? error?.code);
                if (error?.isAxiosError && ignorableCertErrors.includes(errorType)) {
                    LoggerHelper.logger.warn(
                        t('warnings.certificateErrors', { url: axiosConfig?.baseURL, error: errorType })
                    );
                    LoggerHelper.logger.warn(t('warnings.allowingUnauthorizedCertsNode'));
                    shouldIgnoreCertError = true;
                }
            }
        }
        return shouldIgnoreCertError;
    }

    /**
     * Create the connection for a system url, the specified axios config or the specified service info.
     *
     * @param connectConfig the connection configuration
     * @param connectConfig.axiosConfig the axios request configuration
     * @param connectConfig.url the system url
     * @param connectConfig.serviceInfo the service info
     * @param connectConfig.odataVersion the odata version to restrict the catalog requests if only a specific version is required
     * @param connectConfig.destination the destination to connect with
     * @throws an error if the connection attempt fails, callers should handle the error
     */
    private async createSystemConnection({
        axiosConfig,
        url,
        serviceInfo,
        destination,
        odataVersion
    }: {
        axiosConfig?: AxiosExtensionRequestConfig & ProviderConfiguration;
        url?: URL;
        serviceInfo?: ServiceInfo;
        destination?: Destination;
        odataVersion?: ODataVersion;
    }): Promise<void> {
        this.resetConnectionState();
        this.resetValidity();

        if (this.systemAuthType === 'reentranceTicket' || this.systemAuthType === 'serviceKey') {
            this._serviceProvider = this.getAbapOnCloudServiceProvider(url, serviceInfo);
        } else if (destination) {
            // Assumption: the destination configured URL is a valid URL, will be needed later for basic auth error handling
            this._validatedUrl = getDestinationUrlForAppStudio(destination.Name);
            this._destinationUrl = destination.Host;
            this._serviceProvider = createForDestination({}, destination);
        } else if (axiosConfig) {
            // Abap-on-prem on VSCode specific handling of cert errors from system connections.
            // Make an additional request to log any cert errors that we are going to ignore so the user is informed of the risks.
            if (await this.shouldIgnoreCertError(axiosConfig, odataVersion)) {
                this._ignoreCertError = true;
                axiosConfig.ignoreCertErrors = true;
                setGlobalRejectUnauthorized(false);
            }
            this._axiosConfig = axiosConfig;
            this._serviceProvider = createForAbap(axiosConfig);
        }

        if (this._serviceProvider) {
            LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);
        }

        if (!odataVersion || odataVersion === ODataVersion.v2) {
            this._catalogV2 = (this._serviceProvider as AbapServiceProvider).catalog(ODataVersion.v2);
        }
        if (!odataVersion || odataVersion === ODataVersion.v4) {
            this._catalogV4 = (this._serviceProvider as AbapServiceProvider).catalog(ODataVersion.v4);
        }
        let v4Requested = false;
        try {
            if (this._catalogV2) {
                await this._catalogV2?.listServices();
            } else if (this._catalogV4) {
                v4Requested = true;
                await this._catalogV4?.listServices();
            }
        } catch (error) {
            await this.handleCatalogError(error, v4Requested);
        }
    }

    /**
     * Determine if a v4 catalog request should be made based on the specified error and if the error originated from a v2 or v4 catalog request.
     * If the error originated from a v2 catalog request and it is of type 401/403/404 then we try the v4 catalog.
     * If the v4 catalog request fails, for any reason, and the v2 catalog request failed with 401/403 we will throw that (401/403) error,
     * ultimately resulting in a basic auth prompt for the end-user.
     * Otherwise the v4 catalog request error is thrown, which may also be a 401/403, again resulting in a basic auth prompt and re-validation.
     * If both catalogs have returned 404 nothing else can be done, the error is thrown and reported.
     *
     * @param error - an error returned from either a v2 or v4 catalog listServices request.
     * @param v4Requested - has the v4 catalog been requested
     */
    private async handleCatalogError(error: unknown, v4Requested: boolean): Promise<void> {
        const statusCode = (error as AxiosError).response?.status;
        const errorType = statusCode ? ErrorHandler.getErrorType(statusCode) : undefined;

        // Try the v4 catalog with the credentials provided
        // as the user may not be authorized for the v2 catalog specifically.
        const shouldFallbackToV4 =
            statusCode && !v4Requested && (errorType === ERROR_TYPE.NOT_FOUND || errorType === ERROR_TYPE.AUTH);

        if (this._catalogV4 && shouldFallbackToV4) {
            // The v2 catalog was not available therefore cert errors will not have been seen (hidden by 404), only abap on prem uses axiosConfig directly
            if (this._axiosConfig && (await this.shouldIgnoreCertError(this._axiosConfig, ODataVersion.v4))) {
                this._ignoreCertError = true;
                setGlobalRejectUnauthorized(false);
                this._axiosConfig = {
                    ...this._axiosConfig,
                    ignoreCertErrors: true
                };
                // Re-create the service provider with the updated config
                this._serviceProvider = createForAbap(this._axiosConfig);
                this._catalogV4 = (this._serviceProvider as AbapServiceProvider).catalog(ODataVersion.v4);
                LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);
            }
            try {
                await this._catalogV4.listServices();
            } catch (v4Error) {
                // if original error was of type auth, throw it so the consumer can handle it accordingly e.g show basic auth prompts
                if (errorType === ERROR_TYPE.AUTH) {
                    throw error;
                }
                throw v4Error;
            }
        } else {
            // Either the v2 or v4 catalog request failed for a specific odata version, or both failed where no odata verison was specified
            // Do some root cause analysis to determine the end user help message
            throw error;
        }
    }

    /**
     * Callback for when the Abap cloud system refresh token changes.
     *
     * @param refreshToken the new refresh token
     */
    private async refreshTokenChangedCb(refreshToken?: string): Promise<void> {
        LoggerHelper.logger.debug(`ConnectionValidator.refreshTokenChangedCb()`);
        this._refreshToken = refreshToken;
    }

    /**
     * Get the service provider for the Abap Cloud environment.
     *
     * @param url the system url
     * @param serviceInfo the service info
     * @param refreshToken
     * @returns the service provider
     */
    private getAbapOnCloudServiceProvider(
        url?: URL,
        serviceInfo?: ServiceInfo,
        refreshToken?: string
    ): AbapServiceProvider {
        if (this.systemAuthType === 'reentranceTicket' && url) {
            return createForAbapOnCloud({
                environment: AbapCloudEnvironment.EmbeddedSteampunk,
                url: new URL(url.pathname, url.origin).toString(),
                logger: LoggerHelper.logger
            });
        }

        if (this.systemAuthType === 'serviceKey' && serviceInfo) {
            return createForAbapOnCloud({
                environment: AbapCloudEnvironment.Standalone,
                service: serviceInfo,
                refreshToken,
                refreshTokenChangedCb: this.refreshTokenChangedCb.bind(this),
                logger: LoggerHelper.logger
            });
        }

        throw new Error('Invalid system auth type');
    }

    /**
     * Validate the system connectivity with the specified service info (containing UAA details).
     * This will create a connection to the system, updating the service provider reference.
     * The connected user name will be cached for later use.
     *
     * @param serviceInfo the service info containing the UAA details
     * @param odataVersion the odata version to restrict the catalog requests if only a specific version is required
     * @returns true if the system is reachable and authenticated, if required, false if not, or an error message string
     */
    public async validateServiceInfo(serviceInfo: ServiceInfo, odataVersion?: ODataVersion): Promise<ValidationResult> {
        if (!serviceInfo) {
            return false;
        }
        // If we are already authenticated and the url is the same, no need to re-authenticate as this may result in a browser based authentication
        if (
            serviceInfo.url === this.validatedUrl &&
            JSON.stringify(serviceInfo.uaa) === JSON.stringify(this.serviceInfo?.uaa)
        ) {
            return this.getValidationResultFromStatusCode(200);
        }
        try {
            this.systemAuthType = 'serviceKey';
            await this.createSystemConnection({ serviceInfo, odataVersion });
            // Cache the user info
            this._connectedUserName = await (this.serviceProvider as AbapServiceProvider).user();
            this._serviceInfo = serviceInfo;
            this._validatedUrl = serviceInfo.url;
            return this.getValidationResultFromStatusCode(200);
        } catch (error) {
            LoggerHelper.logger.debug(`ConnectionValidator.validateServiceInfo() - error: ${error.message}`);
            if (error?.isAxiosError) {
                this.getValidationResultFromStatusCode(error?.response?.status || error?.code);
            }
            return errorHandler.getErrorMsg(error) ?? false;
        }
    }

    /**
     * Validate the specified destination connectivity, determining if authentication is required or if the destination is misconfigured.
     *
     * @param destination the destination to validate
     * @param odataVersion the odata version to restrict the catalog requests if only a specific version is required
     * @param servicePath the service path to validate, if specified will be appended to the destination URL for validation, if not specified the destination url will be used
     * @returns true if the system is reachable and authenticated, if required, false if not, or an error message string
     */
    public async validateDestination(
        destination: Destination,
        odataVersion?: ODataVersion,
        servicePath?: string
    ): Promise<{ valResult: ValidationResult; errorType?: ERROR_TYPE }> {
        try {
            // The only supported authentication mechanism for destinations set to Authentication 'NO_AUTHENTICATION' is basic (i.e. to the target Abap system)
            // So while we actually dont know we assume its basic for now since thats the only supported mechanism
            this.systemAuthType = destination.Authentication === Authentication.NO_AUTHENTICATION ? 'basic' : 'unknown';
            // Since a destination may be a system or a service connection, we need to determine the connection request (catalog or service)
            if (isFullUrlDestination(destination) || isPartialUrlDestination(destination)) {
                return await this.validateOdataServiceDestination(destination, servicePath);
            } else {
                await this.createSystemConnection({ destination, odataVersion });
            }
            return {
                valResult: this.getValidationResultFromStatusCode(200)
            };
        } catch (error) {
            if (error?.isAxiosError) {
                this.getValidationResultFromStatusCode(error?.response?.status || error?.code);
            }
            // Log the network error
            const errorLog = errorHandler.logErrorMsgs(error);
            // Return a more helpful error message
            return {
                valResult: errorHandler.getValidationErrorHelp(error, false, destination) ?? errorLog,
                errorType: errorHandler.getCurrentErrorType() ?? ERROR_TYPE.DESTINATION_CONNECTION_ERROR
            };
        }
    }

    /**
     * Validate the connectivity to a destination odata service (for generic odata service destinations), determining, for example, if authentication is required.
     *
     * @param destination a destination that is a generic odata service destination
     * @param servicePath additional service path to append to the destination URL
     * @param requiredOdataVersion the required odata version, if specified will validate the odata service version satisfies the specified version
     * @returns validation result and error type if validation fails
     */
    private async validateOdataServiceDestination(
        destination: Destination,
        servicePath?: string,
        requiredOdataVersion?: ODataVersion
    ): Promise<{ valResult: ValidationResult; errorType?: ERROR_TYPE }> {
        this.resetConnectionState();
        this.resetValidity();
        // Get the destination URL in the BAS specific form <protocol>://<destinationName>.dest. This function lowercases the origin.
        const destUrl = getDestinationUrlForAppStudio(destination.Name.toLowerCase(), servicePath);
        // Get the destination URL in the portable form <protocol>://<host>:<port>.
        // We remove trailing slashes (up to 10, infinite would allow DOS attack) from the host to avoid double slashes when appending the service path.
        this._destinationUrl = servicePath
            ? destUrl.replace(
                  `https://${destination.Name.toLowerCase()}.dest`,
                  destination.Host.replace(/\/{1,10}$/, '')
              )
            : destination.Host;
        this._destination = destination;
        // No need to apply sap-client as this happens automatically (from destination config) when going through the BAS proxy
        const status = await this.checkUrl(new URL(destUrl), undefined, undefined, {
            odataVersion: requiredOdataVersion
        });

        const validationResult = this.getValidationResultFromStatusCode(status);

        if (this.validity.reachable) {
            this._validatedUrl = destUrl;
        }

        if (!this.validity.reachable) {
            // Log the error
            const errorLog = errorHandler.logErrorMsgs(status);
            return {
                valResult: errorHandler.getValidationErrorHelp(status, false, destination) ?? errorLog,
                errorType: errorHandler.getCurrentErrorType() ?? ERROR_TYPE.DESTINATION_CONNECTION_ERROR
            };
        }
        if (this.validity.authRequired) {
            return {
                valResult: ErrorHandler.getErrorMsgFromType(
                    ERROR_TYPE.AUTH,
                    destination.Authentication !== Authentication.NO_AUTHENTICATION
                        ? t('texts.checkDestinationAuthConfig')
                        : undefined
                )!,
                errorType: ERROR_TYPE.AUTH
            };
        }
        return {
            valResult: validationResult
        };
    }

    /**
     * Validates an odata service url format as well as its reachability. Note if this function returns true, this is only an indication that the system is reachable
     * not that a connection has been established. The connection may require separate authentication or other steps (it may be reachable but a cert error was returned).
     *
     * @param serviceUrl the url to validate, may be a system or service url.
     *     Note that if systemAuthType is specified, the url will be treated as a system url (only the origin will be considered)
     * @param options options for the connection validation
     * @param options.ignoreCertError ignore some certificate errors
     * @param options.forceReValidation force re-validation of the url
     * @param options.isSystem if true, the url will be treated as a system url rather than a service url, this value is retained for subsequent calls
     * @param options.odataVersion if specified will restrict catalog requests to only the specified odata version
     * @param options.systemAuthType the system auth type used to create system connections, if not specified or `isSystem` is false or undefined, `basic` is assumed
     * @returns true if the url is reachable, false if not, or an error message string
     */
    public async validateUrl(
        serviceUrl: string,
        {
            ignoreCertError = false,
            forceReValidation = false,
            isSystem = false,
            odataVersion,
            systemAuthType
        }: {
            ignoreCertError?: boolean;
            forceReValidation?: boolean;
            isSystem?: boolean;
            odataVersion?: ODataVersion;
            systemAuthType?: SystemAuthType;
        } = {}
    ): Promise<ValidationResult> {
        if (this.isEmptyString(serviceUrl)) {
            this.resetValidity();
            this.validity.urlFormat = false;
            return false;
        }
        if (systemAuthType) {
            this.systemAuthType = systemAuthType;
        }
        let url: URL;
        try {
            // Check if the url is valid
            url = new URL(serviceUrl);
            if (url.origin === 'null') {
                return t('errors.invalidUrl', { input: serviceUrl });
            }
            // Dont allow non origin URLs in for re-entrance tickets as the error handling would become complex to analyize.
            // The connection may succeed but later we will get auth errors since axios-extension does not validate this.
            // The new system name would also include the additional paths which would not make sense either.
            if (this.systemAuthType === 'reentranceTicket' && !(url.pathname.length === 0 || url.pathname === '/')) {
                return t('prompts.validationMessages.reentranceTicketSystemHostOnly');
            }
        } catch (error) {
            return t('errors.invalidUrl', { input: serviceUrl });
        }

        try {
            if (!forceReValidation && this.isUrlValidated(serviceUrl)) {
                return this.validity.reachable ?? false;
            } else {
                // New URL so reset the validity
                this.resetValidity();
            }
            // Ignore path if a system url
            const status = await this.checkUrl(url, undefined, undefined, {
                ignoreCertError,
                isSystem,
                odataVersion
            });
            LoggerHelper.logger.debug(`ConnectionValidator.validateUrl() - status: ${status}; url: ${serviceUrl}`);
            this.validity.urlFormat = true;
            this._validatedUrl = serviceUrl;

            return this.getValidationResultFromStatusCode(status);
        } catch (error) {
            this.resetValidity();
            // More helpful context specific error
            if (ErrorHandler.getErrorType(error) === ERROR_TYPE.CONNECTION) {
                this.validity.reachable = false;
                return errorHandler.logErrorMsgs(t('errors.systemOrServiceUrlNotFound', { url: serviceUrl }));
            }
            const errorMsg = errorHandler.getErrorMsg(error);
            return errorMsg ?? error.message;
        }
    }

    /**
     * Sets the instance validity state based on the status code and returns true if the status code indicates that the URL was reachable.
     *
     * @param status a http request status code used to determine the validation result
     * @returns true, if the status code indicates the url is reachable, false if not, or an error message string
     */
    private getValidationResultFromStatusCode(status: string | number): ValidationResult {
        if (status === 200) {
            this.validity.reachable = true;
            this.validity.authenticated = true;
            return true;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.NOT_FOUND) {
            this.validity.reachable = false;
            return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NOT_FOUND) ?? false;
        } else if (ErrorHandler.isCertError(status)) {
            this.validity.reachable = true;
            this.validity.canSkipCertError = ignorableCertErrors.includes(ErrorHandler.getErrorType(status));
            this.validity.authenticated = false;
            return errorHandler.getValidationErrorHelp(status, false) ?? false;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.AUTH) {
            this.validity.reachable = true;
            this.validity.authRequired = true;
            this.validity.authenticated = false;
            return true;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.REDIRECT) {
            this.validity.reachable = true;
            return t('errors.urlRedirect');
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.CONNECTION) {
            this.validity.reachable = false;
            return (
                ErrorHandler.getErrorMsgFromType(
                    ERROR_TYPE.CONNECTION,
                    t('texts.httpStatus', { httpStatus: status })
                ) ?? false
            );
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.BAD_REQUEST) {
            this.validity.reachable = true;
            return (
                ErrorHandler.getErrorMsgFromType(
                    ERROR_TYPE.BAD_REQUEST,
                    t('texts.httpStatus', { httpStatus: status })
                ) ?? false
            );
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.BAD_GATEWAY) {
            this.validity.reachable = false;
            return (
                ErrorHandler.getErrorMsgFromType(
                    ERROR_TYPE.BAD_GATEWAY,
                    t('texts.httpStatus', { httpStatus: status })
                ) ?? false
            );
        }
        this.validity.reachable = true;
        return (
            ErrorHandler.getErrorMsgFromType(
                ErrorHandler.getErrorType(status),
                t('texts.httpStatus', { httpStatus: status })
            ) ?? true
        );
    }

    /**
     * Is a string nil or whitespace only.
     *
     * @param url the string to test
     * @returns true if the string is nil or whitespace
     */
    private isEmptyString(url: string): boolean {
        return !url || url.trim().length === 0;
    }

    /**
     * Tests if the url has already been validated.
     *
     * @param url the full url to test for previous validation
     * @returns true if the url has already been validated
     */
    private isUrlValidated(url: string): boolean {
        if (this._validatedUrl === url) {
            return true;
        }
        return false;
    }

    /**
     * Check whether basic auth is required for the given url, or for the previously validated url if none specified.
     * This will also set the validity state for the url.
     *
     * @param urlString the url to validate, if not provided the previously validated url will be used
     * @param client optional, sap client code, if not provided the previously validated client will be used
     * @param ignoreCertError ignore some certificate errors
     * @returns true if basic auth is required, false if not
     */
    public async isAuthRequired(
        urlString = this._validatedUrl,
        client = this._validatedClient,
        ignoreCertError = false
    ): Promise<boolean | undefined> {
        if (!urlString) {
            return false;
        }

        // Dont re-request if we have already determined the auth requirement or we are authenticated
        if (this._validatedUrl === urlString && this._validatedClient === client) {
            if (this.validity.authenticated) {
                return false;
            }
            if (this.validity.authRequired !== undefined) {
                return this.validity.authRequired;
            }
            // Not determined yet, continue
        }

        // New URL or client so we need to re-request
        try {
            const url = new URL(urlString);
            if (client) {
                url.searchParams.append(SAP_CLIENT_KEY, client);
            }
            const authError =
                ErrorHandler.getErrorType(await this.checkUrl(url, undefined, undefined, { ignoreCertError })) ===
                ERROR_TYPE.AUTH;

            // Only if we get the specific auth error so we know that auth is required, otherwise we cannot determine so leave as undefined
            if (authError) {
                this.validity.authRequired = true;
                this.validity.reachable = true;
            }
            // Since an exception was not thrown, this is a valid url
            this.validity.urlFormat = true;
            this._validatedUrl = urlString;
            return this.validity.authRequired;
        } catch (error) {
            errorHandler.logErrorMsgs(error);
            return false; // Cannot determine if auth required
        }
    }

    /**
     * Test the connectivity with the specified service url using the provided credentials (basic authentication).
     *
     * @param url the url to validate
     * @param username user name
     * @param password password
     * @param options options for the connection authentication validation
     * @param options.ignoreCertError ignore some certificate errors
     * @param options.isSystem if true, the url will be treated as a system url rather than a service url
     * @param options.sapClient the sap client to use for the connection
     * @param options.odataVersion if specified will restrict catalog requests to only the specified odata version
     * @returns true if the authentication is successful, false if not, or an error message string
     */
    public async validateAuth(
        url: string,
        username?: string,
        password?: string,
        {
            ignoreCertError = false,
            sapClient,
            odataVersion,
            isSystem = false
        }: {
            ignoreCertError?: boolean;
            odataVersion?: ODataVersion;
            sapClient?: string;
            isSystem?: boolean;
        } = {}
    ): Promise<{ valResult: ValidationResult; errorType?: ERROR_TYPE }> {
        if (!url) {
            return { valResult: false };
        }
        try {
            const urlObject = new URL(url);
            if (sapClient) {
                urlObject.searchParams.append(SAP_CLIENT_KEY, sapClient);
            }

            this.systemAuthType = 'basic';
            const status = await this.checkUrl(urlObject, username, password, {
                ignoreCertError: ignoreCertError,
                isSystem,
                odataVersion
            });
            LoggerHelper.logger.debug(`ConnectionValidator.validateAuth() - status: ${status}; url: ${url}`);
            // Since an exception was not thrown, this is a valid url
            this.validity.urlFormat = true;
            this._validatedUrl = url;

            const valResult = this.getValidationResultFromStatusCode(status);

            if (valResult === true) {
                if (this.validity.authenticated === true) {
                    this._connectedUserName = username;
                    return { valResult: true };
                } else if (this.validity.authenticated === false) {
                    return { valResult: t('errors.authenticationFailed'), errorType: ERROR_TYPE.AUTH };
                }
            }
            return { valResult };
        } catch (error) {
            return {
                valResult:
                    errorHandler.getValidationErrorHelp(error, false, this.destination) ??
                    errorHandler.getErrorMsg(error) ??
                    t('errors.unknownError'),
                errorType: errorHandler.getCurrentErrorType() ?? undefined
            };
        }
    }

    /**
     * Reset the validity state.
     */
    private resetValidity(): void {
        delete this.validity.urlFormat;
        delete this.validity.reachable;
        delete this.validity.authRequired;
        delete this.validity.authenticated;
        delete this.validity.canSkipCertError;
        this._validatedUrl = undefined;
        this._destinationUrl = undefined;
        this._destination = undefined;
    }
}
