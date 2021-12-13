import { CustomElement, InternalCustomElement, Position } from '../common/types';

/**
 * Target section file format - currently only xml fragment is supported.
 */
export const CUSTOM_SECTION_XML_FRAGMENT = 'XMLFragment';

export interface CustomSection extends CustomElement {
    /**
     * Name of the routing target
     */
    target: string;

    /**
     * The header is shown on the section as header, as well as in tab item.
     */
    title: string;

    /**
     * Defines the position of the section relative to other sections.
     */
    position: Position;

    /**
     * If not set (i.e. undefined) then no event handler is linked. If it is set true, a new one is created and linked to the action.
     * If an existing event handler is to be used then its id needs to be provided as string.
     */
    eventHandler?: string | true;

    /**
     * Optional control XML that will be generated into the fragment of section. If the property isn't provided then a sample control will be generated.
     */
    control?: string;
}

export interface InternalCustomSection extends CustomSection, InternalCustomElement {
    content: string;
    type: typeof CUSTOM_SECTION_XML_FRAGMENT;
}
