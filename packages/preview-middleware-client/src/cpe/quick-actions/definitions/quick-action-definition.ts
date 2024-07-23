import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ActionHandler, ControlTreeIndex } from '../../types';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import { ExternalAction } from '@sap-ux-private/control-property-editor-common';

export interface BaseContext {
    controlIndex: ControlTreeIndex;
    actionService: unknown;
    rta: RuntimeAuthoring;
}

export interface ActivationContext extends BaseContext {
    manifest: Manifest;
}

export interface ExecutionContext extends BaseContext {
    // TODO: we should not access RTA directly,
    // provide flex settings and a method for modifying command stack instead (or return a command and service can call the "pushAndExecute" method).
    //rta: RuntimeAuthoring;
    onQuickActionExecution: () => OnQuickActionExectutionReturnType;
}

export interface OnQuickActionExectutionReturnType {
    subscribe: (handler: ActionHandler) => void, unSubscribe: (handler: ActionHandler) => void
}
export type QuickActionActivationFunction = (context: ActivationContext) => boolean | Promise<boolean>;
export type QuickActionFunctionGetChildren = (context: BaseContext) => string[];
export type QuickActionExecuteFunction =
    | ((context: ExecutionContext, index?: number) => void)
    | ((context: ExecutionContext, index?: number) => Promise<void>);

export interface QuickActionDefinition {
    type: string;
    title: string;
    isActive: QuickActionActivationFunction;
    execute: QuickActionExecuteFunction;
    children?: QuickActionFunctionGetChildren;
}
