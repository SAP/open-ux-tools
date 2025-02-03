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
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (executeContextMenuAction.match(action)) {
                const { actionName, controlId, defaultPlugin } = action.payload;
                if (defaultPlugin) {
                    await this.actionService.execute(controlId, actionName);
                } else {
                    const control = getControlById(controlId);
                    if (control) {
                        const overlay = getOverlay(control);
                        if (overlay) {
                            const contextMenu = this.rta.getDefaultPlugins().contextMenu;
                            const customAction = contextMenu._aMenuItems.find(
                                (item) => item.menuItem.id === actionName
                            );
                            if (customAction) {
                                await customAction.menuItem.handler([overlay]);
                            }
                        }
                    }
                }
            }
            if (requestControlActionList.pending.match(action)) {
                const controlId = action.payload;
                const actions = await this.actionService.get(controlId);
                const responsePayload = {
                    controlId: controlId,
                    contextMenuItems: (actions ?? []).map((val) => {
                        return { actionName: val.id, name: val.text, enabled: val.enabled, defaultPlugin: true };
                    })
                };
                const control = getControlById(controlId);
                if (control) {
                    const overlay = getOverlay(control);
                    if (overlay) {
                        const contextMenu = this.rta.getDefaultPlugins().contextMenu;
                        const customActions = contextMenu._aMenuItems
                            .filter((item) => !item.fromPlugin)
                            .map((item) => {
                                return {
                                    actionName: item.menuItem.id,
                                    name:
                                        typeof item.menuItem.text === 'function'
                                            ? item.menuItem.text?.(overlay)
                                            : item.menuItem.text,
                                    enabled: item.menuItem?.enabled?.([overlay]),
                                    defaultPlugin: false
                                };
                            });
                        if (customActions.length) {
                            responsePayload.contextMenuItems.unshift(...customActions);
                        }
                    }
                }
                const requestControlActions = requestControlActionList.fulfilled(responsePayload);
                this.sendAction(requestControlActions);
            }
        });
    }
}
