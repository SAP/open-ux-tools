import type {
    CustomElement,
    InternalCustomElement,
    Position,
    EventHandler,
    CustomFragment,
    FragmentContentData
} from '../common/types';

/**
 * Custom Field.
 *
 */
export interface CustomField extends CustomElement, EventHandler, CustomFragment {
    /**
     * Name of the routing target.
     */
    target: string;
    /**
     * Name of the target entity for the control configuration.
     */
    targetEntity: string;
    /**
     * The label is shown on the form as the label of the field.
     */
    label: string;
    /**
     * Defines the position of the field relative to other fields.
     */
    position?: Position;

    /**
     * Optional control XML that will be generated into the fragment of field. If the property isn't provided then a sample control will be generated.
     */
    control?: string;
}

export type InternalCustomField = CustomField & InternalCustomElement & FragmentContentData;
