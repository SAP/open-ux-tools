import type { ExternalAction, IconDetails } from '../../api';

export interface UI5AdaptationOptions {
    rta: sap.ui.rta.RuntimeAuthoring;
    componentId: string;
    layer: sap.ui.fl.Layer;
    generator: string;
}

export type PrimitiveTypes = 'boolean' | 'enum' | 'float' | 'string' | 'any';
export type ControlId = string;
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
    id: ControlId;
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
    getControlById: <T extends sap.ui.core.Element>(id: sap.ui.core.ID) => T | undefined;
    getIcons: () => IconDetails[];
    getComponent: <T extends sap.ui.core.Component>(id: sap.ui.core.ID) => T | undefined;
    getOverlay: <T extends sap.ui.dt.ElementOverlay>(control: sap.ui.core.Element) => T | undefined;
    getClosestOverlayFor: <T extends sap.ui.dt.ElementOverlay>(control: sap.ui.core.Element) => T | undefined;
}
