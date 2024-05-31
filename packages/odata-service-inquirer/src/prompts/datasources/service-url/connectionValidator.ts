import { isAppStudio } from '@sap-ux/btp-utils';
import { ERROR_TYPE, ErrorHandler } from '../../../error-handler/error-handler';
import { errorHandler } from '../../prompt-helpers';
import { t } from '../../../i18n';
import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import https from 'https';
import LoggerHelper from '../../logger-helper';
import type { AxiosRequestConfig, ODataService, ProviderConfiguration } from '@sap-ux/axios-extension';
import { createServiceForUrl } from '@sap-ux/axios-extension';
import { SAP_CLIENT_KEY } from '../../../types';

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

// Cert errors than may be ignored by prompt user
const ignorableCertErrors = [ERROR_TYPE.CERT_SELF_SIGNED, ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN];

// set Axios default adapter to http which is desired for Node
// if window.XMLHttpRequest is set globally (possibly by external packages), incorrect xhr adapter will be used
// axios.defaults.adapter = 'http';

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
    private _axiosConfig: AxiosRequestConfig;
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
     * Calls a given service url to test its reachability and authentication requirements.
     *
     * @param url a service url (<protocol://<host>:<port>/<service-path>)
     * @param username optional username
     * @param password optional password
     * @param [ignoreCertError] optional, ignore some certificate errors
     * @returns the status code or error returned by the connection attempt
     */
    private async checkSapService(
        url: URL,
        username?: string,
        password?: string,
        ignoreCertError = false
    ): Promise<number | string> {
        const isBAS = isAppStudio();
        try {
            // Auto add trailing '/' to path
            url.pathname = !url.pathname?.endsWith('/') ? `${url.pathname}/` : url.pathname;

            // VSCode default extension proxy setting does not allow bypassing cert errors using httpsAgent (as used by Axios)
            // so we must use globalAgent to bypass cert validation
            if (ignoreCertError === true) {
                this.setRejectUnauthorized(!ignoreCertError);
            }

            const provideConfig: ProviderConfiguration = {
                ignoreCertErrors: ignoreCertError,
                cookies: ''
            };
            let axiosConfig: AxiosRequestConfig = {};

            if (username && password) {
                axiosConfig = {
                    auth: {
                        username,
                        password
                    }
                };
            }

            if (isBAS) {
                axiosConfig.params.saml2 = 'disabled';
            }

            this._axiosConfig = Object.assign(axiosConfig, provideConfig);
            this._odataService = createServiceForUrl(url.toString(), this._axiosConfig);
            LoggerHelper.attachAxiosLogger(this._odataService.interceptors);
            await this._odataService.get('');
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
            // Reset cert validation
            this.setRejectUnauthorized(true);
        }
    }

    /**
     * Validates the service url format as well as its reachability.
     *
     * @param serviceUrl the odata service url to validate
     * @param ignoreCertError ignore some certificate errors
     * @param forceReValidation force re-validation of the url
     * @returns true if the url is reachable, false if not, or an error message string
     */
    public async validateUrl(
        serviceUrl: string,
        ignoreCertError = false,
        forceReValidation = false
    ): Promise<boolean | string | IValidationLink> {
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
            const status = await this.checkSapService(url, undefined, undefined, ignoreCertError);
            LoggerHelper.logger.debug(`ConnectionValidator.validateUrl() - status: ${status}; url: ${serviceUrl}`);
            this.validity.urlFormat = true;
            this._validatedUrl = serviceUrl;

            if (status === 200) {
                this.validity.authenticated = true;
                this.validity.authRequired = false;
            } else if (status === 404) {
                this.validity.reachable = false;
                return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ODATA_URL_NOT_FOUND) ?? false;
            } else if (ErrorHandler.isCertError(status)) {
                this.validity.reachable = false;
                this.validity.canSkipCertError = ignorableCertErrors.includes(ErrorHandler.getErrorType(status));
                return errorHandler.getValidationErrorHelp(status, false) ?? false;
            } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.AUTH) {
                this.validity.authRequired = true;
            } else if (ErrorHandler.getErrorType(status) === ERROR_TYPE.REDIRECT) {
                return t('error.urlRedirect');
            } else if (status !== 404) {
                return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.CONNECTION, `http code: ${status}`) ?? false;
            }
            this.validity.reachable = status !== 404;
            return this.validity.reachable;
        } catch (error) {
            // More helpful context specific error
            if (ErrorHandler.getErrorType(error) === ERROR_TYPE.CONNECTION) {
                return errorHandler.logErrorMsgs(t('errors.serviceUrlNotFound', { url: serviceUrl }));
            }

            this.resetValidity();
            const errorMsg = errorHandler.getErrorMsg(error);
            return errorMsg ?? t('errors.invalidUrl');
        }
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
     * Tests whether basic auth is required for the specified url. If the url has already been validated, the previous result is returned.
     *
     * @param serviceUrl optional, the service url to validate, the previously validated url will be used if not provided
     * @param ignoreCertError optional, ignore some certificate errors
     * @returns true if basic auth is required, false if not, or log error message
     */
    public async isAuthRequired(serviceUrl = this._validatedUrl, ignoreCertError = false): Promise<boolean> {
        if (!serviceUrl) {
            return false;
        }

        if (this.validity.reachable === false || this.validity.authRequired === false) {
            return false;
        }
        if (this._validatedUrl === serviceUrl && this.validity.authRequired !== undefined) {
            return this.validity.authRequired;
        }
        try {
            const url = new URL(serviceUrl);
            const status = await this.checkSapService(url, undefined, undefined, ignoreCertError);
            this.validity.authRequired = ErrorHandler.getErrorType(status) === ERROR_TYPE.AUTH;
            return this.validity.authRequired;
        } catch (error) {
            errorHandler.logErrorMsgs(error);
            return false;
        }
    }

    /**
     * Test the connectivity with the specified service url using the provided credentials.
     *
     * @param serviceUrl optional, the service url to validate, the previously validated url will be used if not provided
     * @param username user name
     * @param password password
     * @param client optional, sap client code
     * @param ignoreCertError optional, ignore some certificate errors
     * @returns true if the authentication is successful, false if not, or an error message string
     */
    public async validateAuth(
        serviceUrl = this._validatedUrl,
        username: string,
        password: string,
        client?: string,
        ignoreCertError = false
    ): Promise<boolean | string> {
        if (!serviceUrl) {
            return false;
        }
        if (!this.validity.reachable) {
            return false;
        }
        try {
            const url = new URL(serviceUrl);
            if (client) {
                url.searchParams.append(SAP_CLIENT_KEY, client);
            }
            this.validity.authenticated =
                (await this.checkSapService(url, username, password, ignoreCertError)) === 200;
            return this.validity.authenticated === true ? true : t('errors.authenticationFailed');
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
    public setRejectUnauthorized(rejectUnauthorized: boolean): void {
        if (https.globalAgent.options) {
            https.globalAgent.options.rejectUnauthorized = rejectUnauthorized;
        }
        /* todo: When would this be used? 
        //@ts-expect-error - fallbackAgent is not in the types
        if (https.globalAgent.fallbackAgent) {
            //@ts-expect-error
            https.globalAgent.fallbackAgent.options.rejectUnauthorized = rejectUnauthorized;
        } */
    }
}
