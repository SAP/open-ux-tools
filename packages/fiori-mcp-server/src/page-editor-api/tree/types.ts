import type { ArtifactType, PropertyMessageType } from '@sap/ux-specification';
import type { JSONSchema4 } from 'json-schema';

export type PropertyPath = Array<string | number>;

export enum SortingOptions {
    Enabled = 'Enabled',
    Excluded = 'Excluded',
    Readonly = 'Readonly'
}

// Interface should be recieved from specification in future versions
export interface SettingOption {
    schema: JSONSchema4;
    value?: unknown;
    pattern?: string;
    description?: string;
    isAtomic?: boolean;
    i18nClassification?: string;
    name: string;
    freeText?: boolean;
    artifactType?: ArtifactType;
    required?: boolean;
    minimum?: number;
    messages?: PropertyMessageType[];
    locations?: Location[];
    disabled?: boolean;
    displayName?: string;
}

export interface AllowedMoveRange {
    from: number;
    to: number;
}

// Interface should be recieved from specification in future versions
export interface ObjectAggregation {
    path: PropertyPath;
    aggregations: { [key: string]: ObjectAggregation };
    properties: { [key: string]: SettingOption };
    additionalText?: string;
    schema?: JSONSchema4;
    sortableList?: boolean;
    sortableItem?: SortingOptions;
    sortableCollection?: string;
    description?: string;
    value: unknown;
    parent?: ObjectAggregation;
    custom?: boolean;
    isViewNode?: boolean;
    name?: string;
    annotationNodeId?: number[];
    artifactType?: ArtifactType;
    virtual?: boolean;
    getAggregationKeys: (viewNodesOnly?: boolean) => Array<string>;
    getDisplayName: () => string;
    getTechnicalName: () => string | undefined;
    getAllowedDropRange: (source: ObjectAggregation) => AllowedMoveRange[] | undefined;
}
