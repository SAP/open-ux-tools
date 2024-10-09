import type { ExternalAction, OutlineNode } from '@sap-ux-private/control-property-editor-common';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

export interface UI5AdaptationOptions {
    rta: RuntimeAuthoring;
}

export type PrimitiveTypes = 'boolean' | 'enum' | 'float' | 'string' | 'any';
export type PropertyValue = boolean | object | number | string;

export interface UI5ControlProperty {
    defaultValue: unknown;
    enumValues: Record<string,string> | undefined;
    isArray: boolean;
    isDeprecated: boolean;
    isEnabled: boolean;
    isIcon: boolean;
    name: string;
    primitiveType: string;
    ui5Type: string | null;
    value: PropertyValue;
}

export interface UI5ControlData {
    allowIndexForDefaultAggregation: boolean;
    defaultAggregation: string;
    id: string;
    properties: UI5ControlProperty[];
    selectedControlChildren: string[];
    selectedControlName: string;
    targetAggregation: string[];
    type: string;
}

export type ActionHandler = (action: ExternalAction) => void | Promise<void>;
export type ActionSenderFunction = (action: ExternalAction) => void;
export type SubscribeFunction = (handler: ActionHandler) => void;
export type UnSubscribeFunction = (handler: ActionHandler) => void;

export interface Service {
    init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): void | Promise<void>;
}

export interface ControlTreeIndex {
    [controlType: string]: OutlineNode[]
}