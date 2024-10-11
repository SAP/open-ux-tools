import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
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
    isFullUrlDestination
} from '@sap-ux/btp-utils';
import https from 'https';
import { ERROR_TYPE, ErrorHandler } from '../error-handler/error-handler';
import { t } from '../i18n';
import { SAP_CLIENT_KEY } from '../types';
import LoggerHelper from './logger-helper';
import { errorHandler } from './prompt-helpers';

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

export type ValidationResult = string | boolean | IValidationLink;

// Cert errors that may be ignored by prompt user
const ignorableCertErrors = [ERROR_TYPE.CERT_SELF_SIGNED, ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN];

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
    // Only in the case of destination connections does this store the destination `url` value
    private _destinationUrl: string | undefined;
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
    // todo: private _isS4HanaCloud: boolean | undefined;

    private _refreshToken: string | undefined;
    /**
     * Getter for the axios configuration.
     *
     * @returns the axios configuration
     */
    public get axiosConfig(): AxiosRequestConfig {
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
     * Get the full destination url as defined in the destination configuration. This should not be used to connect from App Studio.
     *
     * @returns the connected destination 'URL' attribute value
     */
    public get destinationUrl(): string | undefined {
        return this._destinationUrl;
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
     */
    private async checkSapServiceUrl(
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
                ConnectionValidator.setGlobalRejectUnauthorized(!ignoreCertError);
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
            } else {
                // Full service URL
                await this.createOdataServiceConnection(axiosConfig, url.pathname);
            }
            this._validatedClient = url.searchParams.get(SAP_CLIENT_KEY) ?? undefined;
            return 200;
        } catch (e) {
            LoggerHelper.logger.debug(`ConnectionValidator.checkSapService() - error: ${e.message}`);
            if (e?.isAxiosError) {
                // Only throw for 500 on App Studio
                if (e?.response?.status === 500 && isBAS) {
                    throw e;
                }
                return e?.response?.status || e?.code;
            } else {
                throw e;
            }
        } finally {
            // Reset global cert validation
            ConnectionValidator.setGlobalRejectUnauthorized(true);
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
            url: url.pathname
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
        this._axiosConfig = axiosConfig;
        this._serviceProvider = create(this._axiosConfig);
        this._odataService = this._serviceProvider.service<ODataService>(servicePath);
        LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);
        await this._odataService.get('');
    }

    public resetConnectionState(): void {
        this._serviceProvider = undefined;
        this._odataService = undefined;
        this._catalogV2 = undefined;
        this._catalogV4 = undefined;
        this._serviceInfo = undefined;
        this._connectedUserName = undefined;
        this._refreshToken = undefined;
        this._connectedSystemName = undefined;
    }

    /**
     * Create the connection for a system url, the specified axios config or the specified service info.
     *
     * @param connectConfig the connection configuration
     * @param connectConfig.axiosConfig the axios request configuration
     * @param connectConfig.url the system url
     * @param connectConfig.serviceInfo the service info
     * @param connectConfig.odataVersion the odata version to restrict the catalog requests if only a specific version is required
     * @param connectConfig.destination
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
        // todo: Would it be better to return a boolean or string, calling getValidationResultFromStatusCode() and returning the result?
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
            this._axiosConfig = axiosConfig;
            this._serviceProvider = createForAbap(axiosConfig);
        }

        if (this._serviceProvider) {
            LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);
            //this._isS4HanaCloud = await (this._serviceProvider as AbapServiceProvider).isS4Cloud();
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
            // We will try the v4 catalog if v2 returns a 404 or an auth code. Try the v4 catalog with the credentials provided also
            // as the user may not be authorized for the v2 catalog specifically.
            if (
                this._catalogV4 &&
                !v4Requested &&
                this.shouldAttemptV4Catalog((error as AxiosError).response?.status)
            ) {
                await this._catalogV4.listServices();
            } else {
                throw error;
            }
        }
    }

    /**
     * Check if we should attempt to use the v4 catalog service as a fallback.
     *
     * @param statusCode http status code, if not provided will return false as we cannot determine the reason for v2 catalog request failure
     * @returns true if we should attempt the v4 catalog service
     */
    private shouldAttemptV4Catalog(statusCode?: number): boolean {
        if (!statusCode) {
            return false;
        }
        const errorType = ErrorHandler.getErrorType(statusCode);
        return errorType === ERROR_TYPE.NOT_FOUND || errorType === ERROR_TYPE.AUTH;
    }

    /**
     * Callback for when the refresh token changes.
     *
     * @param refreshToken the new refresh token
     */
    private async refreshTokenChangedCb(refreshToken?: string): Promise<void> {
        LoggerHelper.logger.debug(`ConnectionValidator.refreshTokenChangedCb()`);
        this._refreshToken = refreshToken;
    }

    /**
     * Get the service provider for the Abap on Cloud environment.
     *
     * @param url the system url
     * @param serviceInfo the service info
     * @returns the service provider
     */
    private getAbapOnCloudServiceProvider(url?: URL, serviceInfo?: ServiceInfo): AbapServiceProvider {
        if (this.systemAuthType === 'reentranceTicket' && url) {
            return createForAbapOnCloud({
                environment: AbapCloudEnvironment.EmbeddedSteampunk,
                url: new URL(url.pathname, url.origin).toString()
            });
        }

        if (this.systemAuthType === 'serviceKey' && serviceInfo) {
            return createForAbapOnCloud({
                environment: AbapCloudEnvironment.Standalone,
                service: serviceInfo,
                refreshTokenChangedCb: this.refreshTokenChangedCb.bind(this)
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
     * Validate the specified destination connectivity.
     *
     * @param destination the destination to validate
     * @param odataVersion the odata version to restrict the catalog requests if only a specific version is required
     * @returns @returns true if the system is reachable and authenticated, if required, false if not, or an error message string
     */
    public async validateDestination(
        destination: Destination,
        odataVersion?: ODataVersion
    ): Promise<{ valResult: ValidationResult; errorType?: ERROR_TYPE }> {
        try {
            // The only supported authentication mechanism for destinations set to Authentication 'NO_AUTHENTICATION' is basic (i.e. to the target Abap system)
            // So while we actually dont know we assume its basic for now since thats the only supported mechanism
            this.systemAuthType = destination.Authentication === Authentication.NO_AUTHENTICATION ? 'basic' : 'unknown';
            // Since a destination may be a system or a service connection, we need to determine the connection request (catalog or service)
            if (isFullUrlDestination(destination)) {
                this.resetConnectionState();
                this.resetValidity();
                const destUrl = getDestinationUrlForAppStudio(destination.Name);
                this._destinationUrl = destination.Host;
                const authRequired = await this.isAuthRequired(destUrl, destination['sap-client']);
                return {
                    valResult: authRequired ? ErrorHandler.getErrorMsgFromType(ERROR_TYPE.AUTH) ?? false : true,
                    errorType: authRequired ? ERROR_TYPE.AUTH : undefined
                };
            } else {
                await this.createSystemConnection({ destination, odataVersion });
            }
            return {
                valResult: this.getValidationResultFromStatusCode(200)
            };
        } catch (error) {
            //LoggerHelper.logger.debug(`ConnectionValidator.validateDestination() - error: ${error.message}`);
            if (error?.isAxiosError) {
                this.getValidationResultFromStatusCode(error?.response?.status || error?.code);
            }
            return {
                valResult: errorHandler.logErrorMsgs(error) ?? false,
                errorType: errorHandler.getCurrentErrorType() ?? ERROR_TYPE.CONNECTION
            };
        }
    }

    /**
     * Validates the system or service url format as well as its reachability.
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
        try {
            const url = new URL(serviceUrl);
            if (!forceReValidation && this.isUrlValidated(serviceUrl)) {
                return this.validity.reachable ?? false;
            }

            if (url.origin === 'null') {
                return t('errors.invalidUrl');
            }
            // Ignore path if a system url
            const status = await this.checkSapServiceUrl(url, undefined, undefined, {
                ignoreCertError,
                isSystem,
                odataVersion
            });
            LoggerHelper.logger.debug(`ConnectionValidator.validateUrl() - status: ${status}; url: ${serviceUrl}`);
            this.validity.urlFormat = true;
            this._validatedUrl = serviceUrl;

            return this.getValidationResultFromStatusCode(status);
        } catch (error) {
            // More helpful context specific error
            if (ErrorHandler.getErrorType(error) === ERROR_TYPE.CONNECTION) {
                this.validity.reachable = false;
                return errorHandler.logErrorMsgs(t('errors.systemOrServiceUrlNotFound', { url: serviceUrl }));
            }
            this.resetValidity();
            const errorMsg = errorHandler.getErrorMsg(error);
            return errorMsg ?? t('errors.invalidUrl');
        }
    }

    /**
     * Converts the http status code into 'validty' and returns true if the status code indicates that the URL was reachable.
     * Sets the instance validity state based on the status code.
     *
     * @param status a http request status code used to determine the validation result
     * @returns true, if the status code indicates the url is reachable, false if not, or an error message string
     */
    private getValidationResultFromStatusCode(status: string | number): boolean | string | IValidationLink {
        if (status === 200) {
            this.validity.reachable = true;
            this.validity.authenticated = true;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.NOT_FOUND) {
            this.validity.reachable = false;
            return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NOT_FOUND) ?? false;
        } else if (ErrorHandler.isCertError(status)) {
            this.validity.reachable = true;
            this.validity.canSkipCertError = ignorableCertErrors.includes(ErrorHandler.getErrorType(status));
            return errorHandler.getValidationErrorHelp(status, false) ?? false;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.AUTH) {
            this.validity.reachable = true;
            this.validity.authRequired = true;
            this.validity.authenticated = false;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.REDIRECT) {
            this.validity.reachable = true;
            return t('errors.urlRedirect');
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.CONNECTION) {
            this.validity.reachable = false;
            return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CONNECTION, `http code: ${status}`) ?? false;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.BAD_REQUEST) {
            this.validity.reachable = true;
            return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.BAD_REQUEST, `http code: ${status}`) ?? false;
        }
        this.validity.reachable = true;
        return true;
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
        this.resetValidity();
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
                ErrorHandler.getErrorType(
                    await this.checkSapServiceUrl(url, undefined, undefined, { ignoreCertError })
                ) === ERROR_TYPE.AUTH;

            // Only if we get the specific auth error so we know that auth is required, otherwise we cannot determine so leave as undefined
            if (authError) {
                this.validity.authRequired = true;
                this.validity.reachable = true;
            }
            // Since an exception was not thrown, this is a valid url (todo: retest all flows that use this since these 2 loc were added)
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
        username: string,
        password: string,
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
    ): Promise<ValidationResult> {
        if (!url) {
            return false;
        }
        try {
            const urlObject = new URL(url);
            if (sapClient) {
                urlObject.searchParams.append(SAP_CLIENT_KEY, sapClient);
            }

            this.systemAuthType = 'basic';
            const status = await this.checkSapServiceUrl(urlObject, username, password, {
                ignoreCertError,
                isSystem,
                odataVersion
            });
            LoggerHelper.logger.debug(`ConnectionValidator.validateUrl() - status: ${status}; url: ${url}`);
            // Since an exception was not thrown, this is a valid url
            this.validity.urlFormat = true;
            this._validatedUrl = url;

            const valResult = this.getValidationResultFromStatusCode(status);

            if (valResult === true) {
                if (this.validity.authenticated === true) {
                    return true;
                } else if (this.validity.authenticated === false) {
                    return t('errors.authenticationFailed');
                }
            }
            return valResult;
        } catch (error) {
            this.resetValidity();
            return errorHandler.getErrorMsg(error) ?? false;
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
    }

    /**
     * Set the rejectUnauthorized option of the global https agent.
     *
     * @param rejectUnauthorized - true to reject unauthorized certificates, false to accept them
     */
    public static setGlobalRejectUnauthorized(rejectUnauthorized: boolean): void {
        if (https.globalAgent.options) {
            https.globalAgent.options.rejectUnauthorized = rejectUnauthorized;
        }
        //@ts-expect-error - fallbackAgent is only present in BoundHttpsProxyAgent implementation and is not part of the Node.js API
        if (https.globalAgent.fallbackAgent) {
            //@ts-expect-error - fallbackAgent is not typed in Node.js API
            https.globalAgent.fallbackAgent.options.rejectUnauthorized = rejectUnauthorized;
        }
    }
}
