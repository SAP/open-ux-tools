import type { UpdateSystem } from '@sap-ux/sap-systems-ext-types';
import type { PanelContext } from '../../../types/system';
import type { BackendSystem } from '@sap-ux/store';
import { commands, window } from 'vscode';
import {
    getBackendSystem,
    geti18nOpts,
    TelemetryHelper,
    t,
    getBackendSystemService,
    compareSystems,
    shouldStoreSystemInfo
} from '../../../utils';
import {
    getSystemInfo,
    updateSystemStatus,
    validateSystemName,
    validateSystemUrl,
    ConnectionExistsError
} from '../utils';
import {
    SystemAction,
    SystemActionStatus,
    SystemCommands,
    SystemPanelViewType,
    SYSTEMS_EVENT
} from '../../../utils/constants';
import SystemsLogger from '../../../utils/logger';

/**
 * This action updates or creates a system based on the provided details.
 *
 * @param context - the panel context
 * @param action - update system action containing the new system details
 */
export async function updateSystem(context: PanelContext, action: UpdateSystem): Promise<void> {
    const { system: backendSystemPayload } = action.payload;
    const existingSystem = await getBackendSystem({
        url: backendSystemPayload.url,
        client: backendSystemPayload.client
    });

    let systemInfo: { systemId: string; client: string } | undefined;

    if (shouldStoreSystemInfo(backendSystemPayload)) {
        systemInfo = await fetchSystemInfo(context, backendSystemPayload);
    }

    const backendSystem: BackendSystem = {
        ...backendSystemPayload,
        ...(systemInfo && { systemInfo })
    };

    try {
        await validateSystemName(backendSystem.name, context.backendSystem?.name, context.panelViewType);
        validateSystemUrl(backendSystem.url);

        const newPanelMsg = await updateHandler(context, backendSystem, existingSystem);
        await saveSystem(backendSystem, context.panelViewType, existingSystem);
        if (newPanelMsg) {
            await commands.executeCommand(SystemCommands.Show, backendSystem, newPanelMsg);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const existingSystem = error instanceof ConnectionExistsError ? error.existingSystem : undefined;
        await postSavingError(
            message,
            context.postMessage,
            backendSystem.systemType,
            context.panelViewType,
            existingSystem
        );
    }
}

/**
 * Retrieves the system info (systemId and client) from the system info API for the given backend system.
 *
 * @param context - the panel context
 * @param backendSystemPayload - the backend system info passed as a payload from webview
 * @returns the backend system with the `systemId` attached if applicable
 */
async function fetchSystemInfo(
    context: PanelContext,
    backendSystemPayload: BackendSystem
): Promise<{ systemId: string; client: string } | undefined> {
    // if the system that was initially loaded matches the one in the payload, and the system id is already present
    if (context.backendSystem?.systemInfo?.systemId && compareSystems(context.backendSystem, backendSystemPayload)) {
        return context.backendSystem.systemInfo;
    }

    const systemInfo = await getSystemInfo(backendSystemPayload);
    if (systemInfo) {
        SystemsLogger.logger.debug(
            t('debug.systemInfoRetrieved', {
                systemId: systemInfo.systemId,
                client: systemInfo.client
            })
        );
    }
    return systemInfo;
}

/**
 * Handler for the various scenarios that can occur when updating or creating a system.
 * A message is only returned when a new panel needs to be opened (with said message).
 *
 * @param context - the panel context
 * @param newSystem - the the new system details
 * @param existingSystem - instance of an existing system with same url and client, if it exists
 * @returns a message if a new panel will be opened and requires a message or undefined
 */
async function updateHandler(
    context: PanelContext,
    newSystem: BackendSystem,
    existingSystem?: BackendSystem
): Promise<string | undefined> {
    const panelViewType = context.panelViewType;
    let newPanelMsg: string | undefined;

    // Scenario 1: User is creating a new system or importing a system
    if (panelViewType === SystemPanelViewType.Create || panelViewType === SystemPanelViewType.Import) {
        if (existingSystem) {
            throw new ConnectionExistsError(existingSystem);
        }
        context.disposePanel();
        newPanelMsg = t('info.connectionSaved', { system: newSystem.name });
    }

    // Scenario 2: User is updating an existing system
    if (panelViewType === SystemPanelViewType.View && existingSystem) {
        // we need to determine if the current panel is the one being updated
        if (compareSystems(context.backendSystem as BackendSystem, newSystem)) {
            // Update the panel context's backend system to the new system details
            context.updateBackendSystem(newSystem);
            await context.postMessage(
                updateSystemStatus({
                    message: t('info.connectionInfoUpdated'),
                    updateSuccess: true
                })
            );
        } else {
            throw new ConnectionExistsError(existingSystem);
        }
    }

    // Scenario 3: User is creating a new system by updating an existing one
    // i.e. they opened an existing system and changed the key (url+client) so it's now a new system
    // this requires us to delete the existing system, dispose of the panel, and create and load a new one
    if (panelViewType === SystemPanelViewType.View && !existingSystem && context.backendSystem) {
        context.disposePanel();
        const systemService = await getBackendSystemService();
        await systemService.delete(context.backendSystem);
        newPanelMsg = t('info.connectionUpdated', { system: newSystem.name });
    }

    return newPanelMsg;
}

/**
 * Posts an error message to the webview when saving the system fails.
 *
 * @param errorMsg - the error message to post
 * @param postMessage - function to post a message to the webview
 * @param systemType - optional system type for telemetry logging
 * @param panelViewType - the current panel view type
 * @param existingSystem - optional existing system that caused a conflict
 */
async function postSavingError(
    errorMsg: string,
    postMessage: PanelContext['postMessage'],
    systemType = 'unknown',
    panelViewType?: SystemPanelViewType,
    existingSystem?: BackendSystem
): Promise<void> {
    const isUpdate = panelViewType === SystemPanelViewType.View;

    await postMessage(
        updateSystemStatus({
            message: t(isUpdate ? 'error.updateFailure' : 'error.creationFailure', { error: errorMsg }),
            updateSuccess: false,
            ...(existingSystem && {
                existingSystem: {
                    name: existingSystem.name,
                    url: existingSystem.url,
                    client: existingSystem.client
                }
            })
        })
    );

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status: isUpdate ? SystemActionStatus.UPDATED_FAIL : SystemActionStatus.CREATED_FAIL,
        systemType
    });
}

/**
 * Calls the store system service and saves the backend system.
 *
 * @param backendSystem - the backend system to save
 * @param systemPanelViewType - the current panel view type
 * @param existingSystem - instance of an existing system with same url and client, if it exists
 * @returns - the saved backend system or undefined if saving failed
 */
async function saveSystem(
    backendSystem: BackendSystem,
    systemPanelViewType: SystemPanelViewType,
    existingSystem?: BackendSystem
): Promise<void> {
    // ensure the user display name is set to the username
    const newBackendSystem: BackendSystem = {
        ...backendSystem,
        userDisplayName: backendSystem.username
    };
    const systemService = await getBackendSystemService();
    await systemService.write(newBackendSystem, {
        force: !!existingSystem
    });
    const i18nKey =
        systemPanelViewType === SystemPanelViewType.Create ? 'info.connectionSaved' : 'info.connectionUpdated';

    window.showInformationMessage(t(i18nKey, geti18nOpts(backendSystem.name)));

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status: existingSystem ? SystemActionStatus.UPDATED_SUCCESS : SystemActionStatus.CREATED_SUCCESS,
        systemType: backendSystem.systemType || 'unknown'
    });
}
