import {
    executeContextMenuAction,
    ExternalAction,
    reportTelemetry,
    requestControlContextMenu
} from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction, SubscribeFunction } from './types';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ActionService } from 'sap/ui/rta/service/Action';
import { DialogFactory } from '../adp/dialog-factory';
import { getTextBundle } from '../i18n';
import Log from 'sap/base/Log';
import { getControlById } from '../utils/core';
import { getUi5Version } from '../utils/version';

/**
 * A Class of ContextMenuService
 */
export class ContextMenuService {
    private sendAction: ActionSenderFunction = () => {};
    private actionService: ActionService;
    /**
     *
     * @param rta Runtime Authoring instance.
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initializes rta service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        this.actionService = await this.rta.getService('action');
        const resourceBundle = await getTextBundle();
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (executeContextMenuAction.match(action)) {
                const { actionName, controlId } = action.payload;
                await this.actionService.execute(controlId, actionName);
                try {
                    const controlName = getControlById(controlId)?.getMetadata().getName();
                    const versionInfo = await getUi5Version();
                    await reportTelemetry({
                        category: 'OutlineContextMenu',
                        actionName,
                        controlName,
                        ui5Version: `${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch}`
                    });
                } catch (err) {
                    Log.error('Error in reporting Telemetry:', err);
                }
            }
            if (requestControlContextMenu.pending.match(action)) {
                const controlId = action.payload;
                const actions = await this.actionService.get(controlId);
                const responsePayload = {
                    controlId: controlId,
                    contextMenuItems: (actions ?? []).map((val) => {
                        let enabled = val.enabled;
                        let tooltip;
                        if (!DialogFactory.canOpenDialog) {
                            enabled = false;
                            tooltip = resourceBundle.getText('ADP_QUICK_ACTION_DIALOG_OPEN_MESSAGE');
                        }
                        return { id: val.id, title: val.text, enabled, tooltip };
                    })
                };
                const requestControlActions = requestControlContextMenu.fulfilled(responsePayload);
                this.sendAction(requestControlActions);
            }
        });
    }
}
