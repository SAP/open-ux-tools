import type { EntitySet } from '@sap-ux/vocabularies-types';
import { findRecursiveHierarchyKey, getTableCapabilitiesByEntitySet } from '../../src/odata/metadata';

const BASE_ENTITY_SET = {
    name: 'TestEntity',
    entityTypeName: 'TestType',
    entityType: {
        name: 'TestType',
        annotations: {},
        keys: [],
        properties: [],
        navigationProperties: []
    }
} as const;

const HIERARCHY_ANNOTATION = {
    'Hierarchy': {
        'RecursiveHierarchy': {
            NodeProperty: {
                $PropertyPath: 'NodeId'
            },
            ParentNavigationProperty: {
                $NavigationPropertyPath: 'Parent'
            }
        }
    }
} as const;

const CUSTOM_HIERARCHY_ANNOTATION = {
    'Hierarchy': {
        'RecursiveHierarchy#Q1': {
            NodeProperty: {
                $PropertyPath: 'NodeId'
            },
            ParentNavigationProperty: {
                $NavigationPropertyPath: 'Parent'
            }
        }
    }
} as const;

const AGGREGATION_ANNOTATION = {
    Aggregation: {
        ApplySupported: {
            Transformations: ['filter', 'orderby']
        }
    }
} as const;

const AGGREGATION_WITH_EMPTY_TRANSFORMATIONS_ANNOTATION = {
    Aggregation: {
        ApplySupported: {
            Transformations: []
        }
    }
} as const;

describe('metadata', () => {
    describe('findRecursiveHierarchyKey', () => {
        test('returns exact RecursiveHierarchy key when present', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                entityType: { ...BASE_ENTITY_SET.entityType, annotations: { ...HIERARCHY_ANNOTATION } }
            } as unknown as EntitySet;

            expect(findRecursiveHierarchyKey(entitySet)).toBe('RecursiveHierarchy');
        });

        test('returns qualified RecursiveHierarchy key when exact not present', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                entityType: { ...BASE_ENTITY_SET.entityType, annotations: { ...CUSTOM_HIERARCHY_ANNOTATION } }
            } as unknown as EntitySet;

            expect(findRecursiveHierarchyKey(entitySet)).toBe('RecursiveHierarchy#Q1');
        });

        test('returns undefined when hierarchy annotations missing', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                entityType: { ...BASE_ENTITY_SET.entityType, annotations: { ...AGGREGATION_ANNOTATION } }
            } as unknown as EntitySet;

            expect(findRecursiveHierarchyKey(entitySet)).toBeUndefined();
        });
    });

    describe('getTableCapabilitiesByEntitySet', () => {
        test('detects aggregate transformations from entity set annotations', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                annotations: { ...AGGREGATION_ANNOTATION }
            } as unknown as EntitySet;

            const result = getTableCapabilitiesByEntitySet(entitySet);
            expect(result).toEqual({
                hasAggregateTransformations: true,
                hasAggregateTransformationsForEntitySet: true,
                hasRecursiveHierarchyForEntitySet: false
            });
        });

        test('detects aggregate transformations from entity type annotations', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                entityType: {
                    ...BASE_ENTITY_SET.entityType,
                    annotations: { ...AGGREGATION_ANNOTATION }
                }
            } as unknown as EntitySet;

            const result = getTableCapabilitiesByEntitySet(entitySet, ['filter']);
            expect(result).toEqual({
                hasAggregateTransformations: true,
                hasAggregateTransformationsForEntitySet: true,
                hasRecursiveHierarchyForEntitySet: false
            });
        });

        test('returns false for required transformations when not all are present', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                entityType: {
                    ...BASE_ENTITY_SET.entityType,
                    annotations: { ...AGGREGATION_ANNOTATION }
                }
            } as unknown as EntitySet;
            const result = getTableCapabilitiesByEntitySet(entitySet, ['filter', 'groupby']);
            expect(result).toEqual({
                hasAggregateTransformations: true,
                hasAggregateTransformationsForEntitySet: false,
                hasRecursiveHierarchyForEntitySet: false
            });
        });

        test('returns false when transformations are empty', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                entityType: {
                    ...BASE_ENTITY_SET.entityType,
                    annotations: { ...AGGREGATION_WITH_EMPTY_TRANSFORMATIONS_ANNOTATION }
                }
            } as unknown as EntitySet;

            const result = getTableCapabilitiesByEntitySet(entitySet);
            expect(result).toEqual({
                hasAggregateTransformations: false,
                hasAggregateTransformationsForEntitySet: false,
                hasRecursiveHierarchyForEntitySet: false
            });
        });

        test('detects recursive hierarchy via qualified key (derived from real metadata)', () => {
            const entitySet = {
                ...BASE_ENTITY_SET,
                entityType: { ...BASE_ENTITY_SET.entityType, annotations: { ...CUSTOM_HIERARCHY_ANNOTATION } }
            } as unknown as EntitySet;

            const result = getTableCapabilitiesByEntitySet(entitySet);
            expect(result).toEqual({
                hasAggregateTransformations: false,
                hasAggregateTransformationsForEntitySet: false,
                hasRecursiveHierarchyForEntitySet: true
            });
        });
    });
});
