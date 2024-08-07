import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import type { ActionService } from 'sap/ui/rta/service/Action';
import type XMLView from 'sap/ui/core/mvc/XMLView';

import { NESTED_QUICK_ACTION_KIND, NestedQuickAction, SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { ControlTreeIndex } from '../types';

export interface QuickActionActivationContext {
    controlIndex: ControlTreeIndex;
    actionService: ActionService;
    manifest: Manifest;
}

export interface QuickActionContext {
    controlIndex: ControlTreeIndex;
    actionService: ActionService;
    view: XMLView;
    key: string;
    // TODO: we should not access RTA directly,
    // provide flex settings and a method for modifying command stack instead (or return a command and service can call the "pushAndExecute" method).
    rta: RuntimeAuthoring;
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
    isActive: boolean;
    initialize: () => void | Promise<void>;
    getActionObject: () => SimpleQuickAction;
    execute: () => FlexCommand[] | Promise<FlexCommand[]>;
}

export interface NestedQuickActionDefinition {
    readonly kind: typeof NESTED_QUICK_ACTION_KIND;
    readonly  type: string;
    readonly id: string;
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

// export interface SimpleQuickActionDefinitionConstructor {
//     new (context: QuickActionContext): SimpleQuickActionDefinition;
// }
// export interface NestedQuickActionDefinitionConstructor {
//     new (context: QuickActionContext): NestedQuickActionDefinition;
// }
// export type QuickActionDefinitionConstructor = SimpleQuickActionDefinitionConstructor | NestedQuickActionDefinitionConstructor;
