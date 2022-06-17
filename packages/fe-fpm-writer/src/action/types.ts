import type { CustomElement, InternalCustomElement, Position, FileContentPosition } from '../common/types';

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

export interface CustomActionNewEventHandler {
    /**
     * JS file name
     */
    fileName?: string;
    /**
     * Function name
     */
    fnName?: string;
    /**
     * If file exists, then new method should be inserted in to passed position
     */
    insertPosition?: FileContentPosition;
    /**
     * Prepend comma before new function snippet
     */
    prependComma?: boolean;
}

export type CustomActionEventHandler = string | true | CustomActionNewEventHandler;

export interface CustomAction extends CustomElement {
    target: CustomActionTarget;
    settings: {
        text: string;
        visible?: string | true;
        enabled?: string | true;
        requiresSelection?: boolean;
        position?: Position;
        /**
         * If not set (i.e. undefined) then no event handler is linked. If it is set true, a new one is created and linked to the action.
         * If an existing event handler is to be used then its id needs to be provided as string.
         * Object with 'CustomActionNewEventHandler' provides option to append existing js file with new action.
         */
        eventHandler?: CustomActionEventHandler;
    };
}

export type InternalCustomAction = CustomAction & InternalCustomElement;
