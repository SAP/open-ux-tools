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

export type RTAActionServiceAPI = {
    execute: (controlId: string, actionId: string) => Promise<void>;
    get: (controlId: string) => Promise<{ id: string }[] | undefined>;
};

/**
 *
 */
export class QuickActionService implements Service {
    private sendAction: ActionSenderFunction = () => {};
    private executionContext: ExecutionContext;
    private actionService: RTAActionServiceAPI | undefined;

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
        } as ExecutionContext;
    }

    /**
     * Initialize selection service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        this.actionService = await this.rta.getService('action');
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (executeQuickAction.match(action)) {
                const definition = QUICK_ACTION_DEFINITIONS.find(
                    (quickActionDefinition) => quickActionDefinition.type === action.payload.type
                );
                if (!definition) {
                    return;
                }
                await definition.execute(this.executionContext, action.payload.index, action.payload.executionPayload);
            }
        });
    }

    public async reloadQuickActions(controlIndex: ControlTreeIndex): Promise<void> {
        const context: ActivationContext = {
            controlIndex,
            manifest: this.rta.getRootControlInstance().getManifest(),
            actionService: this.actionService,
            rta: this.rta
        };
        this.executionContext = {
            controlIndex,
            rta: this.rta,
            actionService: this.actionService
        };
        const quickActions: QuickAction<unknown>[] = [];
        for (const definition of QUICK_ACTION_DEFINITIONS) {
            const activationData = await definition.getActivationData(context);
            if (activationData?.isActive) {
                const quickAction = {
                    type: definition.type,
                    title: activationData.title,
                    children: new Array<string>(),
                    executionPayload: activationData.executionPayload
                };
                if (activationData.children) {
                    quickAction.children = activationData.children;
                }
                quickActions.push(quickAction);
            }
        }
        const action = quickActionListChanged(quickActions);
        this.sendAction(action);
    }
}
