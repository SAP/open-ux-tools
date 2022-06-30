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

export interface CustomAction extends CustomElement, EventHandler {
    target: CustomActionTarget;
    settings: {
        text: string;
        visible?: string | true;
        enabled?: string | true;
        requiresSelection?: boolean;
        position?: Position;
    };
}

export type InternalCustomAction = CustomAction & InternalCustomElement;
