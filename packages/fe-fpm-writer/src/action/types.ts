import type { CustomElement, InternalCustomElement, Position, TextFragmentInsertion } from '../common/types';

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
     * JS file name - existing or new.
     */
    fileName?: string;
    /**
     * Function name. If undefined then `onPress` is used as default value.
     */
    fnName?: string;
    /**
     * If file exists, then existing file should be appended with passed script fragment.
     */
    insertScript?: TextFragmentInsertion;
}

export type CustomActionEventHandler = string | CustomActionNewEventHandler;

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
