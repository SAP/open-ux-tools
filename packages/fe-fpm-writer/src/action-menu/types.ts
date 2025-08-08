import type { CustomElement, Position } from '../common/types';

export enum TargetControl {
    header = 'header',
    body = 'body',
    //    footer = 'footer',
    section = '@com.sap.vocabularies.UI.v1.FieldGroup',
    table = '@com.sap.vocabularies.UI.v1.LineItem'
}

export interface ActionMenuTarget {
    page: string;
    control: TargetControl;
    customSectionKey?: string;
    navProperty?: string;
    qualifier?: string;
}

export interface ActionMenu extends CustomElement {
    target: ActionMenuTarget;
    settings: {
        text: string;
        actions: string[];
        position?: Position;
    };
}
