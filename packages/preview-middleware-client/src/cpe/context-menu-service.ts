import { executeContextMenuAction, ExternalAction } from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction, SubscribeFunction } from './types';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ActionObject, ActionService } from 'sap/ui/rta/service/Action';

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
                const { actionName, controlId } = action.payload;
                await this.actionService.execute(controlId, actionName);
            }
        });
    }

    public async getContextMenuActionsForControl(controlId: string): Promise<ActionObject[]> {
        const actions = await this.actionService.get(controlId);
        return actions;
    }

    // public async executeContextMenuAction(controlId: string, actionName: string): Promise<void> {
    //     await this.actionService.execute(controlId, actionName);
    // }
}
