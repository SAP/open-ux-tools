import type { CustomElement, InternalCustomElement, Views, EventHandler } from '../common/types';

export interface CustomView extends CustomElement, EventHandler {
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
