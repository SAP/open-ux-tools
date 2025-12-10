import type { ArtifactType, PropertyMessage } from '@sap/ux-specification/dist/types/src';
import type { JSONSchema4 } from 'json-schema';

export type PropertyPath = Array<string | number>;

export enum SortingOptions {
    Enabled = 'Enabled',
    Excluded = 'Excluded',
    Readonly = 'Readonly'
}

export interface SettingOption {
    schema: JSONSchema4;
    value?: unknown;
    pattern?: string;
    description?: string;
    isAtomic?: boolean;
    // Language dependency. String represents annotation comment
    i18nClassification?: string;
    name: string;
    freeText?: boolean;
    artifactType?: ArtifactType;
    required?: boolean;
    minimum?: number;
    messages?: PropertyMessage[];
    locations?: Location[];
    disabled?: boolean;
    displayName?: string;
}

export interface AllowedMoveRange {
    from: number;
    to: number;
}

export interface ObjectAggregation {
    // Path
    path: PropertyPath;
    // Standard properties for aggregation and properties
    aggregations: { [key: string]: ObjectAggregation };
    properties: { [key: string]: SettingOption };
    // additionalProperties?: ObjectAggregation;
    // // Properties variants - multiple variation of properties and aggregations. Depending on values - other properties or aggregation may be hidden/disabled.
    // variants: Array<AggregationVariant> = [];
    // // Class for child aggregations
    // childClass?: typeof ObjectAggregation;
    // // Additional information text
    additionalText?: string;
    // // Aggregation actions
    // locations?: Location[];
    // actions?: SupportedAggregationActions;
    // // Inactive
    // inactive?: boolean;
    // // Original schema data
    schema?: JSONSchema4;
    // // Public creation form - (+) button would appear on UI and form will be opened
    // annotationCreationForms: CreationFormOptions[] = [];
    // allowedAnnotationCreationForms?: AggregationCreationForm[] = [];
    // schemaCreationForms: CreationFormOptions[] = [];
    // formSchema?: ObjectAggregation;

    sortableList?: boolean;
    sortableItem?: SortingOptions;
    sortableCollection?: string;
    // sortableReadonlyTooltip?: string;
    // sortableConfigOnly?: boolean;
    // order?: number;
    // // Property description
    description?: string;
    // // Aggregation i18n key
    // i18nKey?: string;
    // // Validation state
    // state?: ValidationState = ValidationState.Valid;
    // messages?: PropertyMessage[];
    value: unknown;
    // // Aggregation type - currently object or array
    // readonly type: AggregationType = AggregationType.Object;
    // // Reference to parent aggregation
    parent?: ObjectAggregation;
    // // Custom
    custom?: boolean;

    isViewNode?: boolean;

    // isTable = false;

    // pattern?: string;

    name?: string;

    // union?: AggregationUnion;

    annotationNodeId?: number[];
    // dropUINodes?: Record<string, boolean>;
    // // Is aggregation pending and not fully ready for edit
    // pending?: PendingChange;
    // hidden?: boolean;
    // // Aggregation's artifact type
    artifactType?: ArtifactType;
    virtual?: boolean;
    // icon?: string;
    // isAtomic?: boolean;

    getAggregationKeys: (viewNodesOnly?: boolean) => Array<string>;
    getDisplayName: () => string;
    getTechnicalName: () => string | undefined;
    getAllowedDropRange: (source: ObjectAggregation) => AllowedMoveRange[] | undefined;
}
