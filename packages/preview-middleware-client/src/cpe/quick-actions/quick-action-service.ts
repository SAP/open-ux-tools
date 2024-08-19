import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ActionService } from 'sap/ui/rta/service/Action';
import Log from 'sap/base/Log';

import {
    executeQuickAction,
    ExternalAction,
    quickActionListChanged,
    SIMPLE_QUICK_ACTION_KIND,
    NESTED_QUICK_ACTION_KIND,
    QuickActionExecutionPayload,
    QuickActionGroup,
    updateQuickAction
} from '@sap-ux-private/control-property-editor-common';

import { ActionSenderFunction, ControlTreeIndex, Service, SubscribeFunction } from '../types';

import { QuickActionActivationContext, QuickActionDefinition } from './quick-action-definition';
import { QuickActionDefinitionRegistry } from './registry';
import { OutlineService } from '../outline/service';
import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import { getResourceBundle } from '../../i18n';

/**
 *
 */
export class QuickActionService implements Service {
    private sendAction: ActionSenderFunction = () => {};
    private actions: QuickActionDefinition[] = [];

    private actionService: ActionService;
    private resourceBundle: ResourceBundle;

    /**
     *
     * @param rta - rta object.
     * @param outlineService - Outline service instance
     * @param registries - Quick action registries
     */
    constructor(
        private readonly rta: RuntimeAuthoring,
        private readonly outlineService: OutlineService,
        private readonly registries: QuickActionDefinitionRegistry<string>[]
    ) {}

    /**
     * Initialize selection service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        this.actionService = await this.rta.getService('action');
        this.resourceBundle = await getResourceBundle();

        subscribe(async (action: ExternalAction): Promise<void> => {
            if (executeQuickAction.match(action)) {
                const actionInstance = this.actions
                    .filter((quickActionDefinition) => quickActionDefinition.id === action.payload.id)
                    .pop();
                if (!actionInstance) {
                    return;
                }
                const commands = await this.executeAction(actionInstance, action.payload);

                for (const command of commands) {
                    await this.rta.getCommandStack().pushAndExecute(command);
                }

                if (actionInstance.forceRefreshAfterExecution === true) {
                    this.sendAction(updateQuickAction(actionInstance.getActionObject()));
                }
            }
        });

        this.outlineService.onOutlineChange(async (event) => {
            await this.reloadQuickActions(event.detail.controlIndex);
        });
    }

    public async reloadQuickActions(controlIndex: ControlTreeIndex): Promise<void> {
        const context: QuickActionActivationContext = {
            controlIndex,
            manifest: this.rta.getRootControlInstance().getManifest(),
            actionService: this.actionService
        };

        const groups: QuickActionGroup[] = [];
        for (const registry of this.registries) {
            for (const { title, definitions, view, key } of registry.getDefinitions(context)) {
                const group: QuickActionGroup = {
                    title,
                    actions: []
                };
                for (const Definition of definitions) {
                    try {
                        const instance = new Definition({
                            ...context,
                            view,
                            key,
                            rta: this.rta,
                            resourceBundle: this.resourceBundle
                        });
                        await instance.initialize();
                        this.addAction(group, instance);
                    } catch {
                        Log.warning(`Failed to initialize ${Definition.name} quick action.`);
                    }
                }
                groups.push(group);
            }
        }

        this.sendAction(quickActionListChanged(groups));
    }

    private addAction(group: QuickActionGroup, instance: QuickActionDefinition): void {
        if (instance.isActive) {
            const quickAction = instance.getActionObject();
            group.actions.push(quickAction);
            this.actions.push(instance);
        }
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
