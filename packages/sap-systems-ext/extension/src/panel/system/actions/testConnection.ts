import type { AxiosError } from '@sap-ux/axios-extension';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';
import type { TestConnection, CatalogServicesCounts } from '@sap-ux/sap-systems-ext-types';
import type { PanelContext } from '../../../types';
import { ODataVersion } from '@sap-ux/axios-extension';
import {
    createGALink,
    connectionStatusMsg,
    getCatalogServiceCount,
    getErrorType,
    getErrorMessage,
    loadingTestConnectionInfo,
    validateSystemInfo
} from '../utils';
import { logTelemetryEvent, t } from '../../../utils';
import { GuidedAnswersLinkAction, SystemAction, SYSTEMS_EVENT, TestConnectionStatus } from '../../../utils/constants';
import SystemsLogger from '../../../utils/logger';

/**
 * Tests the connection to a specified backend system and retrieves the count of available OData services.
 *
 * @param context - panel context
 * @param action - test connection action containing the system to test
 */
export async function testSystemConnection(context: PanelContext, action: TestConnection): Promise<void> {
    const { postMessage, isGuidedAnswersEnabled } = context;
    const { system } = action.payload;

    await postMessage(loadingTestConnectionInfo());
    logTestTelemetry(TestConnectionStatus.STARTED, system.systemType);

    const validationResult = validateSystemInfo(system);
    if (typeof validationResult === 'string') {
        await postMessage(validationResult);
        return;
    }

    let serviceCount: CatalogServicesCounts = { v2Request: {}, v4Request: {} };
    try {
        serviceCount = await getCatalogServiceCount(system);

        const { v2Request, v4Request } = serviceCount;

        if ((v2Request.count ?? 0) > 0 || (v4Request.count ?? 0) > 0) {
            postConnectionStatus(postMessage, true, serviceCount);
            logServiceSummary(system.name, v2Request.count, v4Request.count);
            logTestTelemetry(TestConnectionStatus.SUCCEED, system.systemType);
        } else {
            throw new Error(t('error.noServices'));
        }
    } catch {
        handleCatalogError(postMessage, serviceCount, isGuidedAnswersEnabled);
        logTestTelemetry(TestConnectionStatus.FAILED, system.systemType);
    }
}

/**
 * Posts the connection status message to the webview.
 *
 * @param postMessage - function to post message to the webview
 * @param connected - if the connection was successful
 * @param catalogResults - optional catalog results containing service counts
 * @param message - optional message to include
 * @param guidedAnswerLink - optional guided answer link details
 */
function postConnectionStatus(
    postMessage: (msg: unknown) => void,
    connected: boolean,
    catalogResults?: CatalogServicesCounts,
    message?: string,
    guidedAnswerLink?: IActionCalloutDetail
): void {
    postMessage(connectionStatusMsg({ connectionStatus: { connected, catalogResults, message }, guidedAnswerLink }));
}

/**
 * Handles errors that occur during the catalog service retrieval process.
 *
 * @param postMessage - function to post message to the webview
 * @param catalog - catalog results containing service counts and errors
 * @param isGuidedAnswersEnabled - if Guided Answers is enabled
 * @returns - void
 */
function handleCatalogError(
    postMessage: (msg: unknown) => void,
    catalog: CatalogServicesCounts,
    isGuidedAnswersEnabled?: boolean
): void {
    logCatalogErrors(catalog);

    const error = catalog.v2Request.error ?? catalog.v4Request.error;
    if (!error) {
        return postConnectionStatus(postMessage, false, undefined, t('error.noServices'));
    }

    const errorType = getErrorType(error);
    const guidedAnswerLink = createGALink(errorType, isGuidedAnswersEnabled);

    if (guidedAnswerLink) {
        logGATelemetry(GuidedAnswersLinkAction.LINK_CREATED, errorType, isGuidedAnswersEnabled);
    }

    return postConnectionStatus(postMessage, false, undefined, getErrorMessage(errorType, error), guidedAnswerLink);
}

/**
 * Logs errors from the catalog service requests.
 *
 * @param catalogResult - catalog results containing service counts and errors
 */
function logCatalogErrors(catalogResult: CatalogServicesCounts): void {
    if (catalogResult.v2Request.error) {
        logAxiosError(ODataVersion.v2, catalogResult.v2Request.error as AxiosError);
    }
    if (catalogResult.v4Request.error) {
        logAxiosError(ODataVersion.v4, catalogResult.v4Request.error as AxiosError);
    }
}

/**
 * Logs the error details.
 *
 * @param version - OData version
 * @param error - Axios error
 */
function logAxiosError(version: ODataVersion, error: AxiosError): void {
    SystemsLogger.logger.error(t('error.catalogRequest', { version, error: error.message }));

    if (error.response?.data) {
        SystemsLogger.logger.debug(JSON.stringify(error.response.data, null, 2));
    }
    if (error.cause) {
        SystemsLogger.logger.debug(JSON.stringify(error.cause, null, 2));
    }
}

/**
 * Simple logging of the service count.
 *
 * @param systemName - name of the system
 * @param v2Count - number of V2 services
 * @param v4Count - number of V4 services
 */
function logServiceSummary(systemName: string, v2Count?: number, v4Count?: number): void {
    SystemsLogger.logger.info(t('info.numServices', { system: systemName, v2: v2Count ?? 'no', v4: v4Count ?? 'no' }));
}

/**
 * Logs telemetry for the test connection action.
 *
 * @param status - the status of the test connection action
 * @param systemType - the type of the system
 */
function logTestTelemetry(status: TestConnectionStatus, systemType = 'unknown'): void {
    logTelemetryEvent(SYSTEMS_EVENT, {
        action: SystemAction.TEST_CONNECTION,
        status,
        systemType
    });
}

/**
 * Logs telemetry for Guided Answers link creation and clicks.
 *
 * @param status - the status of the action
 * @param errorType - the type of error encountered
 * @param isGuidedAnswersEnabled - if Guided Answers is enabled
 */
function logGATelemetry(status: GuidedAnswersLinkAction, errorType = '', isGuidedAnswersEnabled?: boolean): void {
    logTelemetryEvent(SYSTEMS_EVENT, {
        action: SystemAction.GUIDED_ANSWERS,
        status,
        errorType,
        isGuidedAnswersEnabled: isGuidedAnswersEnabled ? 'true' : 'false'
    });
}
