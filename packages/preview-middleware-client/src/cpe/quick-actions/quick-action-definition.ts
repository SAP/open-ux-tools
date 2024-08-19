import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { FlexSettings, Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import type { ActionService } from 'sap/ui/rta/service/Action';
import type XMLView from 'sap/ui/core/mvc/XMLView';

import type { NestedQuickAction, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND, SIMPLE_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import { ControlTreeIndex } from '../types';

export interface QuickActionActivationContext {
    controlIndex: ControlTreeIndex;
    actionService: ActionService;
    manifest: Manifest;
}

export interface QuickActionContext {
    controlIndex: ControlTreeIndex;
    actionService: ActionService;
    resourceBundle: ResourceBundle;
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
}

export type QuickActionActivationData = {
    isActive: boolean;
    title: string;
};

export type QuickActionExecuteFunction = () => FlexCommand[] | Promise<FlexCommand[]>;

export interface SimpleQuickActionDefinition {
    readonly kind: typeof SIMPLE_QUICK_ACTION_KIND;
    readonly type: string;
    readonly id: string;
    readonly forceRefreshAfterExecution?: boolean;
    isActive: boolean;
    initialize: () => void | Promise<void>;
    getActionObject: () => SimpleQuickAction;
    execute: () => FlexCommand[] | Promise<FlexCommand[]>;
}

export interface NestedQuickActionDefinition {
    readonly kind: typeof NESTED_QUICK_ACTION_KIND;
    readonly type: string;
    readonly id: string;
    readonly forceRefreshAfterExecution?: boolean;
    isActive: boolean;
    initialize: () => void | Promise<void>;
    getActionObject: () => NestedQuickAction;
    execute: (path: string) => FlexCommand[] | Promise<FlexCommand[]>;
}
export type QuickActionDefinition = SimpleQuickActionDefinition | NestedQuickActionDefinition;

export interface QuickActionDefinitionConstructor<T extends QuickActionDefinition> {
    new (context: QuickActionContext): T;
}

export interface DefinitionRegistry {
    listPage: QuickActionDefinitionConstructor<QuickActionDefinition>[];
    objectPage: QuickActionDefinitionConstructor<QuickActionDefinition>[];
}

export interface QuickActionDefinitionGroup {
    title: string;
    definitions: QuickActionDefinitionConstructor<QuickActionDefinition>[];
    view: XMLView;
    key: string;
}
