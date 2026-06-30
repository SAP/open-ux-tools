/**
 * Where an RTA command runs: the editor URL and an optional iframe id.
 * Used both as a per-command target and as the per-session record kept by the tool dispatcher.
 */
export interface EditorPage {
    /** Editor URL returned by `open_adaptation_editor`. */
    site: string;
    /** Optional iframe element id (e.g. `"preview"`) to scope the call to. */
    frameId?: string;
}

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
    /**
     * Control id of the closest editable ancestor in the overlay tree, or
     * `null` when this overlay sits at the editable root.
     */
    parentElementId: string | null;
    /** Aggregation name on the parent that holds this control. */
    parentAggregationName?: string;
    /**
     * 0-based position in the parent's multi-cardinality aggregation. Omitted
     * for single-cardinality aggregations or when the parent/aggregation
     * cannot be resolved.
     */
    index?: number;
    /**
     * Ids of the RTA actions supported on this overlay. The rich per-action
     * metadata lives in `actionsCatalog` on the enclosing payload so identical
     * action definitions are not duplicated across overlays.
     */
    actionIds: string[];
}

/**
 * Single parameter expected by an RTA action's payload.
 */
export interface ActionParameter {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
}

/**
 * Available RTA action for a control as listed inside the `actionsCatalog`
 * of `getOverlaysInformation`. Each overlay references entries here via
 * its `actionIds`.
 */
export interface Action {
    /** Action id, e.g. `rename`, `remove`, `reveal`, `move`. */
    id: string;
    /** Localized label resolved from the `sap.ui.rta` resource bundle. */
    label?: string;
    /** Long-form description for the LLM, when supplied by the action service. */
    description?: string;
    /** Action parameters; shape comes straight from the action service. */
    parameters?: ActionParameter[];
}

/**
 * One inheritance-chain entry returned by `getContext.aggregationsByClass`.
 * Aggregations are grouped by the class that defined them so the LLM can
 * reason about extension points contributed by base classes.
 */
export interface AggregationsByClass {
    /** Fully-qualified name of the class that declared these aggregations. */
    definedIn: string;
    /** UI5 library that owns `definedIn`. */
    libraryName: string;
    /** Aggregations declared on `definedIn`, with their current content size. */
    aggregations: Array<{
        name: string;
        controlType: string;
        contentLength: number;
    }>;
}

/**
 * One entry of `getContext.availableModels`, describing a UI5 model attached
 * to (or propagated onto) the inspected control.
 */
export interface AvailableModel {
    /** Model name (the propagated/binding key), `"undefined"` for the default model. */
    modelName: string;
    /** Fully-qualified UI5 class name of the model. */
    modelClass: string;
    /** Default binding mode of the model, when exposed. */
    defaultBindingMode: string | null;
    /** Binding path active on this element, or `null` when no context is set. */
    contextPath: string | null;
    /** OData entity type of the active context, when resolvable. */
    contextEntityType: string | null;
}

/**
 * Element context reported by `getContext`. The structural fields below are
 * always populated on success; `actionSpecificContext` carries free-form
 * extensions from the individual action's `getContext` hook.
 */
export interface ElementContext {
    /** Fully-qualified UI5 type of the inspected control, e.g. `sap.m.Button`. */
    elementType: string;
    /** Aggregation name on the control's parent that holds this control. */
    parentAggregationName?: string;
    /** Parameter declarations for the action, as reported by the action service. */
    actionParameters?: ActionParameter[];
    /**
     * The control's default aggregation together with its current children's
     * ids. Omitted when the control has no default aggregation.
     */
    defaultChildAggregation?: {
        name: string;
        controlType: string;
        content: Array<{ controlId: string }>;
    };
    /**
     * Aggregations declared along the inheritance chain, grouped by the
     * class that declared them. Populated only when the action accepts an
     * `aggregation`/`selectedElements` parameter; empty otherwise.
     */
    aggregationsByClass: AggregationsByClass[];
    /** Models reachable from this control (own + propagated). */
    availableModels: Record<string, AvailableModel>;
    /** Free-form action-specific extensions returned by the action's `getContext`. */
    actionSpecificContext: Record<string, unknown>;
}

/**
 * Per-action lookup returned alongside `Overlay[]` from `getOverlaysInformation`.
 * Keyed by action id; entries deduplicate metadata shared across overlays.
 */
export type ActionsCatalog = Record<string, Action>;
