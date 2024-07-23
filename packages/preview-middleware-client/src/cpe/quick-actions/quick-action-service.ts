import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import {
    executeQuickAction,
    ExternalAction,
    QuickAction,
    quickActionListChanged
} from '@sap-ux-private/control-property-editor-common';

import {
    ActionHandler,
    ActionSenderFunction,
    ControlTreeIndex,
    Service,
    SubscribeFunction,
    UnSubscribeFunction
} from '../types';

import { QUICK_ACTION_DEFINITIONS } from './definitions/index';

import { ActivationContext, ExecutionContext } from './definitions/quick-action-definition';

/**
 *
 */
export class QuickActionService implements Service {
    private sendAction: ActionSenderFunction = () => {};
    private executionContext: ExecutionContext;
    private actionService: unknown;
    private subscribeFn: SubscribeFunction;
    private unSubscribeFn: UnSubscribeFunction;

    /**
     *
     * @param rta - rta object.
     * @param ui5 - facade for ui5 framework methods
     */
    constructor(private readonly rta: RuntimeAuthoring) {
        this.executionContext = {
            controlIndex: {},
            rta,
            actionService: undefined,
            onQuickActionExecution: () => ({
                subscribe: () => {},
                unSubscribe: () => {}
            })
        };
    }

    /**
     * Initialize selection service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(
        sendAction: ActionSenderFunction,
        subscribe: SubscribeFunction,
        unSubscribe: UnSubscribeFunction
    ): Promise<void> {
        this.sendAction = sendAction;
        this.actionService = await this.rta.getService('action');
        this.subscribeFn = subscribe;
        this.unSubscribeFn = unSubscribe;
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (executeQuickAction.match(action)) {
                const definition = QUICK_ACTION_DEFINITIONS.find(
                    (quickAction) => quickAction.type === action.payload.type
                );
                if (!definition) {
                    return;
                }
                await definition.execute(this.executionContext, action.payload.index);
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
        const that = this;
        this.executionContext = {
            controlIndex,
            rta: this.rta,
            actionService: this.actionService,
            onQuickActionExecution: () => {
                return {
                    subscribe(action) {
                        that.subscribeFn(action);
                    },
                    unSubscribe(handler: ActionHandler) {
                        that.unSubscribeFn(handler);
                    }
                };
            }
        };
        const quickActions: QuickAction[] = [];
        for (const definition of QUICK_ACTION_DEFINITIONS) {
            if (await definition.isActive(context)) {
                const quickAction = {
                    type: definition.type,
                    title: definition.title,
                    children: new Array<string>()
                };
                if (definition.children) {
                    quickAction.children = definition?.children({
                        controlIndex,
                        actionService: this.actionService,
                        rta: this.rta
                    });
                }
                quickActions.push(quickAction);
            }
        }
        const action = quickActionListChanged(quickActions);
        this.sendAction(action);
    }
}
