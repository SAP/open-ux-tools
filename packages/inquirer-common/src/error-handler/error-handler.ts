import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import {
    Authentication,
    isAppStudio,
    isHTML5DynamicConfigured,
    isOnPremiseDestination,
    type Destination
} from '@sap-ux/btp-utils';
import { getHostEnvironment } from '@sap-ux/fiori-generator-shared';
import { type HostEnvironmentId } from '@sap-ux/fiori-generator-shared/src/types';
import {
    getHelpUrl,
    GUIDED_ANSWERS_ICON,
    GUIDED_ANSWERS_LAUNCH_CMD_ID,
    HELP_NODES,
    HELP_TREE
} from '@sap-ux/guided-answers-helper';
import { ToolsLogger, type Logger } from '@sap-ux/logger';
import type { AxiosError } from 'axios';
import { t } from '../i18n';
import { getTelemPropertyDestinationType, sendTelemetryEvent } from '../telemetry/telemetry';
import { ValidationLink } from '../types';

// Telemetry event names specific to odata service error handling
const telemEventGALinkCreated = 'GA_LINK_CREATED';
const telemBasError = 'SERVICE_INQUIRER_BAS_ERROR';

/**
 * Constants specific to error handling
 */
export enum ERROR_TYPE {
    AUTH = 'AUTH',
    AUTH_TIMEOUT = 'AUTH_TIMEOUT',
    REDIRECT = 'REDIRECT',
    CERT = 'CERT', // General cert error
    CERT_SELF_SIGNED = 'CERT_SELF_SIGNED',
    CERT_UKNOWN_OR_INVALID = 'CERT_UKNOWN_OR_INVALID',
    CERT_EXPIRED = 'CERT_EXPIRED',
    CERT_SELF_SIGNED_CERT_IN_CHAIN = 'CERT_SELF_SIGNED_CERT_IN_CHAIN',
    INVALID_SSL_CERTIFICATE = 'INVALID_SSL_CERTIFICATE',
    UNKNOWN = 'UNKNOWN',
    INVALID_URL = 'INVALID_URL',
    TIMEOUT = 'TIMEOUT',
    CONNECTION = 'CONNECTION',
    SERVICES_UNAVAILABLE = 'SERVICES_UNAVAILABLE', // All services
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // HTTP 503 Not related to odata services
    NO_ABAP_ENVS = 'NO_ABAP_ENVS',
    CATALOG_SERVICE_NOT_ACTIVE = 'CATALOG_SERVICE_NOT_ACTIVE',
    NO_SUCH_HOST = 'NO_SUCH_HOST',
    NOT_FOUND = 'NOT_FOUND',
    ODATA_URL_NOT_FOUND = 'ODATA_URL_NOT_FOUND',
    BAD_GATEWAY = 'BAD_GATEWAY', // Can be caused by either local issue or endpoint configuration,
    GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    DESTINATION_SERVICE_UNAVAILABLE = 'DESTINATION_SERVICE_UNAVAILABLE', // Caused by endpoint using a firewall or proxy
    DESTINATION_UNAVAILABLE = 'DESTINATION_UNAVAILABLE',
    DESTINATION_NOT_FOUND = 'DESTINATION_NOT_FOUND',
    DESTINATION_MISCONFIGURED = 'DESTINATION_MISCONFIGURED',
    NO_V2_SERVICES = 'NO_V2_SERVICES',
    NO_V4_SERVICES = 'NO_V4_SERVICES',
    BAD_REQUEST = 'BAD_REQUEST',
    DESTINATION_CONNECTION_ERROR = 'DESTINATION_CONNECTION_ERROR', // General destination connection error where a specific root cause cannot be determined e.g. In the case of an internal server error
    SERVER_HTTP_ERROR = 'SERVER_HTTP_ERROR'
}

// Used to match regex expressions to error messages, etc. providing a way to return a consistent
// single error and error msg for multiple errors
export const ERROR_MAP: Record<ERROR_TYPE, RegExp[]> = {
    [ERROR_TYPE.AUTH]: [
        /401/,
        /403/,
        /Incorrect credentials were provided to login/, // API Hub error msg
        /Unable to retrieve SAP Business Accelerator Hub key/ // API Hub error msg
    ],
    [ERROR_TYPE.AUTH_TIMEOUT]: [/UAATimeoutError/],
    [ERROR_TYPE.TIMEOUT]: [/Timeout/],
    [ERROR_TYPE.CERT]: [], // General cert error, unspecified root cause
    [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: [
        /UNABLE_TO_GET_ISSUER_CERT/,
        /UNABLE_TO_GET_ISSUER_CERT_LOCALLY/,
        /unable to get local issuer certificate/
    ],
    [ERROR_TYPE.CERT_EXPIRED]: [/CERT_HAS_EXPIRED/],
    [ERROR_TYPE.CERT_SELF_SIGNED]: [/DEPTH_ZERO_SELF_SIGNED_CERT/],
    [ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN]: [/SELF_SIGNED_CERT_IN_CHAIN/],
    [ERROR_TYPE.INVALID_SSL_CERTIFICATE]: [/526/, /Invalid SSL Certificate/], // Cloud Foundry and Cloudflare specific
    [ERROR_TYPE.UNKNOWN]: [],
    [ERROR_TYPE.CONNECTION]: [/ENOTFOUND/, /ECONNRESET/, /ECONNREFUSED/, /ConnectionError/],
    [ERROR_TYPE.SERVICES_UNAVAILABLE]: [],
    [ERROR_TYPE.SERVICE_UNAVAILABLE]: [/503/],
    [ERROR_TYPE.INVALID_URL]: [/Invalid URL/, /ERR_INVALID_URL/],
    [ERROR_TYPE.REDIRECT]: [/3\d\d/],
    [ERROR_TYPE.NO_ABAP_ENVS]: [],
    [ERROR_TYPE.CATALOG_SERVICE_NOT_ACTIVE]: [
        /\/IWBEP\/CM_V4_COS\/014/,
        /\/IWFND\/CM_V4_COS\/021/,
        /Service group '\/IWFND\/CONFIG' not published/
    ],
    [ERROR_TYPE.NO_SUCH_HOST]: [/no such host/],
    [ERROR_TYPE.NOT_FOUND]: [/404/],
    [ERROR_TYPE.ODATA_URL_NOT_FOUND]: [],
    [ERROR_TYPE.INTERNAL_SERVER_ERROR]: [/500/],
    [ERROR_TYPE.BAD_GATEWAY]: [/502/],
    [ERROR_TYPE.GATEWAY_TIMEOUT]: [/504/],
    [ERROR_TYPE.DESTINATION_SERVICE_UNAVAILABLE]: [],
    [ERROR_TYPE.DESTINATION_UNAVAILABLE]: [],
    [ERROR_TYPE.DESTINATION_NOT_FOUND]: [],
    [ERROR_TYPE.DESTINATION_MISCONFIGURED]: [],
    [ERROR_TYPE.NO_V2_SERVICES]: [],
    [ERROR_TYPE.NO_V4_SERVICES]: [],
    [ERROR_TYPE.BAD_REQUEST]: [/400/],
    [ERROR_TYPE.DESTINATION_CONNECTION_ERROR]: [],
    [ERROR_TYPE.SERVER_HTTP_ERROR]: [/5\d\d/] // catch all for 5xx server errors
};

type ValidationLinkOrString = string | ValidationLink;

/**
 * Maps errors to end-user messages using some basic root cause analysis based on regex matching.
 * This class will also log errors and provide help links for validation errors in some limited use cases.
 */
export class ErrorHandler {
    /** The last error message generated */
    private currentErrorMsg: string | null;
    /** The last error message type generated if determined */
    private currentErrorType: ERROR_TYPE | null;

    private static _guidedAnswersEnabled: boolean;

    private static _logger: Logger;

    /**
     * The current platform string to be reported in telemetry events. If not provided it will be determined from the environment.
     */
    private static _platform: HostEnvironmentId | undefined;

    /**
     * Get the current platform string that would be used by the error handler.
     *
     * @returns the platform string as defined by `HostEnvironmentId` or the value set by the user
     */
    public static get platform(): HostEnvironmentId | undefined {
        return ErrorHandler._platform;
    }
    /**
     * Set platform string usually defined by `HostEnvironmentId`
     *
     * @param value the platform string to set
     */
    public static set platform(value: HostEnvironmentId | undefined) {
        ErrorHandler._platform = value;
    }

    /**
     * The Guided Answers (help) trigger property sent with some telemetry events.
     */
    private static _guidedAnswersTrigger: string | undefined;

    /**
     * Get the Guided Answers (help) trigger property.
     *
     * @returns the Guided Answers trigger property
     */
    public static get guidedAnswersTrigger(): string | undefined {
        return ErrorHandler._guidedAnswersTrigger;
    }
    /**
     * Set the Guided Answers (help) trigger property.
     *
     * @param value the Guided Answers trigger property
     */
    public static set guidedAnswersTrigger(value: string | undefined) {
        ErrorHandler._guidedAnswersTrigger = value;
    }

    private static readonly getMessageFromError = (error: unknown): string => {
        return (
            (error as Error)?.message ||
            (error as AxiosError)?.status?.toString() ||
            (error as AxiosError)?.response?.status?.toString() ||
            (typeof error === 'string' ? error : JSON.stringify(error))
        );
    };

    /**
     * Get the localized error message for the specified server error.
     *
     * @param error the error object or message that was returned from the server (5xx)
     * @param subTextKey an i18next key used to provide additional context to the error message
     * @returns the localized error message
     */
    private static readonly serverErrorMessage = (error: Error | object | string | undefined, subTextKey?: string) =>
        t('errors.serverReturnedAnError', {
            errorDesc: subTextKey
                ? t(subTextKey, { errorMsg: ErrorHandler.getMessageFromError(error) })
                : ErrorHandler.getMessageFromError(error)
        });

    // Get the localized parameterized error message for the specified error type
    private static readonly _errorTypeToMsg: Record<ERROR_TYPE, (error?: Error | object | string) => string> = {
        [ERROR_TYPE.CERT]: (error) =>
            t('errors.certificateError', { errorMsg: ErrorHandler.getMessageFromError(error) }),
        [ERROR_TYPE.CERT_EXPIRED]: () =>
            t('errors.urlCertValidationError', { certErrorReason: t('texts.anExpiredCert') }),
        [ERROR_TYPE.CERT_SELF_SIGNED]: () =>
            t('errors.urlCertValidationError', {
                certErrorReason: t('texts.aSelfSignedCert')
            }),
        [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: () =>
            t('errors.urlCertValidationError', {
                certErrorReason: t('texts.anUnknownOrInvalidCert')
            }),
        [ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN]: () =>
            t('errors.urlCertValidationError', {
                certErrorReason: t('texts.anUntrustedRootCert')
            }),
        [ERROR_TYPE.INVALID_SSL_CERTIFICATE]: () =>
            t('errors.urlCertValidationError', {
                certErrorReason: t('texts.anUnknownOrInvalidCert')
            }),
        [ERROR_TYPE.AUTH]: (error) =>
            t('errors.authenticationFailed', {
                error: ErrorHandler.getMessageFromError(error)
            }),
        [ERROR_TYPE.AUTH_TIMEOUT]: () => t('errors.authenticationTimeout'),
        [ERROR_TYPE.TIMEOUT]: (error) => t('errors.timeout', { errorMsg: ErrorHandler.getMessageFromError(error) }),
        [ERROR_TYPE.INVALID_URL]: () => t('errors.invalidUrl'),
        [ERROR_TYPE.CONNECTION]: (error) =>
            t('errors.connectionError', {
                error: ErrorHandler.getMessageFromError(error)
            }),
        [ERROR_TYPE.UNKNOWN]: (error) =>
            t('errors.unknownError', {
                error: ErrorHandler.getMessageFromError(error)
            }),
        [ERROR_TYPE.SERVICES_UNAVAILABLE]: () => t('errors.servicesUnavailable'),
        [ERROR_TYPE.SERVICE_UNAVAILABLE]: (error) => ErrorHandler.serverErrorMessage(error),
        [ERROR_TYPE.CATALOG_SERVICE_NOT_ACTIVE]: () => t('errors.catalogServiceNotActive'),
        [ERROR_TYPE.INTERNAL_SERVER_ERROR]: (error) =>
            ErrorHandler.serverErrorMessage(error, 'errors.internalServerError'),
        [ERROR_TYPE.NOT_FOUND]: () => t('errors.urlNotFound'),
        [ERROR_TYPE.ODATA_URL_NOT_FOUND]: () => t('errors.odataServiceUrlNotFound'),
        [ERROR_TYPE.BAD_GATEWAY]: (error) => ErrorHandler.serverErrorMessage(error, 'errors.badGateway'),
        [ERROR_TYPE.DESTINATION_UNAVAILABLE]: () => t('errors.destination.unavailable'),
        [ERROR_TYPE.DESTINATION_NOT_FOUND]: () => t('errors.destination.notFound'),
        [ERROR_TYPE.DESTINATION_MISCONFIGURED]: (error) =>
            t('errors.destination.misconfigured', {
                destinationProperty: typeof error === 'string' ? error : ''
            }),
        [ERROR_TYPE.NO_V2_SERVICES]: () => t('errors.noServicesAvailable', { version: '2' }),
        [ERROR_TYPE.NO_V4_SERVICES]: () => t('errors.noServicesAvailable', { version: '4' }),
        [ERROR_TYPE.DESTINATION_SERVICE_UNAVAILABLE]: () => t('errors.destination.unavailable'),
        [ERROR_TYPE.REDIRECT]: () => t('errors.redirectError'),
        [ERROR_TYPE.NO_SUCH_HOST]: () => t('errors.noSuchHostError'),
        [ERROR_TYPE.NO_ABAP_ENVS]: () => t('errors.abapEnvsUnavailable'),
        [ERROR_TYPE.BAD_REQUEST]: (error) => ErrorHandler.serverErrorMessage(error, 'errors.badRequest'),
        [ERROR_TYPE.DESTINATION_CONNECTION_ERROR]: () => t('errors.systemConnectionValidationFailed'),
        [ERROR_TYPE.SERVER_HTTP_ERROR]: (error) => ErrorHandler.serverErrorMessage(error),
        [ERROR_TYPE.GATEWAY_TIMEOUT]: (error) => ErrorHandler.serverErrorMessage(error)
    };
    /**
     *
     * @param errorType
     * @param error can be any object that will get stringified and passed to the specific error message for the error type entry, e.g. where the error message is parameterized
     * @returns an error message for the specified error type
     */
    private static readonly _errorMsg = (errorType: ERROR_TYPE, error?: Error | object | string): string => {
        return ErrorHandler._errorTypeToMsg[errorType](error);
    };

    /**
     * Get the Guided Answers (help) node for the specified error type.
     *
     * @param errorType The error type for which a help node (help content id) may be returned
     * @returns The Guided Answers node for the specified error type
     */
    private static readonly getHelpNode = (errorType: ERROR_TYPE): number | undefined => {
        const isBAS = isAppStudio();
        const errorToHelp: Record<ERROR_TYPE, number | undefined> = {
            [ERROR_TYPE.SERVICES_UNAVAILABLE]: isBAS ? HELP_NODES.BAS_CATALOG_SERVICES_REQUEST_FAILED : undefined,
            [ERROR_TYPE.CERT]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.CERT_SELF_SIGNED]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.INVALID_SSL_CERTIFICATE]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.DESTINATION_MISCONFIGURED]: HELP_NODES.DESTINATION_MISCONFIGURED,
            [ERROR_TYPE.DESTINATION_UNAVAILABLE]: HELP_NODES.DESTINATION_UNAVAILABLE,
            [ERROR_TYPE.DESTINATION_NOT_FOUND]: HELP_NODES.DESTINATION_NOT_FOUND,
            [ERROR_TYPE.BAD_GATEWAY]: HELP_NODES.BAD_GATEWAY,
            [ERROR_TYPE.DESTINATION_SERVICE_UNAVAILABLE]: HELP_NODES.DESTINATION_SERVICE_UNAVAILBLE,
            [ERROR_TYPE.NO_V4_SERVICES]: HELP_NODES.NO_V4_SERVICES,
            [ERROR_TYPE.GATEWAY_TIMEOUT]: isBAS ? HELP_NODES.DESTINATION_GATEWAY_TIMEOUT : undefined,
            [ERROR_TYPE.AUTH]: undefined,
            [ERROR_TYPE.AUTH_TIMEOUT]: undefined,
            [ERROR_TYPE.REDIRECT]: undefined,
            [ERROR_TYPE.CERT_EXPIRED]: undefined,
            [ERROR_TYPE.UNKNOWN]: undefined,
            [ERROR_TYPE.INVALID_URL]: undefined,
            [ERROR_TYPE.CONNECTION]: undefined,
            [ERROR_TYPE.SERVICE_UNAVAILABLE]: undefined,
            [ERROR_TYPE.NO_ABAP_ENVS]: undefined,
            [ERROR_TYPE.CATALOG_SERVICE_NOT_ACTIVE]: undefined,
            [ERROR_TYPE.NO_SUCH_HOST]: undefined,
            [ERROR_TYPE.NOT_FOUND]: undefined,
            [ERROR_TYPE.ODATA_URL_NOT_FOUND]: undefined,
            [ERROR_TYPE.INTERNAL_SERVER_ERROR]: undefined,
            [ERROR_TYPE.NO_V2_SERVICES]: undefined,
            [ERROR_TYPE.TIMEOUT]: undefined,
            [ERROR_TYPE.BAD_REQUEST]: undefined,
            [ERROR_TYPE.DESTINATION_CONNECTION_ERROR]: HELP_NODES.DESTINATION_CONNECTION_ERRORS,
            [ERROR_TYPE.SERVER_HTTP_ERROR]: undefined
        };
        return errorToHelp[errorType];
    };

    /**
     * Find an error property for mapping to a general error type from most to least significant.
     *
     * @param error any type of error or object that has an error code, status, name or message
     * @returns a value that can be used to look up a general error type
     */
    private static readonly findErrorValueForMapping = (error: any) =>
        error.response?.data?.error?.code ||
        error.response?.status ||
        error.response?.data ||
        error.code ||
        (['TypeError', 'Error'].includes(error.name) ? error.message : error.name) || // For generic error types use the message otherwise the name is more relevant
        error.message ||
        error;

    /**
     * Create an instance of the ErrorHandler.
     *
     * @param logger the logger instance to use
     * @param enableGuidedAnswers if true, the end user validation errors will include guided answers to provide help
     */
    constructor(logger?: Logger, enableGuidedAnswers = false) {
        ErrorHandler._logger = logger ?? new ToolsLogger({ logPrefix: '@sap-ux/odata-service-inquirer' });
        ErrorHandler.guidedAnswersEnabled = enableGuidedAnswers;
    }

    /**
     * Get Guided Answers (context help) enabled value.
     *
     * @returns true if Guided Answers is enabled
     */
    public static get guidedAnswersEnabled(): boolean {
        return ErrorHandler._guidedAnswersEnabled;
    }

    /**
     * Toggle Guided Answers (context help) for validation errors.
     */
    public static set guidedAnswersEnabled(value: boolean) {
        ErrorHandler._guidedAnswersEnabled = value;
    }

    /**
     * Set the logger to be used for error messages.
     *
     * @param logger the logger instance to use
     */
    public static set logger(logger: Logger) {
        ErrorHandler._logger = logger;
    }

    /**
     * Get the logger used for error messages.
     *
     * @returns the logger instance
     */
    public static get logger() {
        return ErrorHandler._logger;
    }

    /**
     * Tests if the error is a general certificate error.
     *
     * @param status the error type
     * @returns true if the error is a general certificate error
     */
    public static isCertError(status: string | number): boolean {
        return [
            ERROR_TYPE.CERT,
            ERROR_TYPE.CERT_EXPIRED,
            ERROR_TYPE.CERT_SELF_SIGNED,
            ERROR_TYPE.CERT_UKNOWN_OR_INVALID,
            ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN
        ].includes(ErrorHandler.getErrorType(status));
    }

    /**
     * Get the error type for the specified error, mapping status code, error code, error name, error message to a few general error types.
     *
     * @param error the error, string or status code to get the type for
     * @returns the error type
     */
    public static getErrorType(error: string | number | Error): ERROR_TYPE {
        let errorValueToFind = error;
        if (error instanceof Error) {
            errorValueToFind = ErrorHandler.findErrorValueForMapping(error);
        }
        return Object.keys(ERROR_TYPE).find((errorCodeType) => {
            return ERROR_MAP[errorCodeType as ERROR_TYPE].find((exp: RegExp) => exp.test(errorValueToFind.toString()));
        }, {}) as ERROR_TYPE;
    }

    /**
     * Maps errors to a few generic types, log a detailed error.
     *
     * @param error If the error is a string this will be logged as is. Otherwise it will be mapped to a general error internally, possibly retained and logged.
     * @param userMsg If provided this will be set as the userErrorMsg instead of an error to msg map
     *  this allows a message more relevant to the context of where the error was generated to be used.
     * @param retainError Defaults to true to retain the error state.
     * @returns A user-friendly message for display in-line
     */
    public logErrorMsgs(error: unknown, userMsg?: string, retainError = true): string {
        let resolvedError: { errorMsg: string; errorType: ERROR_TYPE } = {
            errorMsg: '',
            errorType: ERROR_TYPE.UNKNOWN
        };

        // Overloaded to allow ERROR_TYPE for convenience
        if (Object.values(ERROR_TYPE).includes(error as ERROR_TYPE)) {
            const errorType = error as ERROR_TYPE;
            resolvedError.errorMsg = ErrorHandler.getErrorMsgFromType(errorType) ?? errorType.toString();
            resolvedError.errorType = errorType;
        } else if (typeof error === 'string') {
            resolvedError.errorMsg = error;
        } else {
            resolvedError = ErrorHandler.mapErrorToMsg(error);
        }
        ErrorHandler._logger.error(userMsg ? `${userMsg} ${resolvedError.errorMsg}` : resolvedError.errorMsg);
        if (retainError) {
            this.currentErrorMsg = userMsg ?? resolvedError.errorMsg;
            this.currentErrorType = resolvedError.errorType;
        }
        return resolvedError.errorMsg;
    }

    /**
     * Maps an error to a user-friendly message. The specified error may by a string (e.g. error message), number (e.g. status code), Error, or Axios error.
     *
     * @param error The error to map
     * @returns The mapped error message and error type
     */
    private static mapErrorToMsg(error: any): { errorMsg: string; errorType: ERROR_TYPE } {
        let errorType: ERROR_TYPE;
        if (Object.values(ERROR_TYPE).includes(error)) {
            errorType = error;
        } else {
            // Map error type using more to less specific information if available
            errorType = ErrorHandler.getErrorType(this.findErrorValueForMapping(error)) ?? ERROR_TYPE.UNKNOWN;
        }

        return {
            errorMsg: ErrorHandler._errorMsg(errorType, error),
            errorType
        };
    }

    /**
     * Used by validate functions to report in-line user friendly errors.
     * Checks if there is an existing error.
     *
     * @param error optional, if provided get the end user message that it maps to, otherwise get the previous error message, if a boolean is passed it will be interpreted as `reset`.
     * @param reset optional, resets the previous error state if true, if error is omitted reset may be passed as the first argument
     * @param fallback optional, return the message of the specified ERROR_TYPE if no previous end user message and no error specified
     * @returns The error message
     */
    public getErrorMsg(error?: any, reset?: boolean, fallback?: ERROR_TYPE): string | undefined {
        let errorMsg;
        if (error && typeof error !== 'boolean') {
            errorMsg = ErrorHandler.mapErrorToMsg(error).errorMsg;
        }
        // Get previous error message
        if (!errorMsg) {
            errorMsg = this.currentErrorMsg ?? (fallback ? ErrorHandler.getErrorMsgFromType(fallback) : undefined);
        }

        if (error === true || reset) {
            this.currentErrorMsg = null;
            this.currentErrorType = null;
        }

        return errorMsg;
    }

    /**
     * Used by validate functions to report in-line user friendly errors messages with help links.
     * If the error type is unknown, this will find a mapped error type and return the help (ValidationLink) if it exists.
     * If an error is not provided the current error state will be used. This does not log the message to the console.
     * If a system is provided, the error type may be refined to provide a more specific error message for the system which generatd the error.
     *
     * @param error optional, if provided get the help link message that it maps to, otherwise get the previously logged error message help link
     * @param reset optional, resets the previous error state if true
     * @param destination optional, if provided the destination may be used to determine a more relevant error message, specific to the system properties
     * @returns An instance of @see {ValidationLink}
     */
    public getValidationErrorHelp(
        error?: any,
        reset = false,
        destination?: Destination
    ): ValidationLinkOrString | undefined {
        let errorHelp: ValidationLinkOrString | undefined;
        let resolvedErrorMsg: string | undefined;
        let resolvedErrorType: ERROR_TYPE | undefined;

        if (error) {
            ({ errorMsg: resolvedErrorMsg, errorType: resolvedErrorType } = ErrorHandler.mapErrorToMsg(error));
        } else {
            // Use the existing error if we have it
            resolvedErrorMsg = this.currentErrorMsg ?? undefined;
            if (this.currentErrorType) {
                resolvedErrorType = this.currentErrorType;
            }
        }

        if (resolvedErrorType) {
            // If the destination is provided, we can refine the error type and therefore the generated help message, to be more specific
            if (destination) {
                const { errorType: destErrorType, errorMsg: destErrorMsg } = ErrorHandler.getDestinationSpecificError(
                    resolvedErrorType,
                    destination
                );
                resolvedErrorMsg = destErrorMsg ?? resolvedErrorMsg;
                resolvedErrorType = destErrorType ?? resolvedErrorType;
            }
            if (resolvedErrorType) {
                errorHelp = ErrorHandler.getHelpForError(resolvedErrorType, resolvedErrorMsg);
            }
        }

        if (reset) {
            this.currentErrorMsg = null;
            this.currentErrorType = null;
        }
        return errorHelp ?? resolvedErrorMsg; // We may not have a help link, so return the resolved end user message
    }
    /**
     * Get a more specific error type for the specified destination.
     *
     * @param errorType
     * @param destination
     * @returns
     */
    private static getDestinationSpecificError(
        errorType: ERROR_TYPE,
        destination: Destination
    ): { errorType?: ERROR_TYPE; errorMsg?: string } {
        let destErrorType: ERROR_TYPE | undefined;
        let destErrorMsg: string | undefined;
        // Add more specific error types for destinations here
        if (!isHTML5DynamicConfigured(destination)) {
            destErrorType = ERROR_TYPE.DESTINATION_MISCONFIGURED;
            destErrorMsg = this.getErrorMsgFromType(destErrorType, 'HTML5.DynamicDestination');
        } else if (errorType === ERROR_TYPE.SERVICE_UNAVAILABLE) {
            if (isOnPremiseDestination(destination)) {
                destErrorType = ERROR_TYPE.DESTINATION_SERVICE_UNAVAILABLE; // Remap to specific gateway to allow GA link to be associated
            } else {
                destErrorType = ERROR_TYPE.DESTINATION_CONNECTION_ERROR; // General destination connection error, GA link to connection page
            }
        } else if (errorType === ERROR_TYPE.NOT_FOUND) {
            destErrorType = ERROR_TYPE.DESTINATION_NOT_FOUND;
            destErrorMsg = this.getErrorMsgFromType(ERROR_TYPE.DESTINATION_NOT_FOUND);
        } else if (ERROR_TYPE.INTERNAL_SERVER_ERROR === errorType || ERROR_TYPE.SERVER_HTTP_ERROR === errorType) {
            destErrorType = ERROR_TYPE.DESTINATION_CONNECTION_ERROR;
        } else if (errorType === ERROR_TYPE.AUTH && destination.Authentication !== Authentication.NO_AUTHENTICATION) {
            // Auth errors for destinations are usually misconfiguration, unless the `Authentication` property is set to `NoAuthentication`
            destErrorMsg = this.getErrorMsgFromType(ERROR_TYPE.AUTH, t('texts.checkDestinationAuthConfig'));
        }
        // Always raise a telemetry event for destination related errors
        sendTelemetryEvent(telemBasError, {
            basErrorType: destErrorType ?? errorType,
            destODataType: getTelemPropertyDestinationType(destination),
            Platform: this._platform ?? getHostEnvironment().technical
        });
        return {
            errorType: destErrorType ?? errorType,
            errorMsg: destErrorMsg
        };
    }

    /**
     * Get the error message for the specified error type.
     *
     * @param errorType The error type for which the message may be returned
     * @param error optional, if provided may be used to get generate a more specific error message, or be included in the message
     * @returns The error message for the specified error type
     */
    public static getErrorMsgFromType(errorType: ERROR_TYPE, error?: any): string | undefined {
        if (ERROR_TYPE[errorType]) {
            return ErrorHandler._errorMsg(ERROR_TYPE[errorType], error);
        }
        return undefined;
    }

    /**
     * Checks if there is an existing error.
     *
     * @param reset - resets the current error state
     * @returns true if there is an existing error
     */
    public hasError(reset = false): boolean {
        const hasError = !!this.currentErrorMsg;
        if (reset) {
            this.currentErrorMsg = null;
            this.currentErrorType = null;
        }
        return hasError;
    }

    /**
     * Sets the current error state.
     *
     * @param errorType - the error type
     * @param error - the original error, if any
     */
    public setCurrentError(errorType: ERROR_TYPE, error?: any): void {
        this.currentErrorMsg = ErrorHandler._errorMsg(ERROR_TYPE[errorType], error);
        this.currentErrorType = errorType;
    }

    /**
     * Gets the current error type state.
     *
     * @param reset - resets the current error state
     * @returns The current error type
     */
    public getCurrentErrorType(reset = false): ERROR_TYPE | null {
        const currentErrorType = this.currentErrorType;
        if (reset) {
            this.currentErrorMsg = null;
            this.currentErrorType = null;
        }
        return currentErrorType;
    }

    /**
     * Maps an error type to a validation link if help (Guided Answers topic) is available for the specified error.
     * Otherwise the specified error message is returned. To retrieve the previous error state @see getValidationErrorHelp.
     * Use this (getHelpForError) if the error type is known.
     *
     * @param errorType - the error type to be mapped to help link
     * @param errorMsg - the message to appear with the help link
     * @returns A validation help link or help link message
     */
    public static getHelpForError(errorType: ERROR_TYPE, errorMsg?: string): ValidationLinkOrString | undefined {
        const helpNode = ErrorHandler.getHelpNode(errorType);
        const mappedErrorMsg = errorMsg ?? ErrorHandler.getErrorMsgFromType(errorType);

        if (helpNode && mappedErrorMsg) {
            return this.getHelpLink(helpNode, errorType, mappedErrorMsg);
        }
        return mappedErrorMsg;
    }

    /**
     * Get a help link for the specified help node.
     *
     * @param helpNode The help node to get the link for
     * @param errorType The error type
     * @param errorMsg The error message to display with the help link
     * @returns A validation help link
     */
    public static getHelpLink(helpNode: number, errorType: ERROR_TYPE, errorMsg: string): ValidationLink {
        const valLink: IValidationLink = {
            message: errorMsg,
            link: {
                text: t('guidedAnswers.validationErrorHelpText'),
                icon: GUIDED_ANSWERS_ICON,
                url: getHelpUrl(HELP_TREE.FIORI_TOOLS, [helpNode])
            }
        };

        if (this.guidedAnswersEnabled) {
            valLink.link.command = {
                id: GUIDED_ANSWERS_LAUNCH_CMD_ID,
                params: {
                    treeId: HELP_TREE.FIORI_TOOLS,
                    nodeIdPath: [helpNode],
                    trigger: this.guidedAnswersTrigger
                }
            };
        }
        // Report the GA link created event
        sendTelemetryEvent(telemEventGALinkCreated, {
            errorType,
            isGuidedAnswersEnabled: this.guidedAnswersEnabled,
            nodeIdPath: `${helpNode}`,
            Platform: this.platform ?? getHostEnvironment().technical
        });
        return new ValidationLink(valLink);
    }
}
