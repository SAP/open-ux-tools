import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import type {
    AbapServiceProvider,
    AxiosError,
    AxiosRequestConfig,
    CatalogService,
    ODataService,
    ProviderConfiguration,
    ServiceProvider
} from '@sap-ux/axios-extension';
import { ODataVersion, create, createForAbap } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
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

type ValidationResult = string | boolean | IValidationLink;

// Cert errors that may be ignored by prompt user
const ignorableCertErrors = [ERROR_TYPE.CERT_SELF_SIGNED, ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN];

/**
 * Class that validates the connection to a service url or catalog url.
 * This will determine if authentication is required and if the service/catalog is reachable, generating messages to guide the user.
 * It is optimized for re-validation of the same url, so that the validation is not repeated if not required.
 *
 */
export class ConnectionValidator {
    public readonly validity: Validity = {};
    // The current valid url (not necessarily authenticated but the url is in a valid format)
    private _validatedUrl: string | undefined;
    // The current client code used for requests, the client code has been validated by a successful request
    private _validatedClient: string | undefined;

    private _odataService: ODataService;
    private _serviceProvider: ServiceProvider;
    private _axiosConfig: AxiosRequestConfig;
    private _catalogV2: CatalogService;
    private _catalogV4: CatalogService;
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
    public get odataService(): ODataService {
        return this._odataService;
    }

    /**
     * Get the catalogs for the odata versions. Note that one of these may not be defined where a specific odata version is required.
     *
     * @returns the catalog services for each the odata versions
     */
    public get catalogs(): Record<ODataVersion, CatalogService> {
        return {
            [ODataVersion.v2]: this._catalogV2,
            [ODataVersion.v4]: this._catalogV4
        };
    }

    /**
     *
     * @returns the current connections service provider
     */
    public get serviceProvider(): ServiceProvider {
        return this._serviceProvider;
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
    private async checkSapService(
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

            const axiosConfig: AxiosRequestConfig & ProviderConfiguration = this.createAxiosConfig(
                url,
                ignoreCertError,
                username,
                password
            );
            // If system, use catalog service to get the services info
            if (isSystem) {
                await this.createSystemConnection(axiosConfig, odataVersion);
            } else {
                // Full service URL
                await this.createServiceConnection(axiosConfig, url.pathname);
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
    ) {
        let axiosConfig: AxiosRequestConfig & ProviderConfiguration = {
            params: Object.fromEntries(url.searchParams),
            ignoreCertErrors: ignoreCertError,
            cookies: '',
            baseURL: url.origin
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
    private async createServiceConnection(axiosConfig: AxiosRequestConfig, servicePath: string) {
        this._axiosConfig = axiosConfig;
        this._serviceProvider = create(this._axiosConfig);
        this._odataService = this._serviceProvider.service(servicePath);
        LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);
        await this._odataService.get('');
    }

    /**
     * Create the connection for a system url. The system url should be provided as a base url axios config property.
     *
     * @param axiosConfig the axios request configuration
     * @param odataVersion the odata version to restrict the catalog requests if only a specific version is required
     */
    private async createSystemConnection(axiosConfig: AxiosRequestConfig, odataVersion?: ODataVersion) {
        this._axiosConfig = axiosConfig;
        this._serviceProvider = createForAbap(this._axiosConfig);
        LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);

        if (!odataVersion || odataVersion === ODataVersion.v2) {
            this._catalogV2 = (this._serviceProvider as AbapServiceProvider).catalog(ODataVersion.v2);
        }
        if (!odataVersion || odataVersion === ODataVersion.v4) {
            this._catalogV4 = (this._serviceProvider as AbapServiceProvider).catalog(ODataVersion.v4);
        }
        try {
            this._catalogV2 ? await this._catalogV2.listServices() : await this._catalogV4.listServices();
        } catch (error) {
            // We will try the v4 catalog if v2 returns a 404
            if ((error as AxiosError).response?.status === 404 && this._catalogV4) {
                await this._catalogV4.listServices();
            } else {
                throw error;
            }
        }
    }

    /**
     * Validates the service url format as well as its reachability.
     *
     * @param serviceUrl the odata service url to validate
     * @param options options for the connection validation
     * @param options.ignoreCertError ignore some certificate errors
     * @param options.forceReValidation force re-validation of the url even if the same url has been prevously validated
     * @param options.isSystem if true, the url will be treated as a system url rather than a service url
     * @param options.odataVersion if specified will restrict catalog requests to only the specified odata version
     * @returns true if the url is reachable, false if not, or an error message string
     */
    public async validateUrl(
        serviceUrl: string,
        {
            ignoreCertError = false,
            forceReValidation = false,
            isSystem = false,
            odataVersion
        }: {
            ignoreCertError?: boolean;
            forceReValidation?: boolean;
            isSystem?: boolean;
            odataVersion?: ODataVersion;
        } = {}
    ): Promise<ValidationResult> {
        if (this.isEmptyString(serviceUrl)) {
            this.resetValidity();
            return false;
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
            const status = await this.checkSapService(url, undefined, undefined, {
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
                return errorHandler.logErrorMsgs(t('errors.systemOrserviceUrlNotFound', { url: serviceUrl }));
            }

            this.resetValidity();
            const errorMsg = errorHandler.getErrorMsg(error);
            return errorMsg ?? t('errors.invalidUrl');
        }
    }

    /**
     * Translate the status code into a validation result.
     * Sets the instance validity state based on the status code.
     *
     * @param status a http request status code used to determine the validation result
     * @returns true if the url is reachable, false if not, or an error message string
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
     * This will also set the validity state for the url. This will not validate the URL.
     *
     * @param urlString - the url to validate, if not provided the previously validated url will be used
     * @param client - optional, sap client code, if not provided the previously validated client will be used
     * @param ignoreCertError
     * @returns true if basic auth is required, false if not
     */
    public async isAuthRequired(
        urlString = this._validatedUrl,
        client = this._validatedClient,
        ignoreCertError = false
    ): Promise<boolean> {
        if (!urlString) {
            return false;
        }

        // Dont re-request if already validated
        if (
            this._validatedUrl === urlString &&
            this._validatedClient === client &&
            this.validity.authRequired !== undefined
        ) {
            return this.validity.authRequired;
        }
        // New URL or client so we need to re-request
        try {
            const url = new URL(urlString);
            if (client) {
                url.searchParams.append(SAP_CLIENT_KEY, client);
            }
            this.validity.authRequired = this.validity.reachable =
                ErrorHandler.getErrorType(
                    await this.checkSapService(url, undefined, undefined, { ignoreCertError })
                ) === ERROR_TYPE.AUTH;

            return this.validity.authRequired;
        } catch (error) {
            errorHandler.logErrorMsgs(error);
            return false; // Cannot determine if auth required
        }
    }

    /**
     * Test the connectivity with the specified service url using the provided credentials.
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
            isSystem = false,
            sapClient,
            odataVersion
        }: { ignoreCertError?: boolean; isSystem?: boolean; odataVersion?: ODataVersion; sapClient?: string } = {}
    ): Promise<ValidationResult> {
        if (!url) {
            return false;
        }

        try {
            const urlObject = new URL(url);
            if (sapClient) {
                urlObject.searchParams.append(SAP_CLIENT_KEY, sapClient);
            }

            const status = await this.checkSapService(urlObject, username, password, {
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
            return errorHandler.getErrorMsg(error) ?? false;
        }
    }

    /**
     * Reset the validity state.
     */
    private resetValidity(): void {
        this.validity.urlFormat = false;
        delete this.validity.reachable;
        delete this.validity.authRequired;
        delete this.validity.authenticated;
        delete this.validity.canSkipCertError;
        this._validatedUrl = undefined;
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
