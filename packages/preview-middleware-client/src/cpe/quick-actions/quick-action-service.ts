import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ActionService } from 'sap/ui/rta/service/Action';

import {
    executeQuickAction,
    ExternalAction,
    quickActionListChanged,
    SIMPLE_QUICK_ACTION_KIND,
    NESTED_QUICK_ACTION_KIND,
    QuickActionExecutionPayload,
    QuickActionGroup
} from '@sap-ux-private/control-property-editor-common';

import { ActionSenderFunction, ControlTreeIndex, Service, SubscribeFunction } from '../types';

import { QuickActionActivationContext, QuickActionDefinition } from './quick-action-definition';
import { getFeVersion } from './utils';

import { QuickActionDefinitionRegistry } from './registry';
import Log from 'sap/base/Log';

/**
 *
 */
export class QuickActionService implements Service {
    private sendAction: ActionSenderFunction = () => {};
    private actions: QuickActionDefinition[] = [];

    private registry: QuickActionDefinitionRegistry = new QuickActionDefinitionRegistry();

    private actionService: ActionService;

    /**
     *
     * @param rta - rta object.
     * @param ui5 - facade for ui5 framework methods
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initialize selection service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        this.actionService = await this.rta.getService('action');

        const feVersion = getFeVersion(this.rta.getRootControlInstance().getManifest());
        this.registry = await this.loadDefinitions(feVersion);

        subscribe(async (action: ExternalAction): Promise<void> => {
            if (executeQuickAction.match(action)) {
                const actionInstance = this.actions
                    .filter((quickActionDefinition) => quickActionDefinition.type === action.payload.type)
                    .pop();
                if (!actionInstance) {
                    return;
                }
                const commands = await this.executeAction(actionInstance, action.payload);

                for (const command of commands) {
                    await this.rta.getCommandStack().pushAndExecute(command);
                }
            }
        });
    }

    public async reloadQuickActions(controlIndex: ControlTreeIndex): Promise<void> {
        const context: QuickActionActivationContext = {
            controlIndex,
            manifest: this.rta.getRootControlInstance().getManifest(),
            actionService: this.actionService
        };

        const groups: QuickActionGroup[] = [];
        for (const { title, definitions, view, key } of this.registry.getDefinitions(context)) {
            const group: QuickActionGroup = {
                title,
                actions: []
            };
            for (const Definition of definitions) {
                try {
                    const instance = new Definition({ ...context, view, key, rta: this.rta });
                    await instance.initialize();
                    if (instance.isActive) {
                        const quickAction = instance.getActionObject();
                        group.actions.push(quickAction);
                        this.actions.push(instance);
                    }
                } catch {
                    Log.warning(`Failed to initialize ${Definition.name} quick action.`);
                }
            }
            groups.push(group);
        }

        this.sendAction(quickActionListChanged(groups));
    }

    private async loadDefinitions(version: string | undefined): Promise<QuickActionDefinitionRegistry> {
        if (version === 'v2') {
            const FEV2QuickActionRegistry = (await import('open/ux/preview/client/cpe/quick-actions/fe-v2/registry'))
                .default;

            return new FEV2QuickActionRegistry();
        }
        if (version === 'v4') {
            const FEV4QuickActionRegistry = (await import('open/ux/preview/client/cpe/quick-actions/fe-v4/registry'))
                .default;
            return new FEV4QuickActionRegistry();
        }
        return new QuickActionDefinitionRegistry();
    }

    private executeAction(actionInstance: QuickActionDefinition, payload: QuickActionExecutionPayload) {
        if (payload.kind === SIMPLE_QUICK_ACTION_KIND && actionInstance.kind === SIMPLE_QUICK_ACTION_KIND) {
            return actionInstance.execute();
        }
        if (payload.kind === NESTED_QUICK_ACTION_KIND && actionInstance.kind === NESTED_QUICK_ACTION_KIND) {
            return actionInstance.execute(payload.path);
        }
        return Promise.resolve([]);
    }
}
