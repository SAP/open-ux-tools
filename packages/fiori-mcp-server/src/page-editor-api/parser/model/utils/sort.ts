import type { ObjectAggregation } from '../ObjectAggregation';

export enum SortReferencePosition {
    After = 'After',
    Before = 'Before',
    Replace = 'Replace'
}

export interface ReordableAggregations<T extends ObjectAggregation> {
    [key: string]: T;
}

export interface RelationPosition {
    anchor?: string | null;
    placement?: string | null;
    position?: SortReferencePosition;
}

export interface SiblingPosition<T extends ObjectAggregation> {
    id: string;
    order: number;
    aggregation: T;
}

export interface DefaultExtensionPosition {
    position?: {
        anchor?: string | null;
        placement?: string | null;
    };
}

// In V2 we can not reffer custom extenstion to another custom extension
// In result we have two sorting approaches
export enum SortingApproach {
    Normal = 'Normal',
    WithIds = 'WithIds',
    WithIndices = 'WithIndices'
}
