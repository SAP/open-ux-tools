import type { Location } from '@sap-ux/odata-annotation-core-types';

export interface ValueWithOrigin<T> {
    value: T;
    location?: Location;
}

export interface BaseAnnotationDefinition<T> {
    term: T;
    target: ValueWithOrigin<string>;
    qualifier?: ValueWithOrigin<string>;

    location?: Location;
}

export interface Record<T> {
    type: T;
    location?: Location;
}

export const UI_LINE_ITEM = 'UI.LineItem';

export interface UILineItemDefinition extends BaseAnnotationDefinition<typeof UI_LINE_ITEM> {
    items: UIDataFieldDefinition[];
}

export const UI_DATA_FIELD = 'UI.DataField';
export interface UIDataFieldDefinition extends Record<typeof UI_DATA_FIELD> {
    value: ValueWithOrigin<string>;
    label?: ValueWithOrigin<string>;
}
export const UI_FIELD_GROUP = 'UI.FieldGroup';

export interface UIFieldGroupDefinition extends BaseAnnotationDefinition<typeof UI_FIELD_GROUP> {
    data: Array<UIDataFieldDefinition>;
}

export const UI_FACETS = 'UI.Facets';

export interface UIFacetsDefinition extends BaseAnnotationDefinition<typeof UI_FACETS> {
    facets: Array<UIReferenceFacetDefinition>;
}

export const UI_REFERENCE_FACET = 'UI.ReferenceFacet';
export interface UIReferenceFacetDefinition extends Record<typeof UI_REFERENCE_FACET> {
    id: ValueWithOrigin<string>;
    /**
     * Only supports field groups on the same target.
     */
    target: ValueWithOrigin<string>;
    label?: ValueWithOrigin<string>;
}

export type SupportedAnnotations = ODataAnnotations['term'];
export type ODataAnnotations = UILineItemDefinition | UIFacetsDefinition | UIFieldGroupDefinition;
