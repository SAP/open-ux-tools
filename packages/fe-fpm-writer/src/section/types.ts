import type {
    CustomElement,
    InternalCustomElement,
    Position,
    EventHandler,
    CustomFragment,
    FragmentContentData
} from '../common/types';

export interface CustomSection extends CustomElement, EventHandler, CustomFragment {
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
    position?: Position;

    /**
     * Optional control XML that will be generated into the fragment of section. If the property isn't provided then a sample control will be generated.
     */
    control?: string;
}

export interface InternalCustomSection
    extends CustomHeaderSection,
        CustomSection,
        CustomSubSection,
        InternalCustomElement,
        FragmentContentData {
    dependencies?: string;
}

export type HeaderSectionEditProperty = Pick<CustomElement, 'name' | 'folder'> & EventHandler;

export enum RequestGroupId {
    Heroes = 'Heroes',
    Decoration = 'Decoration',
    Workers = 'Workers',
    LongRunners = 'LongRunners'
}

export enum DesignTime {
    Default = 'Default',
    NotAdaptableVisibility = 'not-adaptable-visibility',
    NotAdaptable = 'not-adaptable',
    NotAdaptableTree = 'not-adaptable-tree',
    NotRemovable = 'not-removable'
}

interface FlexSettings {
    designtime: DesignTime;
}

export interface CustomHeaderSection extends CustomSection {
    /**
     * Sub title of header section.
     */
    subTitle?: string;
    /**
     * The fragment for the editable version of the header facet.
     */
    edit?: HeaderSectionEditProperty;
    /**
     * Defines if the header facet is stashed in personalization.
     */
    stashed?: boolean;
    /**
     * Defines the Loading Behavior of Object Page Headers.
     */
    requestGroupId: RequestGroupId;
    /**
     * Defines the key user adaptation behavior of the header facet.
     */
    flexSettings: FlexSettings;
}

export interface CustomSubSection extends CustomSection {
    /**
     * Id of parent section.
     */
    parentSection: string;
}
