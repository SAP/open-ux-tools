import type { ActionHandler, ActionHandlerMap, PanelContext } from '../../../types/system';
import type { WebAppActions } from '@sap-ux/sap-systems-ext-types';
import { exportSystem } from './exportSystem';
import { renderWebApp } from './renderWebapp';
import { updateSystem } from './updateSystem';
import { testSystemConnection } from './testConnection';
import { fireGALinkClickedTelemetry } from './sendTelemetry';
import { createFioriProject, openGuidedAnswers, openOutputChannel } from './executeCommads';

export const actionHandlerMap: ActionHandlerMap = {
    WEBVIEW_READY: renderWebApp,
    UPDATE_SYSTEM: updateSystem,
    TEST_CONNECTION: testSystemConnection,
    EXPORT_SYSTEM: exportSystem,
    FIRE_GA_LINK_CLICKED_TELEMETRY: fireGALinkClickedTelemetry,
    CREATE_FIORI_PROJECT: createFioriProject,
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
