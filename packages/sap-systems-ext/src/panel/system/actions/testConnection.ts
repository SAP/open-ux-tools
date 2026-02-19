import type { AxiosError } from '@sap-ux/axios-extension';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';
import type { TestConnection, CatalogServicesCounts } from '@sap-ux/sap-systems-ext-types';
import type { PanelContext } from '../../../types';
import { BackendSystemKey, type BackendSystem } from '@sap-ux/store';
import { ODataVersion } from '@sap-ux/axios-extension';
import {
    createGALink,
    connectionStatusMsg,
    getCatalogServiceCount,
    getErrorType,
    getErrorMessage,
    loadingTestConnectionInfo,
    validateSystemInfo,
    getSystemInfo,
    hasServiceMetadata
} from '../utils';
import { TelemetryHelper, compareSystems, getBackendSystemService, shouldStoreSystemInfo, t } from '../../../utils';
import {
    GuidedAnswersLinkAction,
    SystemAction,
    SystemPanelViewType,
    SYSTEMS_EVENT,
    TestConnectionStatus
} from '../../../utils/constants';
import SystemsLogger from '../../../utils/logger';

/**
 * Tests the connection to a specified backend system and retrieves the count of available OData services.
 * Also makes an API call for other system information e.g. system ID and client.
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
        await postMessage(connectionStatusMsg({ connectionStatus: { connected: false, message: validationResult } }));
        return;
    }

    if (system.connectionType === 'abap_catalog') {
        await testCatalog(system, isGuidedAnswersEnabled, postMessage);
    } else if (system.connectionType === 'odata_service') {
        await testODataService(system, postMessage);
    }

    try {
        if (shouldStoreSystemInfo(system)) {
            await storeSystemInfo(context, system);
        }
    } catch (e) {
        SystemsLogger.logger.error(t('error.systemInfoUpdate', { error: (e as Error).message }));
    }
}

/**
 * Tests the connection to an ABAP system by retrieving the count of available OData services from the catalog.
 *
 * @param system - the backend system
 * @param isGuidedAnswersEnabled - isGuidedAnswersEnabled
 * @param postMessage - function to post message to the webview
 */
async function testCatalog(
    system: BackendSystem,
    isGuidedAnswersEnabled: boolean,
    postMessage: (msg: unknown) => void
): Promise<void> {
    let serviceCount: CatalogServicesCounts = { v2Request: {}, v4Request: {} };
    try {
        serviceCount = await getCatalogServiceCount(system);

        const { v2Request, v4Request } = serviceCount;

        if ((v2Request.count ?? 0) > 0 || (v4Request.count ?? 0) > 0) {
            postConnectionStatus({ connected: true, catalogResults: serviceCount, postMessage });
            logServiceSummary(system.name, serviceCount);
            logTestTelemetry(TestConnectionStatus.SUCCEED, system.systemType);
        } else {
            throw new Error(t('error.noServices'));
        }
    } catch (e) {
        handleCatalogError(postMessage, serviceCount, isGuidedAnswersEnabled, e as Error);
        logTestTelemetry(TestConnectionStatus.FAILED, system.systemType);
    }
}

/**
 * Tests the connection to a generic host system.
 *
 * @param system - the backend system
 * @param postMessage - function to post message to the webview
 */
async function testODataService(system: BackendSystem, postMessage: (msg: unknown) => void): Promise<void> {
    try {
        await hasServiceMetadata(system);
        postConnectionStatus({ connected: true, message: t('info.serviceMetadata'), postMessage });
        logTestTelemetry(TestConnectionStatus.SUCCEED, system.systemType);
    } catch (e) {
        postConnectionStatus({
            connected: false,
            message: t('info.noServiceMetadata'),
            postMessage
        });
        logServiceRequestError(e as AxiosError);
        logTestTelemetry(TestConnectionStatus.FAILED, system.systemType);
    }
}

/**
 * Posts the connection status message to the webview.
 *
 * @param params - parameters for posting the connection status
 * @param params.postMessage - function to post message to the webview
 * @param params.connected - if the connection was successful
 * @param params.catalogResults - optional catalog results containing service counts
 * @param params.message - optional message to include
 * @param params.guidedAnswerLink - optional guided answer link details
 */
function postConnectionStatus({
    postMessage,
    connected,
    catalogResults,
    message,
    guidedAnswerLink
}: {
    postMessage: (msg: unknown) => void;
    connected: boolean;
    catalogResults?: CatalogServicesCounts;
    message?: string;
    guidedAnswerLink?: IActionCalloutDetail;
}): void {
    postMessage(connectionStatusMsg({ connectionStatus: { connected, catalogResults, message }, guidedAnswerLink }));
}

/**
 * Handles errors that occur during the catalog service retrieval process.
 *
 * @param postMessage - function to post message to the webview
 * @param catalog - catalog results containing service counts and errors
 * @param isGuidedAnswersEnabled - if Guided Answers is enabled
 * @param error - the error that occurred
 * @returns - void
 */
function handleCatalogError(
    postMessage: (msg: unknown) => void,
    catalog: CatalogServicesCounts,
    isGuidedAnswersEnabled?: boolean,
    error?: Error
): void {
    logCatalogErrors(catalog);

    const catalogResultError = catalog.v2Request.error ?? catalog.v4Request.error;
    if (!catalogResultError) {
        return postConnectionStatus({ connected: false, message: error?.message, postMessage });
    }

    const errorType = getErrorType(catalogResultError);
    const guidedAnswerLink = createGALink(errorType, isGuidedAnswersEnabled);

    if (guidedAnswerLink) {
        logGATelemetry(GuidedAnswersLinkAction.LINK_CREATED, errorType, isGuidedAnswersEnabled);
    }

    return postConnectionStatus({
        connected: false,
        message: getErrorMessage(errorType, catalogResultError),
        guidedAnswerLink,
        postMessage
    });
}

/**
 * Logs the error that occurred during the service request.
 *
 * @param error - the axios error
 */
function logServiceRequestError(error: AxiosError): void {
    SystemsLogger.logger.error(t('error.serviceRequest', { error: error.message }));
    logAxiosError(error);
}

/**
 * Logs errors from the catalog service requests.
 *
 * @param catalogResult - catalog results containing service counts and errors
 */
function logCatalogErrors(catalogResult: CatalogServicesCounts): void {
    if (catalogResult.v2Request.error) {
        logCatalogError(ODataVersion.v2, catalogResult.v2Request.error as AxiosError);
    }
    if (catalogResult.v4Request.error) {
        logCatalogError(ODataVersion.v4, catalogResult.v4Request.error as AxiosError);
    }
}

/**
 * Logs the catalog error details.
 *
 * @param version - OData version
 * @param error - Axios error
 */
function logCatalogError(version: ODataVersion, error: AxiosError): void {
    SystemsLogger.logger.error(t('error.catalogRequest', { version, error: error.message }));
    logAxiosError(error);
}

/**
 * Logs the error details.
 *
 * @param error - Axios error
 */
function logAxiosError(error: AxiosError): void {
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
 * @param catalog - catalog results containing service counts and errors
 */
function logServiceSummary(systemName: string, catalog: CatalogServicesCounts): void {
    logCatalogErrors(catalog);

    SystemsLogger.logger.info(
        t('info.numServices', {
            system: systemName,
            v2: catalog?.v2Request?.count ?? 'no',
            v4: catalog?.v4Request?.count ?? 'no'
        })
    );
}

/**
 * Logs telemetry for the test connection action.
 *
 * @param status - the status of the test connection action
 * @param systemType - the type of the system
 */
function logTestTelemetry(status: TestConnectionStatus, systemType = 'unknown'): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.GUIDED_ANSWERS,
        status,
        errorType,
        isGuidedAnswersEnabled: isGuidedAnswersEnabled ? 'true' : 'false'
    });
}

/**
 * Attempts a partial update to store the system ID for existing (unchanged) saved systems.
 *
 * @param context - panel context
 * @param backendSystemPayload - backend system passed in the payload
 */
async function storeSystemInfo(context: PanelContext, backendSystemPayload: BackendSystem): Promise<void> {
    // determines if this is a simple view (viewing an existing system without any backend key changes)
    const isSimpleView =
        context.panelViewType === SystemPanelViewType.View &&
        context.backendSystem &&
        compareSystems(context.backendSystem, backendSystemPayload);

    // not suitable for a partial update if the system has been modified or it is a new system
    if (!isSimpleView) {
        return;
    }

    // no action needed if system id is already present
    if (isSimpleView && context.backendSystem?.systemInfo?.systemId) {
        return;
    }

    const systemInfo = await getSystemInfo(backendSystemPayload);
    if (systemInfo) {
        SystemsLogger.logger.debug(
            t('debug.systemInfoRetrieved', {
                systemId: systemInfo.systemId,
                client: systemInfo.client
            })
        );
        const systemService = await getBackendSystemService();
        await systemService.partialUpdate(
            new BackendSystemKey({
                url: backendSystemPayload.url,
                client: backendSystemPayload.client
            }),
            {
                systemInfo: { systemId: systemInfo.systemId, client: systemInfo.client }
            }
        );
    }
}
