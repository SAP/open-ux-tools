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
    urlFormat?: boolean;
    reachable?: boolean;
    authRequired?: boolean;
    authenticated?: boolean;
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
    private _validatedUrl: string | undefined;
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
     * @param options
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
            // If system, use catalog service to get the services info
            if (isSystem) {
                await this.initSystemConnection(odataVersion, axiosConfig);
            } else {
                // Full service URL
                await this.initServiceConnection(url, axiosConfig);
            }

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

    private async initServiceConnection(url: URL, axiosConfig: AxiosRequestConfig) {
        this._axiosConfig = axiosConfig;
        this._serviceProvider = create(this._axiosConfig);
        this._odataService = this._serviceProvider.service(url.pathname);
        LoggerHelper.attachAxiosLogger(this._serviceProvider.interceptors);
        await this._odataService.get('');
    }

    private async initSystemConnection(odataVersion: ODataVersion | undefined, axiosConfig: AxiosRequestConfig) {
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
     * @param options
     * @param options.ignoreCertError ignore some certificate errors
     * @param options.forceReValidation force re-validation of the url
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
                return errorHandler.logErrorMsgs(t('errors.serviceUrlNotFound', { url: serviceUrl }));
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
            this.validity.authenticated = true;
            this.validity.authRequired = false;
        } else if (status === 404) {
            this.validity.reachable = false;
            return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NOT_FOUND) ?? false;
        } else if (ErrorHandler.isCertError(status)) {
            this.validity.reachable = true;
            this.validity.canSkipCertError = ignorableCertErrors.includes(ErrorHandler.getErrorType(status));
            return errorHandler.getValidationErrorHelp(status, false) ?? false;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.AUTH) {
            this.validity.reachable = true;
            this.validity.authRequired = true;
        } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.REDIRECT) {
            this.validity.reachable = true;
            return t('errors.urlRedirect');
        } else if (status !== 404) {
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
     * Test the connectivity with the specified service url using the provided credentials.
     *
     * @param url the url to validate
     * @param username user name
     * @param password password
     * @param options
     * @param options.ignoreCertError ignore some certificate errors
     * @param options.isSystem if true, the url will be treated as a system url rather than a service url
     * @param options.sapClient
     * @param options.odataVersion
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

            const valResult = this.getValidationResultFromStatusCode(status);

            if (valResult === true && this.validity.authenticated === true) {
                return true;
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
