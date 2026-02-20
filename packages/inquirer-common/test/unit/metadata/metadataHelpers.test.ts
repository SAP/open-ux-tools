import {
    hasRecursiveHierarchyForEntity,
    getRecursiveHierarchyQualifier,
    hasAggregateTransformationsForEntity,
    transformationsRequiredForAnalyticalTable,
    findEntitySetByName,
    shouldUseAnalyticalTable,
    filterAggregateTransformations,
    convertEdmxToConvertedMetadata
} from '../../../src/metadata';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('metadata entity helpers', () => {
    let metadata: ReturnType<typeof convert>;

    beforeAll(() => {
        const edmx = fs.readFileSync(
            path.resolve(__dirname, '../prompts/fixtures/metadataV4WithAggregateTransforms.xml'),
            'utf-8'
        );
        metadata = convert(parse(edmx));
    });

    describe('aggregate transformation helpers', () => {
        describe('filterAggregateTransformations', () => {
            it('should return only entity sets with aggregate transformations in entity set annotations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'EntityWithTransforms',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter', 'orderby', 'groupby']
                                }
                            }
                        },
                        entityType: {}
                    },
                    {
                        name: 'EntityWithoutTransforms',
                        annotations: {},
                        entityType: {}
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('EntityWithTransforms');
            });

            it('should return only entity sets with aggregate transformations in entity type annotations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'EntityWithTypeTransforms',
                        annotations: {},
                        entityType: {
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        'Transformations': ['filter', 'orderby']
                                    }
                                }
                            }
                        }
                    },
                    {
                        name: 'EntityWithoutTransforms',
                        annotations: {},
                        entityType: {
                            annotations: {}
                        }
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('EntityWithTypeTransforms');
            });

            it('should return entity sets with transformations in either entity set or entity type annotations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'EntitySetTransforms',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter']
                                }
                            }
                        },
                        entityType: {}
                    },
                    {
                        name: 'EntityTypeTransforms',
                        annotations: {},
                        entityType: {
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        'Transformations': ['orderby']
                                    }
                                }
                            }
                        }
                    },
                    {
                        name: 'NoTransforms',
                        annotations: {},
                        entityType: {}
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(2);
                expect(result.map((e) => e.name)).toEqual(['EntitySetTransforms', 'EntityTypeTransforms']);
            });

            it('should return empty array when no entity sets have transformations', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'Entity1',
                        annotations: {},
                        entityType: {}
                    },
                    {
                        name: 'Entity2',
                        annotations: {},
                        entityType: {
                            annotations: {}
                        }
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(0);
            });

            it('should return empty array when input array is empty', () => {
                const result = filterAggregateTransformations([]);
                expect(result).toHaveLength(0);
            });

            it('should handle entity sets with partial annotation structures', () => {
                const mockEntitySets: any[] = [
                    {
                        name: 'PartialAnnotations1',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {} // No Transformations property
                            }
                        },
                        entityType: {}
                    },
                    {
                        name: 'PartialAnnotations2',
                        annotations: {
                            'Aggregation': {} // No ApplySupported property
                        },
                        entityType: {}
                    },
                    {
                        name: 'ValidEntity',
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter']
                                }
                            }
                        },
                        entityType: {}
                    }
                ];

                const result = filterAggregateTransformations(mockEntitySets);
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('ValidEntity');
            });
        });

        describe('hasAggregateTransformationsForEntity', () => {
            it('should return true for entities with any transformations when no specific transformations required', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'EntityWithSomeTransforms',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': ['filter', 'orderby'] // Only 2 transformations
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'EntityWithSomeTransforms')).toBe(true);
            });

            it('should return true for entities with all required transformations when specific transformations required', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'CompleteEntity',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': transformationsRequiredForAnalyticalTable
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'CompleteEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(true);
            });

            it('should return false for entities with partial transformations when specific transformations required', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'PartialEntity',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': ['filter', 'orderby', 'search'] // Missing some required transformations
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'PartialEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should return false for entities without transformations', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'NoTransformsEntity',
                            entityType: {
                                annotations: {}
                            }
                        }
                    ]
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'NoTransformsEntity')).toBe(false);
                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'NoTransformsEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should return false for non-existent entity sets', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: []
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'NonExistent')).toBe(false);
                expect(
                    hasAggregateTransformationsForEntity(
                        mockMetadata,
                        'NonExistent',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should work with custom transformation requirements', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'CustomEntity',
                            entityType: {
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': ['filter', 'orderby', 'search']
                                        }
                                    }
                                }
                            }
                        }
                    ]
                };

                const customRequirements = ['filter', 'orderby'];
                expect(hasAggregateTransformationsForEntity(mockMetadata, 'CustomEntity', customRequirements)).toBe(
                    true
                );

                const strictRequirements = ['filter', 'orderby', 'search', 'groupby'];
                expect(hasAggregateTransformationsForEntity(mockMetadata, 'CustomEntity', strictRequirements)).toBe(
                    false
                );
            });

            it('should return true when all required transformations are present', () => {
                // Create mock metadata with complete transformations
                const completeMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'CompleteEntity',
                            entityTypeName: 'CompleteType',
                            entityType: {
                                name: 'CompleteType',
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': [
                                                'filter',
                                                'identity',
                                                'orderby',
                                                'search',
                                                'skip',
                                                'top',
                                                'groupby',
                                                'aggregate',
                                                'concat'
                                            ]
                                        }
                                    }
                                },
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        completeMetadata,
                        'CompleteEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(true);
            });

            it('should return false when not all required transformations are present', () => {
                // Create mock metadata with only some transformations (missing identity, skip, top, groupby, aggregate, concat)
                const partialMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'PartialEntity',
                            entityTypeName: 'PartialType',
                            entityType: {
                                name: 'PartialType',
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            'Transformations': ['filter', 'orderby', 'search']
                                        }
                                    }
                                },
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        partialMetadata,
                        'PartialEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should return false for entities without any transformations', () => {
                const noTransformMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'NoTransformEntity',
                            entityTypeName: 'NoTransformType',
                            entityType: {
                                name: 'NoTransformType',
                                annotations: {},
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        noTransformMetadata,
                        'NoTransformEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should return false for non-existent entity sets', () => {
                expect(
                    hasAggregateTransformationsForEntity(
                        metadata,
                        'NonExistentEntity',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(false);
            });

            it('should return true if all transformations are present in entity set annotations', () => {
                // Test with transformations directly on entity set (not just entity type)
                const entitySetMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'EntitySetTransforms',
                            entityTypeName: 'EntitySetType',
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        'Transformations': [
                                            'filter',
                                            'identity',
                                            'orderby',
                                            'search',
                                            'skip',
                                            'top',
                                            'groupby',
                                            'aggregate',
                                            'concat'
                                        ]
                                    }
                                }
                            },
                            entityType: {
                                name: 'EntitySetType',
                                annotations: {},
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(
                    hasAggregateTransformationsForEntity(
                        entitySetMetadata,
                        'EntitySetTransforms',
                        transformationsRequiredForAnalyticalTable
                    )
                ).toBe(true);
            });

            it('should return true when entity set has ApplySupported annotation', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'TestEntity',
                            entityTypeName: 'TestType',
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {
                                        Transformations: ['filter', 'groupby', 'aggregate']
                                    }
                                }
                            },
                            entityType: {
                                name: 'TestType',
                                annotations: {},
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(true);
            });

            it('should return true when entity type has ApplySupported annotation', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'TestEntity',
                            entityTypeName: 'TestType',
                            annotations: {},
                            entityType: {
                                name: 'TestType',
                                annotations: {
                                    'Aggregation': {
                                        'ApplySupported': {
                                            Transformations: ['filter', 'groupby']
                                        }
                                    }
                                },
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(true);
            });

            it('should return false when ApplySupported annotation exists without Transformations', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'TestEntity',
                            entityTypeName: 'TestType',
                            annotations: {
                                'Aggregation': {
                                    'ApplySupported': {}
                                }
                            },
                            entityType: {
                                name: 'TestType',
                                annotations: {},
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(false);
            });

            it('should return false when entity has no ApplySupported annotation', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [
                        {
                            name: 'TestEntity',
                            entityTypeName: 'TestType',
                            annotations: {},
                            entityType: {
                                name: 'TestType',
                                annotations: {},
                                keys: [],
                                properties: [],
                                navigationProperties: []
                            }
                        }
                    ],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'TestEntity')).toBe(false);
            });

            it('should return false for non-existent entity set', () => {
                const mockMetadata: any = {
                    version: '4.0',
                    namespace: 'Test.Service',
                    entitySets: [],
                    entityTypes: [],
                    entityContainer: {}
                };

                expect(hasAggregateTransformationsForEntity(mockMetadata, 'NonExistentEntity')).toBe(false);
            });
        });
    });

    describe('recursive hierarchy helpers', () => {
        it('hasRecursiveHierarchyForEntity should return true for entities with Hierarchy.RecursiveHierarchy annotation', () => {
            // Create a mock metadata with recursive hierarchy
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
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
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'TestEntity')).toBe(true);
        });

        it('hasRecursiveHierarchyForEntity should return false for entities without recursive hierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {},
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'TestEntity')).toBe(false);
        });

        it('hasRecursiveHierarchyForEntity should return false for non-existent entity set', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'NonExistentEntity')).toBe(false);
        });

        it('hasRecursiveHierarchyForEntity should return true for entities with qualified RecursiveHierarchy annotation', () => {
            // Test for real-world scenario where RecursiveHierarchy has a qualifier
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy#CompanyNode': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        },
                                        ParentNavigationProperty: {
                                            $NavigationPropertyPath: 'Parent'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(hasRecursiveHierarchyForEntity(mockMetadata, 'TestEntity')).toBe(true);
        });
    });

    describe('getRecursiveHierarchyQualifier', () => {
        it('should return qualifier for entity with qualified RecursiveHierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy#CompanyNode': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'TestEntity')).toBe('CompanyNode');
        });

        it('should return undefined for entity with unqualified RecursiveHierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'Hierarchy': {
                                    'RecursiveHierarchy': {
                                        NodeProperty: {
                                            $PropertyPath: 'NodeId'
                                        }
                                    }
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'TestEntity')).toBeUndefined();
        });

        it('should return undefined for entity without RecursiveHierarchy annotation', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        entityType: {
                            name: 'TestType',
                            annotations: {
                                'UI': {
                                    'LineItem': []
                                }
                            },
                            keys: [],
                            properties: [],
                            navigationProperties: []
                        }
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'TestEntity')).toBeUndefined();
        });

        it('should return undefined for non-existent entity set', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [],
                entityTypes: [],
                entityContainer: {}
            };

            expect(getRecursiveHierarchyQualifier(mockMetadata, 'NonExistentEntity')).toBeUndefined();
        });
    });

    describe('findEntitySetByName', () => {
        it('should return the correct entity set when found', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {}
                    },
                    {
                        name: 'AnotherEntity',
                        entityTypeName: 'AnotherType',
                        annotations: {}
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            const result = findEntitySetByName(mockMetadata, 'TestEntity');
            expect(result).toBeDefined();
            expect(result?.name).toBe('TestEntity');
            expect(result?.entityTypeName).toBe('TestType');
        });

        it('should return undefined when entity set is not found', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [
                    {
                        name: 'TestEntity',
                        entityTypeName: 'TestType',
                        annotations: {}
                    }
                ],
                entityTypes: [],
                entityContainer: {}
            };

            const result = findEntitySetByName(mockMetadata, 'NonExistentEntity');
            expect(result).toBeUndefined();
        });

        it('should handle empty entitySets array', () => {
            const mockMetadata: any = {
                version: '4.0',
                namespace: 'Test.Service',
                entitySets: [],
                entityTypes: [],
                entityContainer: {}
            };

            const result = findEntitySetByName(mockMetadata, 'TestEntity');
            expect(result).toBeUndefined();
        });
    });

    describe('shouldUseAnalyticalTable', () => {
        describe('Basic analytical data detection', () => {
            it('should return false when entity has no analytical data', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    entityType: {
                        annotations: {}
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(false);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should return true when not requiring complete transformations with analytical annotations', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': ['filter', 'groupby']
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
            });

            it('should return false when requiring complete transformations with incomplete annotations', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': ['filter', 'groupby'] // Missing required transformations
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should return true when requiring complete transformations with complete annotations', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': transformationsRequiredForAnalyticalTable
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(true);
            });
        });

        describe('Hierarchical data with analytical data', () => {
            it('should return true when not requiring complete transformations with both analytical and hierarchical data', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': ['filter', 'groupby'] // Incomplete transformations
                            }
                        }
                    },
                    entityType: {
                        annotations: {
                            'Hierarchy': {
                                'RecursiveHierarchy': {
                                    NodeProperty: { $PropertyPath: 'NodeId' },
                                    ParentNavigationProperty: { $NavigationPropertyPath: 'Parent' }
                                }
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
            });

            it('should return false when requiring complete transformations with hierarchical data but incomplete annotations', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': ['filter', 'groupby'] // Incomplete transformations
                            }
                        }
                    },
                    entityType: {
                        annotations: {
                            'Hierarchy': {
                                'RecursiveHierarchy': {
                                    NodeProperty: { $PropertyPath: 'NodeId' },
                                    ParentNavigationProperty: { $NavigationPropertyPath: 'Parent' }
                                }
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should return true when requiring complete transformations with hierarchical data and complete annotations', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': transformationsRequiredForAnalyticalTable
                            }
                        }
                    },
                    entityType: {
                        annotations: {
                            'Hierarchy': {
                                'RecursiveHierarchy': {
                                    NodeProperty: { $PropertyPath: 'NodeId' },
                                    ParentNavigationProperty: { $NavigationPropertyPath: 'Parent' }
                                }
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(true);
            });
        });

        describe('Entity type annotations', () => {
            it('should work with analytical annotations in entity type', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    entityType: {
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter', 'groupby']
                                }
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should work with hierarchical annotations in entity type', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    entityType: {
                        annotations: {
                            'Aggregation': {
                                'ApplySupported': {
                                    'Transformations': ['filter', 'groupby']
                                }
                            },
                            'Hierarchy': {
                                'RecursiveHierarchy': {
                                    NodeProperty: { $PropertyPath: 'NodeId' },
                                    ParentNavigationProperty: { $NavigationPropertyPath: 'Parent' }
                                }
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });
        });

        describe('Edge cases', () => {
            it('should handle missing annotations gracefully', () => {
                const entitySet: any = {
                    name: 'TestEntity'
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(false);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should handle empty transformations array', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': []
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(false);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should handle qualified hierarchy annotations', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': ['filter', 'groupby']
                            }
                        }
                    },
                    entityType: {
                        annotations: {
                            'Hierarchy': {
                                'RecursiveHierarchy#MyHierarchy': {
                                    NodeProperty: { $PropertyPath: 'NodeId' },
                                    ParentNavigationProperty: { $NavigationPropertyPath: 'Parent' }
                                }
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should handle entity set with null annotations', () => {
                const entitySet: any = {
                    name: 'TestEntity',
                    annotations: null,
                    entityType: null
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(false);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });
        });

        describe('Real-world scenarios', () => {
            it('should handle S/4 HANA analytical entities', () => {
                const entitySet: any = {
                    name: 'SalesOrderItem',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': transformationsRequiredForAnalyticalTable,
                                'PropertyRestrictions': true,
                                'GroupableProperties': ['Material', 'Customer'],
                                'AggregatableProperties': [
                                    {
                                        'Property': 'NetAmount',
                                        'SupportedAggregationMethods': ['sum', 'min', 'max']
                                    }
                                ]
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(true);
            });

            it('should handle CAP with minimal analytical annotations', () => {
                const entitySet: any = {
                    name: 'Books',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': ['groupby'] // Only minimal transformations
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });

            it('should handle hierarchical organizational data', () => {
                const entitySet: any = {
                    name: 'OrganizationalUnit',
                    annotations: {
                        'Aggregation': {
                            'ApplySupported': {
                                'Transformations': ['filter', 'orderby'] // Partial transformations
                            }
                        }
                    },
                    entityType: {
                        annotations: {
                            'Hierarchy': {
                                'RecursiveHierarchy': {
                                    NodeProperty: { $PropertyPath: 'OrgUnitId' },
                                    ParentNavigationProperty: { $NavigationPropertyPath: 'ParentUnit' }
                                }
                            }
                        }
                    }
                };

                expect(shouldUseAnalyticalTable(entitySet, false)).toBe(true);
                expect(shouldUseAnalyticalTable(entitySet, true)).toBe(false);
            });
        });
    });

    describe('convertEdmxToConvertedMetadata', () => {
        let validEdmxV4: string;

        beforeAll(() => {
            validEdmxV4 = fs.readFileSync(
                path.resolve(__dirname, '../prompts/fixtures/metadataV4WithAggregateTransforms.xml'),
                'utf-8'
            );
        });

        test('should convert valid EDMX to ConvertedMetadata', () => {
            const result = convertEdmxToConvertedMetadata(validEdmxV4);

            expect(result).toBeDefined();
            expect(result.version).toBe('4.0');
            expect(result.entitySets).toBeInstanceOf(Array);
            expect(result.entitySets.length).toBeGreaterThan(0);
        });

        test('should throw error for invalid EDMX', () => {
            const invalidEdmx = 'invalid xml content';

            expect(() => convertEdmxToConvertedMetadata(invalidEdmx)).toThrow('errors.unparseableMetadata');
        });

        test('should throw error for unparseable OData version', () => {
            const invalidVersionEdmx = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx Version="invalid" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="com.sap.example" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestSet" EntityType="com.sap.example.TestEntity"/>
                            </EntityContainer>
                            <EntityType Name="TestEntity">
                                <Key>
                                    <PropertyRef Name="ID"/>
                                </Key>
                                <Property Name="ID" Type="Edm.String" Nullable="false"/>
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`;

            expect(() => convertEdmxToConvertedMetadata(invalidVersionEdmx)).toThrow('errors.unparseableMetadata');
        });

        test('should throw error for EDMX with no version', () => {
            const noVersionEdmx = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="com.sap.example" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestSet" EntityType="com.sap.example.TestEntity"/>
                            </EntityContainer>
                            <EntityType Name="TestEntity">
                                <Key>
                                    <PropertyRef Name="ID"/>
                                </Key>
                                <Property Name="ID" Type="Edm.String" Nullable="false"/>
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`;

            expect(() => convertEdmxToConvertedMetadata(noVersionEdmx)).toThrow('errors.unparseableMetadata');
        });

        test('should handle empty string input', () => {
            expect(() => convertEdmxToConvertedMetadata('')).toThrow('errors.unparseableMetadata');
        });

        test('should handle malformed XML', () => {
            const malformedXml = `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="com.sap.example" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="TestSet" EntityType="com.sap.example.TestEntity"/>
                            <!-- Missing closing tags -->
                        </Schema>
                    </edmx:DataServices>`;

            expect(() => convertEdmxToConvertedMetadata(malformedXml)).toThrow('errors.unparseableMetadata');
        });
    });
});
