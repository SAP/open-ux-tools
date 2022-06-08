import type { CustomElement, InternalCustomElement } from '../common/types';

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
     * If not set (i.e. undefined) then no event handler is linked. If it is set true, a new one is created and linked to the action.
     * If an existing event handler is to be used then its id needs to be provided as string.
     */
    eventHandler?: string | true;

    /**
     * If set, a sample table control XML will be generated into the fragment of the view.
     */
    tableControl?: true;
}

export interface InternalCustomView extends CustomView, InternalCustomElement {
    content: string;
}
