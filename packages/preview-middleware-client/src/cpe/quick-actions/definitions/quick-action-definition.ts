import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ControlTreeIndex } from '../../types';
import { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import { RTAActionServiceAPI } from '../quick-action-service';

export interface BaseContext {
    controlIndex: ControlTreeIndex;
    actionService: RTAActionServiceAPI | undefined;
    rta: RuntimeAuthoring;
}

export interface ActivationContext extends BaseContext {
    manifest: Manifest;
}

export interface ExecutionContext extends BaseContext {
    // TODO: we should not access RTA directly,
    // provide flex settings and a method for modifying command stack instead (or return a command and service can call the "pushAndExecute" method).
    //rta: RuntimeAuthoring;
}

export type QuickActionActivationData<T = undefined> = {
    isActive: boolean;
    title: string;
    executionPayload?: T;
    children?: string[];
};
export type QuickActionActivationFunction<T> = (
    context: ActivationContext
) => QuickActionActivationData<T> | Promise<QuickActionActivationData<T>>;
export type QuickActionFunctionGetChildren = (context: BaseContext) => string[];
export type QuickActionExecuteFunction = (
    context: ExecutionContext,
    index?: number,
    payload?: unknown
) => void | Promise<void>;

export interface QuickActionDefinition<T> {
    type: string;
    getActivationData: QuickActionActivationFunction<T>;
    execute: QuickActionExecuteFunction;
}
