import { CustomElement, InternalCustomElement, Position } from '../common/types';

export enum ControlType {
    header = 'header',
    footer = 'footer',
    section = '@com.sap.vocabularies.UI.v1.FieldGroup',
    table = '@com.sap.vocabularies.UI.v1.LineItem'
}

export interface CustomActionTarget {
    page: string;
    control: ControlType;
    navProperty?: string;
    qualifier?: string;
}

export interface CustomAction extends CustomElement {
    target: CustomActionTarget;
    settings: {
        text: string;
        visible?: string | true;
        enabled?: string | true;
        position?: Position;
    };
}

export interface InternalCustomAction extends CustomAction, InternalCustomElement {
    controller: {
        base: string;
        name: string;
    };
}
