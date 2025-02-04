import {
    executeContextMenuAction,
    ExternalAction,
    requestControlActionList
} from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction, SubscribeFunction } from './types';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ActionService } from 'sap/ui/rta/service/Action';
import { getOverlay } from './utils';
import { getControlById } from '../utils/core';
import { DialogFactory } from '../adp/dialog-factory';
import { getTextBundle, TextBundle } from '../i18n';

interface ContextMenuAction {
    actionName: string;
    name: string;
    enabled: boolean;
    defaultPlugin: boolean;
    tooltip: string | undefined;
}
/**
 * A Class of ContextMenuService
 */
export class ContextMenuService {
    private sendAction: ActionSenderFunction = () => {};
    private actionService: ActionService;
    /**
     *
     * @param options ui5 adaptation options.
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
                const { actionName, controlId, defaultPlugin } = action.payload;
                if (defaultPlugin) {
                    await this.actionService.execute(controlId, actionName);
                } else {
                    await this.executeDeveloperAction(controlId, actionName);
                }
            }
            if (requestControlActionList.pending.match(action)) {
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
                        return { actionName: val.id, name: val.text, enabled, defaultPlugin: true, tooltip };
                    })
                };
                responsePayload.contextMenuItems.unshift(...this.getDeveloperActions(controlId, resourceBundle));
                const requestControlActions = requestControlActionList.fulfilled(responsePayload);
                this.sendAction(requestControlActions);
            }
        });
    }

    private async executeDeveloperAction(controlId: string, actionName: string): Promise<void> {
        const control = getControlById(controlId);
        if (control) {
            const overlay = getOverlay(control);
            if (overlay) {
                const contextMenu = this.rta.getDefaultPlugins().contextMenu;
                const customAction = contextMenu._aMenuItems.find((item) => item.menuItem.id === actionName);
                if (customAction) {
                    await customAction.menuItem.handler([overlay]);
                }
            }
        }
    }

    private getDeveloperActions(controlId: string, resourceBundle: TextBundle): ContextMenuAction[] {
        const control = getControlById(controlId);
        if (!control) {
            return [];
        }
        const overlay = getOverlay(control);
        if (!overlay) {
            return [];
        }
        const contextMenu = this.rta.getDefaultPlugins().contextMenu;
        return (contextMenu._aMenuItems ?? [])
            .filter((item) => !item.fromPlugin)
            .map((item) => {
                let enabled = item.menuItem?.enabled?.([overlay]);
                let tooltip = '';
                if (!DialogFactory.canOpenDialog) {
                    enabled = false;
                    tooltip = resourceBundle.getText('ADP_QUICK_ACTION_DIALOG_OPEN_MESSAGE');
                }
                return {
                    actionName: item.menuItem.id,
                    name: typeof item.menuItem.text === 'function' ? item.menuItem.text?.(overlay) : item.menuItem.text,
                    enabled,
                    defaultPlugin: false,
                    tooltip
                };
            });
    }
}
