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

const buildEntitySet = ({
    entitySetAnnotations,
    entityTypeAnnotations
}: {
    entitySetAnnotations?: Record<string, unknown>;
    entityTypeAnnotations?: Record<string, unknown>;
}): EntitySet =>
    ({
        ...BASE_ENTITY_SET,
        ...(entitySetAnnotations && { annotations: { ...entitySetAnnotations } }),
        entityType: {
            ...BASE_ENTITY_SET.entityType,
            ...(entityTypeAnnotations && { annotations: { ...entityTypeAnnotations } })
        }
    }) as unknown as EntitySet;

describe('metadata', () => {
    describe('findRecursiveHierarchyKey', () => {
        const cases: Array<{
            name: string;
            annotations: Record<string, unknown>;
            expected: string | undefined;
        }> = [
            {
                name: 'returns exact RecursiveHierarchy key when present',
                annotations: HIERARCHY_ANNOTATION,
                expected: 'RecursiveHierarchy'
            },
            {
                name: 'returns qualified RecursiveHierarchy key when exact not present',
                annotations: CUSTOM_HIERARCHY_ANNOTATION,
                expected: 'RecursiveHierarchy#Q1'
            },
            {
                name: 'returns undefined when hierarchy annotations missing',
                annotations: AGGREGATION_ANNOTATION,
                expected: undefined
            }
        ];

        test.each(cases)('$name', ({ annotations, expected }) => {
            const entitySet = buildEntitySet({
                entityTypeAnnotations: annotations
            });

            if (expected === undefined) {
                expect(findRecursiveHierarchyKey(entitySet)).toBeUndefined();
            } else {
                expect(findRecursiveHierarchyKey(entitySet)).toBe(expected);
            }
        });

        describe('getTableCapabilitiesByEntitySet', () => {
            const cases: Array<{
                name: string;
                entitySet: EntitySet;
                requiredTransformations?: readonly string[];
                expected: {
                    hasAggregateTransformations: boolean;
                    hasAggregateTransformationsForEntitySet: boolean;
                    hasRecursiveHierarchyForEntitySet: boolean;
                };
            }> = [
                {
                    name: 'detects aggregate transformations from entity set annotations',
                    entitySet: buildEntitySet({
                        entitySetAnnotations: AGGREGATION_ANNOTATION
                    }),
                    expected: {
                        hasAggregateTransformations: true,
                        hasAggregateTransformationsForEntitySet: true,
                        hasRecursiveHierarchyForEntitySet: false
                    }
                },
                {
                    name: 'detects aggregate transformations from entity type annotations',
                    entitySet: buildEntitySet({
                        entityTypeAnnotations: AGGREGATION_ANNOTATION
                    }),
                    requiredTransformations: ['filter'],
                    expected: {
                        hasAggregateTransformations: true,
                        hasAggregateTransformationsForEntitySet: true,
                        hasRecursiveHierarchyForEntitySet: false
                    }
                },
                {
                    name: 'returns false for required transformations when not all are present',
                    entitySet: buildEntitySet({
                        entityTypeAnnotations: AGGREGATION_ANNOTATION
                    }),
                    requiredTransformations: ['filter', 'groupby'],
                    expected: {
                        hasAggregateTransformations: true,
                        hasAggregateTransformationsForEntitySet: false,
                        hasRecursiveHierarchyForEntitySet: false
                    }
                },
                {
                    name: 'returns false when transformations are empty',
                    entitySet: buildEntitySet({
                        entityTypeAnnotations: AGGREGATION_WITH_EMPTY_TRANSFORMATIONS_ANNOTATION
                    }),
                    expected: {
                        hasAggregateTransformations: false,
                        hasAggregateTransformationsForEntitySet: false,
                        hasRecursiveHierarchyForEntitySet: false
                    }
                },
                {
                    name: 'detects recursive hierarchy via qualified key (derived from real metadata)',
                    entitySet: buildEntitySet({
                        entityTypeAnnotations: CUSTOM_HIERARCHY_ANNOTATION
                    }),
                    expected: {
                        hasAggregateTransformations: false,
                        hasAggregateTransformationsForEntitySet: false,
                        hasRecursiveHierarchyForEntitySet: true
                    }
                }
            ];

            test.each(cases)('$name', ({ entitySet, requiredTransformations, expected }) => {
                const result = getTableCapabilitiesByEntitySet(entitySet, requiredTransformations);
                expect(result).toEqual(expected);
            });
        });
    });
});
