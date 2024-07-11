import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    executeQuickAction,
    ExternalAction,
    QuickAction,
    quickActionListChanged
} from '@sap-ux-private/control-property-editor-common';

import { ActionSenderFunction, ControlTreeIndex, Service, SubscribeFunction } from '../types';

import { QUICK_ACTION_DEFINITIONS } from './definitions/index';

import { ActivationContext, ExecutionContext } from './definitions/quick-action-definition';

/**
 *
 */
export class QuickActionService implements Service {
    private sendAction: ActionSenderFunction = () => {};
    private executionContext: ExecutionContext;
    private actionService: unknown;

    /**
     *
     * @param rta - rta object.
     * @param ui5 - facade for ui5 framework methods
     */
    constructor(private readonly rta: RuntimeAuthoring) {
        this.executionContext = {
            controlIndex: {},
            rta,
            actionService: undefined
        };
    }

    /**
     * Initialize selection service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        this.actionService = await this.rta.getService('action')

        subscribe(async (action: ExternalAction): Promise<void> => {
            if (executeQuickAction.match(action)) {
                const definition = QUICK_ACTION_DEFINITIONS.find((quickAction) => quickAction.type === action.payload.type);
                if (!definition) {
                    return;
                }
                await definition.execute(this.executionContext);
            }
        });
    }

    public reloadQuickActions(controlIndex: ControlTreeIndex): void {
        const context: ActivationContext = {
            controlIndex
        };
        this.executionContext = {
            controlIndex,
            rta: this.rta,
            actionService: this.actionService
        };
        const quickActions: QuickAction[] = [];
        for (const definition of QUICK_ACTION_DEFINITIONS) {
            if (definition.isActive(context)) {
                quickActions.push({
                    type: definition.type,
                    title: definition.title
                });
            }
        }
        const action = quickActionListChanged(quickActions);
        this.sendAction(action);
    }
}
