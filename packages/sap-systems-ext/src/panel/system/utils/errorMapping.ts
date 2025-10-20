import type { IActionCalloutDetail } from '@sap-ux/ui-components';
import { GUIDED_ANSWERS_LAUNCH_CMD_ID, HELP_NODES, HELP_TREE, getHelpUrl } from '@sap-ux/guided-answers-helper';
import { t } from '../../../utils';

/**
 * Error type categorization
 */
export enum ERROR_TYPE {
    CERT_SELF_SIGNED = 'CERT_SELF_SIGNED',
    CERT_UKNOWN_OR_INVALID = 'CERT_UKNOWN_OR_INVALID',
    CERT_EXPIRED = 'CERT_EXPIRED',
    CERT_WRONG_HOST = 'CERT_WRONG_HOST',
    UNKNOWN = 'UNKNOWN'
}

/**
 * Match strings (from errors) to error type categorization
 */
const errorTypeMatcher: Record<ERROR_TYPE, RegExp[]> = {
    [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: [
        /UNABLE_TO_GET_ISSUER_CERT/,
        /UNABLE_TO_GET_ISSUER_CERT_LOCALLY/,
        /unable to get local issuer certificate/
    ],
    [ERROR_TYPE.CERT_EXPIRED]: [/CERT_HAS_EXPIRED/, /certificate has expired/],
    [ERROR_TYPE.CERT_SELF_SIGNED]: [
        /DEPTH_ZERO_SELF_SIGNED_CERT/,
        /SELF_SIGNED_CERT_IN_CHAIN/,
        /self signed certificate/
    ],
    [ERROR_TYPE.CERT_WRONG_HOST]: [/ERR_TLS_CERT_ALTNAME_INVALID/],
    [ERROR_TYPE.UNKNOWN]: []
};

/**
 * Maps error types to help nodes
 */
const errorToHelp: Record<string, number> = {
    [ERROR_TYPE.CERT_SELF_SIGNED]: HELP_NODES.CERTIFICATE_ERROR
};

/**
 * Maps error types to messages
 */
const errorToMessage: Record<string, () => string> = {
    [ERROR_TYPE.CERT_EXPIRED]: () =>
        t('error.cert.urlValidation', {
            certError: t('error.cert.expired')
        }),
    [ERROR_TYPE.CERT_SELF_SIGNED]: () =>
        t('error.cert.urlValidation', {
            certError: t('error.cert.selfSigned')
        }),
    [ERROR_TYPE.CERT_UKNOWN_OR_INVALID]: () =>
        t('error.cert.urlValidation', {
            certError: t('error.cert.unknownOrInvalid')
        }),
    [ERROR_TYPE.CERT_WRONG_HOST]: () =>
        t('error.cert.urlValidation', {
            certError: t('error.cert.wrongHost')
        })
};

/**
 * Maps error types to messages
 */
const errorHelpMessage: Record<string, () => string> = {
    [ERROR_TYPE.CERT_SELF_SIGNED]: () => t('error.cert.validationHelp')
};

/**
 * Returns a categorization of the specified error.
 * Add more mappings as required.
 *
 * @param error - an error string or object
 * @returns - the error type categorization
 */
export function getErrorType(error: any): ERROR_TYPE {
    // Use the error properties in the order of preference
    // We dont test for each but use the first we find
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const errorKey = error.code || error.message || error.name || error;

    const matchedErrorType = Object.entries(errorTypeMatcher).find(([, regexes]) =>
        regexes.some((exp) => exp.test(errorKey))
    );

    if (matchedErrorType) {
        return matchedErrorType[0] as ERROR_TYPE;
    }

    return ERROR_TYPE.UNKNOWN;
}

/**
 * Creates an IActionCalloutDetail instance required to display a Guided Answer.
 *
 * @param errorType - the error type
 * @param addGALaunchCommand - whether to add the Guided Answers launch command
 * @returns - the IActionCalloutDetail instance or undefined if no help node is mapped
 */
export function createGALink(errorType: ERROR_TYPE, addGALaunchCommand = false): IActionCalloutDetail | undefined {
    // Get GA node id for the specified error type
    const helpNodeId = errorToHelp[errorType];

    if (!helpNodeId) {
        return;
    }

    let command;

    if (addGALaunchCommand) {
        command = {
            id: GUIDED_ANSWERS_LAUNCH_CMD_ID,
            params: {
                treeId: HELP_TREE.FIORI_TOOLS,
                nodeIdPath: [helpNodeId]
            }
        };
    }

    return {
        linkText: t('error.cert.gaPromptText'),
        subText: getErrorHelp(errorType),
        url: getHelpUrl(HELP_TREE.FIORI_TOOLS, [helpNodeId]),
        command
    };
}

/**
 * Retrieves an error message for the specified error type.
 *
 * @param errorType - the error type
 * @param error - optional error object
 * @returns - the error message
 */
export function getErrorMessage(errorType: ERROR_TYPE, error?: unknown): string {
    const msg = errorToMessage[errorType] ? errorToMessage[errorType]() : undefined;

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return msg || t('error.noServices', { error });
}

/**
 * Retrieves an error help message for the specified error type.
 *
 * @param errorType - the error type
 * @returns - the error help message
 */
export function getErrorHelp(errorType: ERROR_TYPE): string {
    return errorHelpMessage[errorType] ? errorHelpMessage[errorType]() : t('error.cert.gaPromptSubText');
}
