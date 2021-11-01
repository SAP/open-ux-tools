import { CustomElement } from '../common/types';

export enum ControlType {
    header = 'header',
    footer = 'footer',
    facet = '@com.sap.vocabularies.UI.v1.FieldGroup',
    table = 'items/@com.sap.vocabularies.UI.v1.LineItem'
}

export interface CustomActionTarget {
    page: string;
    control: ControlType;
    qualifier?: string;
}

export interface CustomAction extends CustomElement {
    target: CustomActionTarget;
    settings: {
        text: string;
        visible?: string | true;
        enabled?: string | true;
        position?: {
            placement: 'Before' | 'After';
            anchor: string;
        };
    };
}

export interface InternalCustomAction extends CustomAction {
    controller: string;
}
