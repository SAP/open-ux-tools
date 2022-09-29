import type { CustomElement, InternalCustomElement, Position, EventHandler } from '../common/types';

export interface CustomSection extends CustomElement, EventHandler {
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
     * Optional control XML that will be generated into the fragment of section. If the property isn't provided then a sample control will be generated.
     */
    control?: string;
}

export interface CustomSectionDependencies {
    [key: string]: string;
}

export interface InternalCustomSection extends CustomSection, InternalCustomElement {
    content: string;
    dependencies?: CustomSectionDependencies;
}
