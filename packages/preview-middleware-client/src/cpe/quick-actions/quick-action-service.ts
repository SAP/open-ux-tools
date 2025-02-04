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
    updateQuickAction,
    externalFileChange
} from '@sap-ux-private/control-property-editor-common';

import { ActionSenderFunction, ControlTreeIndex, Service, SubscribeFunction } from '../types';

import { QuickActionActivationContext, QuickActionContext, QuickActionDefinition } from './quick-action-definition';
import { QuickActionDefinitionRegistry } from './registry';
import { OutlineService } from '../outline/service';
import { getTextBundle, TextBundle } from '../../i18n';
import { ChangeService } from '../changes';
import { DialogFactory } from '../../adp/dialog-factory';

/**
 * Service providing Quick Actions.
 */
export class QuickActionService implements Service {
    private sendAction: ActionSenderFunction = () => {};
    private actions: QuickActionDefinition[] = [];
    private controlTreeIndex: ControlTreeIndex;

    private actionService: ActionService;
    private texts: TextBundle;

    /**
     * Quick action service constructor.
     *
     * @param rta - RTA object.
     * @param outlineService - Outline service instance.
     * @param registries - Quick action registries.
     */
    constructor(
        private readonly rta: RuntimeAuthoring,
        private readonly outlineService: OutlineService,
        private readonly registries: QuickActionDefinitionRegistry<string>[],
        private readonly changeService: ChangeService
    ) {}

    /**
     * Initialize selection service.
     *
     * @param sendAction - Action sender function.
     * @param subscribe - Subscriber function.
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        this.actionService = await this.rta.getService('action');
        this.texts = await getTextBundle();

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

                if (actionInstance.forceRefreshAfterExecution) {
                    this.sendAction(updateQuickAction(actionInstance.getActionObject()));
                }
            }
            if (externalFileChange.match(action)) {
                await this.reloadQuickActions(this.controlTreeIndex);
            }
        });

        this.outlineService.onOutlineChange(async (event) => {
            this.controlTreeIndex = event.detail.controlIndex;
            await this.reloadQuickActions(event.detail.controlIndex);
        });

        this.changeService.onStackChange(async () => {
            await this.reloadQuickActions(this.controlTreeIndex);
        });

        DialogFactory.onOpenDialogStatusChange(async () => {
            await this.reloadQuickActions(this.controlTreeIndex);
        });
    }

    /**
     * Prepares a list of currently applicable Quick Actions and sends them to the UI.
     *
     * @param controlIndex - Control tree index.
     */
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
                const actionContext: QuickActionContext = {
                    ...context,
                    view,
                    key,
                    rta: this.rta,
                    flexSettings: this.rta.getFlexSettings(),
                    resourceBundle: this.texts,
                    changeService: this.changeService
                };
                for (const Definition of definitions) {
                    try {
                        const instance = new Definition(actionContext);
                        await instance.initialize();
                        await this.addAction(group, instance);
                    } catch {
                        Log.warning(`Failed to initialize ${Definition.name} quick action.`);
                    }
                }
                groups.push(group);
            }
        }

        this.sendAction(quickActionListChanged(groups));
    }

    private async addAction(group: QuickActionGroup, instance: QuickActionDefinition): Promise<void> {
        if (instance.isApplicable) {
            await instance.runEnablementValidators();
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
