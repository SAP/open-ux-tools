import type { CustomElement, InternalCustomElement, Views } from '../common/types';

export interface CustomView extends CustomElement {
    /**
     * Name of the routing target.
     */
    target: string;

    /**
     * View title, is shown in the tab item.
     */
    label: string;

    /**
     * Unique tab identifier.
     */
    key: string;

    /**
     * If set to true, a new controller is created and linked to the action.
     * If an existing event handler is to be used then its id needs to be provided as string.
     */
    eventHandler?: string | true;

    /**
     * Optional control XML that will be generated into the fragment of the view.
     * If set to true, a table macro control will be generated.
     */
    control?: string | true;
}

export interface InternalCustomView extends CustomView, InternalCustomElement {
    content: string;
    existingEventHandler: boolean;
    views: Views;
}
