import type { ActionHandler, ActionHandlerMap, PanelContext } from '../../../types/system/index.js';
import type { WebAppActions } from '@sap-ux/sap-systems-ext-types';
import { exportSystem } from './exportSystem.js';
import { renderWebApp } from './renderWebapp.js';
import { updateSystem } from './updateSystem.js';
import { testSystemConnection } from './testConnection.js';
import { fireGALinkClickedTelemetry } from './sendTelemetry.js';
import { createFioriProject, openExistingSystem, openGuidedAnswers, openOutputChannel } from './executeCommads.js';

export const actionHandlerMap: ActionHandlerMap = {
    WEBVIEW_READY: renderWebApp,
    UPDATE_SYSTEM: updateSystem,
    TEST_CONNECTION: testSystemConnection,
    EXPORT_SYSTEM: exportSystem,
    FIRE_GA_LINK_CLICKED_TELEMETRY: fireGALinkClickedTelemetry,
    CREATE_FIORI_PROJECT: createFioriProject,
    OPEN_EXISTING_SYSTEM: openExistingSystem,
    OPEN_GUIDED_ANSWERS: openGuidedAnswers,
    OPEN_OUTPUT_CHANNEL: openOutputChannel
};

/**
 * This function dispatches the given action to the appropriate handler based on the action type.
 *
 * @param panelContext - the panel context
 * @param action - the action to dispatch
 */
export async function dispatchPanelAction(panelContext: PanelContext, action: WebAppActions): Promise<void> {
    const handler = actionHandlerMap[action.type] as ActionHandler<WebAppActions>;
    if (!handler) {
        return;
    }
    await handler(panelContext, action);
}
