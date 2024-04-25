import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import { isAppStudio } from '@sap-ux/btp-utils';
import { type Logger, ToolsLogger } from '@sap-ux/logger';
import { t } from '../i18n';
import { PLATFORMS, ValidationLink } from '../types';
import { getPlatform, sendTelemetryEvent } from '../utils';
import { getHelpUrl, GUIDED_ANSWERS_LAUNCH_CMD_ID, HELP_NODES, HELP_TREE } from './help/help-topics';
import { GUIDED_ANSWERS_ICON } from './help/images';

const teleEventGALinkCreated = 'GA_LINK_CREATED';

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
    UNKNOWN = 'UNKNOWN',
    INVALID_URL = 'INVALID_URL',
    CONNECTION = 'CONNECTION',
    SERVICES_UNAVAILABLE = 'SERVICES_UNAVAILABLE', // All services
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // Specific service
    NO_ABAP_ENVS = 'NO_ABAP_ENVS',
    CATALOG_SERVICE_NOT_ACTIVE = 'CATALOG_SERVICE_NOT_ACTIVE',
    NO_SUCH_HOST = 'NO_SUCH_HOST',
    NOT_FOUND = 'NOT_FOUND',
    ODATA_URL_NOT_FOUND = 'ODATA_URL_NOT_FOUND',
    BAD_GATEWAY = 'BAD_GATEWAY', // Can be caused by either local issue or endpoint configuration
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    DESTINATION_BAD_GATEWAY_503 = 'DESTINATION_BAD_GATEWAY_503', // Caused by endpoint using a firewall or proxy
    DESTINATION_UNAVAILABLE = 'DESTINATION_UNAVAILABLE',
    DESTINATION_NOT_FOUND = 'DESTINATION_NOT_FOUND',
    DESTINATION_MISCONFIGURED = 'DESTINATION_MISCONFIGURED',
    NO_V2_SERVICES = 'NO_V2_SERVICES',
    NO_V4_SERVICES = 'NO_V4_SERVICES'
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
    [ERROR_TYPE.CERT]: [], // General cert error, unspecified root cause
    [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: [
        /UNABLE_TO_GET_ISSUER_CERT/,
        /UNABLE_TO_GET_ISSUER_CERT_LOCALLY/,
        /unable to get local issuer certificate/
    ],
    [ERROR_TYPE.CERT_EXPIRED]: [/CERT_HAS_EXPIRED/],
    [ERROR_TYPE.CERT_SELF_SIGNED]: [/DEPTH_ZERO_SELF_SIGNED_CERT/],
    [ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN]: [/SELF_SIGNED_CERT_IN_CHAIN/],
    [ERROR_TYPE.UNKNOWN]: [],
    [ERROR_TYPE.CONNECTION]: [/ENOTFOUND/, /ECONNRESET/, /ECONNREFUSED/],
    [ERROR_TYPE.SERVICES_UNAVAILABLE]: [],
    [ERROR_TYPE.SERVICE_UNAVAILABLE]: [/503/],
    [ERROR_TYPE.INVALID_URL]: [/Invalid URL/, /ERR_INVALID_URL/],
    [ERROR_TYPE.REDIRECT]: [/3[0-9][0-9]/],
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
    [ERROR_TYPE.DESTINATION_BAD_GATEWAY_503]: [],
    [ERROR_TYPE.DESTINATION_UNAVAILABLE]: [],
    [ERROR_TYPE.DESTINATION_NOT_FOUND]: [],
    [ERROR_TYPE.DESTINATION_MISCONFIGURED]: [],
    [ERROR_TYPE.NO_V2_SERVICES]: [],
    [ERROR_TYPE.NO_V4_SERVICES]: []
};

// Maps errors to end-user messages
/**
 *
 */
export class ErrorHandler {
    /** The last error message generated */
    private currentErrorMsg: string | null;
    /** The last error message type generated if determined */
    private currentErrorType: ERROR_TYPE | null;

    static guidedAnswersEnabled = false;
    private static _logger: Logger;

    // Get the required localized parameterized error message
    // Note that these are general fallback end-user error messages.
    // More specific error messages can be used at the point of error generation.
    private static readonly _errorMsg = (error?: Error | object): Record<ERROR_TYPE, string> => ({
        [ERROR_TYPE.CERT]: t('errors.certificateError', { error }),
        [ERROR_TYPE.CERT_EXPIRED]: t('errors.urlCertValidationError', { certErrorReason: t('texts.anExpiredCert') }),
        [ERROR_TYPE.CERT_SELF_SIGNED]: t('errors.urlCertValidationError', {
            certErrorReason: t('texts.aSelfSignedCert')
        }),
        [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: t('errors.urlCertValidationError', {
            certErrorReason: t('texts.anUnknownOrInvalidCert')
        }),
        [ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN]: t('errors.urlCertValidationError', {
            certErrorReason: t('texts.anUntrustedRootCert')
        }),
        [ERROR_TYPE.AUTH]: t('errors.authenticationFailed', { error }),
        [ERROR_TYPE.AUTH_TIMEOUT]: t('errors.authenticationTimeout'),
        [ERROR_TYPE.INVALID_URL]: t('errors.invalidUrl'),
        [ERROR_TYPE.CONNECTION]: t('errors.connectionError', {
            error: (error as Error)?.message || JSON.stringify(error)
        }),
        [ERROR_TYPE.UNKNOWN]: t('errors.unknownError', {
            error: (error as Error)?.message || JSON.stringify(error)
        }),
        [ERROR_TYPE.SERVICES_UNAVAILABLE]: t('errors.servicesUnavailable'),
        [ERROR_TYPE.SERVICE_UNAVAILABLE]: t('errors.serviceUnavailable'),
        [ERROR_TYPE.CATALOG_SERVICE_NOT_ACTIVE]: t('errors.catalogServiceNotActive'),
        [ERROR_TYPE.INTERNAL_SERVER_ERROR]: t('errors.internalServerError', { error: (error as Error)?.message }),
        [ERROR_TYPE.NOT_FOUND]: t('errors.urlNotFound'),
        [ERROR_TYPE.ODATA_URL_NOT_FOUND]: t('errors.odataServiceUrlNotFound'),
        [ERROR_TYPE.BAD_GATEWAY]: t('errors.destinationUnavailable'),
        [ERROR_TYPE.DESTINATION_UNAVAILABLE]: t('errors.destinationUnavailable'),
        [ERROR_TYPE.DESTINATION_NOT_FOUND]: t('errors.destinationNotFound'),
        [ERROR_TYPE.DESTINATION_MISCONFIGURED]: t('errors.destinationMisconfigured'),
        [ERROR_TYPE.NO_V2_SERVICES]: t('errors.noServicesAvailable', { version: '2' }),
        [ERROR_TYPE.NO_V4_SERVICES]: t('errors.noServicesAvailabl', { version: '4' }),
        [ERROR_TYPE.DESTINATION_BAD_GATEWAY_503]: t('errors.destinationUnavailable'),
        [ERROR_TYPE.REDIRECT]: t('errors.redirectError'),
        [ERROR_TYPE.NO_SUCH_HOST]: t('errors.noSuchHostError'),
        [ERROR_TYPE.NO_ABAP_ENVS]: t('error.abapEnvsUnavailable')
    });

    /**
     * Get the Guided Answers (help) node for the specified error type.
     *
     * @param errorType
     * @returns The Guided Answers node for the specified error type
     */
    private static readonly getHelpNode = (errorType: ERROR_TYPE): number | undefined => {
        const errorToHelp: Record<ERROR_TYPE, number | undefined> = {
            [ERROR_TYPE.SERVICES_UNAVAILABLE]: isAppStudio()
                ? HELP_NODES.BAS_CATALOG_SERVICES_REQUEST_FAILED
                : undefined,
            [ERROR_TYPE.CERT]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.CERT_SELF_SIGNED]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.CERT_SELF_SIGNED_CERT_IN_CHAIN]: HELP_NODES.CERTIFICATE_ERROR,
            [ERROR_TYPE.DESTINATION_MISCONFIGURED]: HELP_NODES.DESTINATION_MISCONFIGURED,
            [ERROR_TYPE.DESTINATION_UNAVAILABLE]: HELP_NODES.DESTINATION_UNAVAILABLE,
            [ERROR_TYPE.DESTINATION_NOT_FOUND]: HELP_NODES.DESTINATION_NOT_FOUND,
            [ERROR_TYPE.BAD_GATEWAY]: HELP_NODES.BAD_GATEWAY,
            [ERROR_TYPE.DESTINATION_BAD_GATEWAY_503]: HELP_NODES.DESTINATION_BAD_GATEWAY_503,
            [ERROR_TYPE.NO_V4_SERVICES]: HELP_NODES.NO_V4_SERVICES,
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
            [ERROR_TYPE.NO_V2_SERVICES]: undefined
        };
        return errorToHelp[errorType];
    };

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
        return Object.keys(ERROR_TYPE).find((errorCodeType) => {
            return ERROR_MAP[errorCodeType as ERROR_TYPE].find((exp: RegExp) => exp.test(error.toString()));
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
    public logErrorMsgs(error: any | ERROR_TYPE, userMsg?: string, retainError = true): string {
        let resolvedError: { errorMsg: string; errorType: ERROR_TYPE } = {
            errorMsg: '',
            errorType: ERROR_TYPE.UNKNOWN
        };

        // Overloaded to allow ERROR_TYPE for convenience
        if (Object.values(ERROR_TYPE).includes(error)) {
            resolvedError.errorMsg = ErrorHandler.getErrorMsgFromType(error) ?? error.toString();
            resolvedError.errorType = error;
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
            errorType =
                ErrorHandler.getErrorType(
                    error.response?.data?.error?.code ||
                        error.response?.status ||
                        error.response?.data ||
                        error.code ||
                        (['TypeError', 'Error'].includes(error.name) ? error.message : error.name) || // For generic error types use the message otherwise the name is more relevant
                        error.message ||
                        error
                ) ?? ERROR_TYPE.UNKNOWN;
        }

        return {
            errorMsg: ErrorHandler._errorMsg(error)[errorType],
            errorType
        };
    }

    /**
     * Used by validate functions to report in-line user friendly errors.
     * Checks if there is an existing error.
     *
     * @param error optional, if provided get the end user message that it maps to, otherwise get the previous error message
     * @param reset optional, resets the previous error state if true
     * @param fallback optional, return the message of the specified ERROR_TYPE if no previous end user message and no error specified
     * @returns The error message
     */
    public getErrorMsg(error?: any, reset?: boolean, fallback?: ERROR_TYPE): string | undefined {
        let errorMsg;
        if (error) {
            errorMsg = ErrorHandler.mapErrorToMsg(error).errorMsg;
        }
        // Get previous error message
        if (!errorMsg) {
            errorMsg = this.currentErrorMsg ?? (fallback ? ErrorHandler.getErrorMsgFromType(fallback!) : undefined);
        }

        if (reset) {
            this.currentErrorMsg = null;
            this.currentErrorType = null;
        }

        return errorMsg;
    }

    /**
     * Used by validate functions to report in-line user friendly errors messages with help links.
     * If the error type is unknown, this will find a mapped error type and return the help (ValidationLink) if it exists.
     * If an error is not provided the current error state will be used. This does not log the message to the console.
     *
     * @param error optional, if provided get the help link message that it maps to, otherwise get the previously logged error message help link
     * @param reset optional, resets the previous error state if true
     * @returns An instance of @see {ValidationLink}
     */
    public getValidationErrorHelp(error?: any, reset = false): string | ValidationLink | undefined {
        let errorHelp: string | ValidationLink | undefined;
        let errorMsg: string | undefined;
        if (error) {
            const resolvedError = ErrorHandler.mapErrorToMsg(error);
            if (resolvedError.errorType !== ERROR_TYPE.UNKNOWN) {
                errorHelp = ErrorHandler.getHelpForError(resolvedError.errorType, resolvedError.errorMsg);
            }
        } else if (!error) {
            errorMsg = this.currentErrorMsg ?? '';
            if (this.currentErrorType) {
                errorHelp = ErrorHandler.getHelpForError(this.currentErrorType, errorMsg);
            }
        }

        if (reset) {
            this.currentErrorMsg = null;
            this.currentErrorType = null;
        }
        return errorHelp ?? errorMsg;
    }

    /**
     * Get the error message for the specified error type.
     *
     * @param errorType
     * @param error
     * @returns The error message for the specified error type
     */
    public static getErrorMsgFromType(errorType: ERROR_TYPE, error?: any): string | undefined {
        if (ERROR_TYPE[errorType]) {
            return ErrorHandler._errorMsg(error)[ERROR_TYPE[errorType]];
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
        this.currentErrorMsg = ErrorHandler._errorMsg(error)[ERROR_TYPE[errorType]];
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
    public static getHelpForError(errorType: ERROR_TYPE, errorMsg?: string): ValidationLink | string | undefined {
        const helpNode = ErrorHandler.getHelpNode(errorType);
        const mappedErrorMsg = errorMsg || ErrorHandler.getErrorMsgFromType(errorType);

        if (helpNode && getPlatform() === PLATFORMS.CLI) {
            const valLink: IValidationLink = {
                message: mappedErrorMsg ?? '',
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
                        trigger: '@sap-ux/odata-service-inquirer'
                    }
                };
            }
            // Report the GA link created event
            sendTelemetryEvent(teleEventGALinkCreated, {
                errorType,
                isGuidedAnswersEnabled: this.guidedAnswersEnabled,
                nodeIdPath: `${helpNode}`
            });
            return new ValidationLink(valLink);
        }
        return mappedErrorMsg;
    }
}
