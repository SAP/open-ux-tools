import type { CustomElement, InternalCustomElement, Position, EventHandler } from '../common/types';

export enum TargetControl {
    header = 'header',
    footer = 'footer',
    section = '@com.sap.vocabularies.UI.v1.FieldGroup',
    table = '@com.sap.vocabularies.UI.v1.LineItem'
}

export interface CustomActionTarget {
    page: string;
    control: TargetControl;
    navProperty?: string;
    qualifier?: string;
}

export interface CustomActionSettings extends EventHandler {
    text: string;
    visible?: string | true;
    enabled?: string | true;
    requiresSelection?: boolean;
    position?: Position;
}

export interface CustomAction extends CustomElement {
    target: CustomActionTarget;
    settings: CustomActionSettings;
}

export type InternalCustomAction = CustomAction & InternalCustomElement;
