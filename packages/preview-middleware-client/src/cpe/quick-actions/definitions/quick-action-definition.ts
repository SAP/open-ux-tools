import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import { ControlTreeIndex } from '../../types';

export interface ActivationContext {
    controlIndex: ControlTreeIndex;
}

export interface ExecutionContext {
    controlIndex: ControlTreeIndex;
    // TODO: we should not access RTA directly,
    // provide flex settings and a method for modifying command stack instead (or return a command and service can call the "pushAndExecute" method).
    rta: RuntimeAuthoring;
    actionService: unknown;
}

export type QuickActionActivationFunction = (context: ActivationContext) => boolean;
export type QuickActionExecuteFunction =
    | ((context: ExecutionContext) => void)
    | ((context: ExecutionContext) => Promise<void>);

export interface QuickActionDefinition {
    type: string;
    title: string;
    isActive: QuickActionActivationFunction;
    execute: QuickActionExecuteFunction;
}
