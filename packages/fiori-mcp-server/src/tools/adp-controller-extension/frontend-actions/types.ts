/**
 * Information about an editable UI5 control reported by Joule's
 * `getOverlaysInformation` frontend action.
 */
export interface Overlay {
    /** Unique identifier of the overlay element. */
    overlayId: string;
    /** UI5 control id (the underlying element). */
    controlId: string;
    /** Human-readable label as resolved by the design-time metadata. */
    label: string;
    /** UI5 control type, e.g. `sap.m.Button`. */
    controlType: string;
}

/**
 * Single payload property expected by an RTA action.
 */
export interface ActionPayloadProperty {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
}

/**
 * Available RTA action for a control as reported by `getActions`.
 */
export interface Action {
    /** Action id, e.g. `rename`, `remove`, `reveal`, `move`. */
    id: string;
    /** Localized label resolved from the `sap.ui.rta` resource bundle. */
    label?: string;
    /** Action parameters; shape comes straight from the action service. */
    payload?: ActionPayloadProperty[];
}

/**
 * Element context reported by `getContext`. Some properties are
 * action-specific extensions; the structural ones below are always present
 * on success.
 */
export interface ElementContext {
    /** Aggregation name on the control's parent that holds this control. */
    parentAggregationName?: string;
    /** Default aggregation name on this control. */
    defaultChildAggregationName?: string;
    /** Type expected by the default aggregation. */
    controlType?: string;
    /** Direct children of the default aggregation. */
    content?: Array<{ controlId: string; label?: string }>;
    /** Action-specific extensions are merged in at the top level. */
    [extra: string]: unknown;
}
