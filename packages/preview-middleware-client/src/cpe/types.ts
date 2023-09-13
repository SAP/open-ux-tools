import type { ExternalAction, IconDetails } from '@sap-ux-private/control-property-editor-common';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type Element from 'sap/ui/core/Element';
import type { ID } from 'sap/ui/core/library';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type Component from 'sap/ui/core/Component';

export interface UI5AdaptationOptions {
    rta: RuntimeAuthoring;
}

export type PrimitiveTypes = 'boolean' | 'enum' | 'float' | 'string' | 'any';
export type PropertyValue = boolean | object | number | string;

export interface UI5ControlProperty {
    defaultValue: unknown;
    enumValues: { [key: string]: string } | null;
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

export type ActionHandler = (action: ExternalAction) => Promise<void>;
export type ActionSenderFunction = (action: ExternalAction) => void;
export type SubscribeFunction = (handler: ActionHandler) => void;

export interface Service {
    init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): void;
}

export interface UI5Facade {
    getControlById: <T extends Element>(id: ID) => T | undefined;
    getIcons: () => IconDetails[];
    getComponent: <T extends Component>(id: ID) => T | undefined;
    getOverlay: <T extends ElementOverlay>(control: Element) => T | undefined;
    getClosestOverlayFor: <T extends ElementOverlay>(control: Element) => T | undefined;
}
