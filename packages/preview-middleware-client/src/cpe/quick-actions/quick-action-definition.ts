import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type { FlexSettings, Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import type { ActionService } from 'sap/ui/rta/service/Action';
import type XMLView from 'sap/ui/core/mvc/XMLView';

import type {
    NestedQuickAction,
    SimpleQuickAction,
    NESTED_QUICK_ACTION_KIND,
    SIMPLE_QUICK_ACTION_KIND
} from '@sap-ux-private/control-property-editor-common';

import type { TextBundle } from '../../i18n';
import type { ControlTreeIndex } from '../types';
import { ChangeService } from '../changes';

export interface QuickActionActivationContext {
    controlIndex: ControlTreeIndex;
    actionService: ActionService;
    manifest: Manifest;
}

export interface QuickActionContext {
    controlIndex: ControlTreeIndex;
    actionService: ActionService;
    resourceBundle: TextBundle;
    view: XMLView;
    key: string;

    /**
     * RTA should not be used directly by quick actions.
     *
     * Currently it is only used for actions opening ADP dialogs,
     * but this should be removed in the future.
     *
     * @deprecated
     */
    rta: RuntimeAuthoring;
    flexSettings: FlexSettings;
    manifest: Manifest;
    changeService: ChangeService;
}

interface QuickActionDefinitionBase {
    /**
     * Used to identify between different Quick Action definitions.
     */
    readonly type: string;
    /**
     * Used to identify Quick Action instances.
     * All currently loaded actions must have unique ids.
     */
    readonly id: string;
    /**
     * Most actions have side effects that already triggers Quick Action reload,
     * however if that is not the case this property should be set to "true" to force Quick Action reload after the action is executed.
     */
    readonly forceRefreshAfterExecution?: boolean;
    /**
     * Indicates that the Quick Action is applicable to the given context and should be displayed.
     */
    isApplicable: boolean;
    /**
     * Initializes the action and checks if it should be displayed in current context.
     */
    initialize: () => void | Promise<void>;
    /**
     * Runs enablement validators to check if the action should be enabled.
     */
    runEnablementValidators: () => void | Promise<void>;
}

export interface SimpleQuickActionDefinition extends QuickActionDefinitionBase {
    readonly kind: typeof SIMPLE_QUICK_ACTION_KIND;
    /**
     * Creates a UI representation object for the action.
     *
     * @returns UI representation object for the action.
     */
    getActionObject: () => SimpleQuickAction;

    /**
     * Executes the Quick Action.
     */
    execute: () => FlexCommand[] | Promise<FlexCommand[]>;
}

export interface NestedQuickActionDefinition extends QuickActionDefinitionBase {
    readonly kind: typeof NESTED_QUICK_ACTION_KIND;

    /**
     * Creates a UI representation object for the action.
     *
     * @returns UI representation object for the action.
     */
    getActionObject: () => NestedQuickAction;
    /**
     * Executes the Quick Action.
     *
     * @param path - Path to the specific child action that needs to be executed (e.g '0/1').
     */
    execute: (path: string) => FlexCommand[] | Promise<FlexCommand[]>;
}
export type QuickActionDefinition = SimpleQuickActionDefinition | NestedQuickActionDefinition;

export interface QuickActionDefinitionConstructor<T extends QuickActionDefinition> {
    new (context: QuickActionContext): T;
}

export interface QuickActionDefinitionGroup {
    title: string;
    definitions: QuickActionDefinitionConstructor<QuickActionDefinition>[];
    view: XMLView;
    key: string;
}
