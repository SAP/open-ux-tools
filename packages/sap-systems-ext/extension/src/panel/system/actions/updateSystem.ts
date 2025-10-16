import type { BackendSystem } from '@sap-ux/store';
import type { UpdateSystem } from '@sap-ux/sap-systems-ext-types';
import type { PanelContext } from '../../../types/system';
import { commands, window } from 'vscode';
import { SystemService } from '@sap-ux/store';
import { getBackendSystem, geti18nOpts, logTelemetryEvent, t } from '../../../utils';
import { updateSystemStatus, validateSystemName } from '../utils';
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
    const { system: newBackendSystem } = action.payload;
    const systemExistsInStore = !!(await getBackendSystem({
        url: newBackendSystem.url,
        client: newBackendSystem.client
    }));
    try {
        await validateSystemName(newBackendSystem.name, context.backendSystem?.name);
        const newPanelMsg = await updateHandler(context, newBackendSystem, systemExistsInStore);
        await saveSystem(newBackendSystem, systemExistsInStore, context.panelViewType);

        if (newPanelMsg) {
            await commands.executeCommand(SystemCommands.Show, newBackendSystem, newPanelMsg);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await postSavingError(message, context.postMessage, systemExistsInStore, newBackendSystem.systemType);
    }
}

/**
 * Handler for the various scenarios that can occur when updating or creating a system.
 * A message is only returned when a new panel needs to be opened (with said message).
 *
 * @param context - the panel context
 * @param newSystem - the the new system details
 * @param systemExistsInStore - boolean indicating if the new system already exists in the store
 * @returns a message if a new panel will be opened and requires a message or undefined
 */
async function updateHandler(
    context: PanelContext,
    newSystem: BackendSystem,
    systemExistsInStore: boolean
): Promise<string | undefined> {
    const panelViewType = context.panelViewType;
    let newPanelMsg: string | undefined;

    // Scenario 1: User is creating a new system or importing a system
    if (panelViewType === SystemPanelViewType.Create || panelViewType === SystemPanelViewType.Import) {
        if (systemExistsInStore) {
            throw t('error.systemKeyExists');
        }
        context.disposePanel();
        newPanelMsg = t('info.systemSaved', { system: newSystem.name });
    }

    // Scenario 2: User is updating an existing system
    if (panelViewType === SystemPanelViewType.View && systemExistsInStore) {
        // we need to determine is the current panel the one being updated
        if (compareSystems(context.backendSystem as BackendSystem, newSystem)) {
            await context.postMessage(
                updateSystemStatus({
                    message: t('info.systemInfoUpdated'),
                    updateSuccess: true
                })
            );
        } else {
            throw t('error.systemKeyExists');
        }
    }

    // Scenario 3: User is creating a new system by updating an existing one
    // i.e. they opened an existing system and changed the key (url+client) so it's now a new system
    // this requires us to delete the existing system, dispose of the panel, and create and load a new one
    if (panelViewType === SystemPanelViewType.View && !systemExistsInStore && context.backendSystem) {
        context.disposePanel();
        await new SystemService(SystemsLogger.logger).delete(context.backendSystem);
        newPanelMsg = t('info.systemUpdated', { system: newSystem.name });
    }

    context.backendSystem = newSystem;

    return newPanelMsg;
}

/**
 * Posts an error message to the webview when saving the system fails.
 *
 * @param errorMsg - the error message to post
 * @param postMessage - function to post a message to the webview
 * @param systemExistsInStore - boolean indicating if the system already exists in the store
 * @param systemType - optional system type for telemetry logging
 */
async function postSavingError(
    errorMsg: string,
    postMessage: (msg: unknown) => void,
    systemExistsInStore: boolean,
    systemType = 'unknown'
): Promise<void> {
    postMessage(
        updateSystemStatus({
            message: t('error.systemUpdateFailure', { error: errorMsg }),
            updateSuccess: false
        })
    );

    logTelemetryEvent(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status: systemExistsInStore ? SystemActionStatus.UPDATED_FAIL : SystemActionStatus.CREATED_FAIL,
        systemType
    });
}

/**
 * Utility to compare the key fields of two systems (url+client).
 *
 * @param currentSystem - the initial system loaded in the panel
 * @param newSystem - the new system details trying to be saved
 * @returns true if the systems are the same, false otherwise
 */
function compareSystems(currentSystem: BackendSystem, newSystem: BackendSystem): boolean {
    return currentSystem.url === newSystem?.url && currentSystem.client === newSystem?.client;
}

/**
 * Calls the store system service and saves the backend system.
 *
 * @param backendSystem - the backend system to save
 * @param systemExistsInStore - boolean indicating if the system already exists in the store
 * @param systemPanelViewType - the current panel view type
 * @returns - the saved backend system or undefined if saving failed
 */
async function saveSystem(
    backendSystem: BackendSystem,
    systemExistsInStore: boolean,
    systemPanelViewType: SystemPanelViewType
): Promise<void> {
    await new SystemService(SystemsLogger.logger).write(backendSystem, { force: systemExistsInStore });

    const i18nKey = systemPanelViewType === SystemPanelViewType.Create ? 'info.systemSaved' : 'info.systemUpdated';
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    window.showInformationMessage(t(i18nKey, geti18nOpts(backendSystem.name)));

    logTelemetryEvent(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status: systemExistsInStore ? SystemActionStatus.UPDATED_SUCCESS : SystemActionStatus.CREATED_SUCCESS,
        systemType: backendSystem.systemType || 'unknown'
    });
}
