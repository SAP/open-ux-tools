import type { Logger } from '@sap-ux/logger';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { isFacetHidden } from '../../../src/utils/facetUtils';

/**
 * Builds a minimal `ConvertedMetadata` stub from a compact spec.
 *
 * @param spec - description of entity sets and the UI annotations attached to their entity types
 * @param spec.entitySets - entity sets directly reachable from the page
 * @returns a minimal ConvertedMetadata stub for the test
 */
function buildMetadata(spec: {
    entitySets: {
        name: string;
        entityType: { uiAnnotations?: Record<string, unknown> };
    }[];
}): ConvertedMetadata {
    return {
        entitySets: spec.entitySets.map((es) => ({
            name: es.name,
            entityType: { annotations: { UI: es.entityType.uiAnnotations ?? {} } }
        }))
    } as unknown as ConvertedMetadata;
}

describe('isFacetHidden()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('returns false when metadata is undefined', () => {
        expect(isFacetHidden('TestSet', 'HeaderFacets', { id: 'X' }, undefined)).toBe(false);
    });

    test('returns false when entity set name is missing', () => {
        const metadata = buildMetadata({ entitySets: [] });
        expect(isFacetHidden(undefined, 'HeaderFacets', { id: 'X' }, metadata)).toBe(false);
    });

    test('returns false when neither target nor id is provided', () => {
        const metadata = buildMetadata({ entitySets: [] });
        expect(isFacetHidden('TestSet', 'HeaderFacets', {}, metadata)).toBe(false);
    });

    test('returns false when entity set is not in metadata', () => {
        const metadata = buildMetadata({ entitySets: [] });
        expect(isFacetHidden('Missing', 'HeaderFacets', { id: 'X' }, metadata, mockLogger)).toBe(false);
    });

    test('returns false when no facets collection exists on the entity type', () => {
        const metadata = buildMetadata({ entitySets: [{ name: 'TestSet', entityType: {} }] });
        expect(isFacetHidden('TestSet', 'HeaderFacets', { id: 'X' }, metadata)).toBe(false);
    });

    test('returns true for a HeaderFacet with UI.Hidden = true (matched by Target)', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            HeaderFacets: [
                                {
                                    $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                    Target: { value: 'com.sap.vocabularies.UI.v1.Chart#X' },
                                    annotations: { UI: { Hidden: true } }
                                }
                            ]
                        }
                    }
                }
            ]
        });
        expect(
            isFacetHidden('TestSet', 'HeaderFacets', { target: 'com.sap.vocabularies.UI.v1.Chart#X' }, metadata)
        ).toBe(true);
    });

    test('returns true for a HeaderFacet with UI.Hidden = true (matched by ID)', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            HeaderFacets: [
                                {
                                    $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                    ID: 'MyFacet',
                                    annotations: { UI: { Hidden: true } }
                                }
                            ]
                        }
                    }
                }
            ]
        });
        expect(isFacetHidden('TestSet', 'HeaderFacets', { id: 'MyFacet' }, metadata)).toBe(true);
    });

    test('returns false when UI.Hidden = false', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            HeaderFacets: [
                                {
                                    $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                    ID: 'MyFacet',
                                    annotations: { UI: { Hidden: false } }
                                }
                            ]
                        }
                    }
                }
            ]
        });
        expect(isFacetHidden('TestSet', 'HeaderFacets', { id: 'MyFacet' }, metadata)).toBe(false);
    });

    test('returns false when no UI.Hidden annotation is present', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            HeaderFacets: [
                                {
                                    $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                    ID: 'MyFacet',
                                    annotations: { UI: {} }
                                }
                            ]
                        }
                    }
                }
            ]
        });
        expect(isFacetHidden('TestSet', 'HeaderFacets', { id: 'MyFacet' }, metadata)).toBe(false);
    });

    test("returns 'dynamic' for an expression-form UI.Hidden value", () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            HeaderFacets: [
                                {
                                    $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                    ID: 'MyFacet',
                                    annotations: { UI: { Hidden: { $Path: 'someProperty' } } }
                                }
                            ]
                        }
                    }
                }
            ]
        });
        expect(isFacetHidden('TestSet', 'HeaderFacets', { id: 'MyFacet' }, metadata)).toBe('dynamic');
    });

    test('descends into CollectionFacet.Facets to find a hidden sub-section', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            Facets: [
                                {
                                    $Type: 'com.sap.vocabularies.UI.v1.CollectionFacet',
                                    ID: 'Outer',
                                    Facets: [
                                        {
                                            $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                            ID: 'Inner',
                                            annotations: { UI: { Hidden: true } }
                                        }
                                    ],
                                    annotations: { UI: {} }
                                }
                            ]
                        }
                    }
                }
            ]
        });
        expect(isFacetHidden('TestSet', 'Facets', { id: 'Inner' }, metadata)).toBe(true);
    });

    test('does not match a facet in the wrong collection', () => {
        const metadata = buildMetadata({
            entitySets: [
                {
                    name: 'TestSet',
                    entityType: {
                        uiAnnotations: {
                            Facets: [
                                {
                                    $Type: 'com.sap.vocabularies.UI.v1.ReferenceFacet',
                                    ID: 'BodyOnly',
                                    annotations: { UI: { Hidden: true } }
                                }
                            ]
                        }
                    }
                }
            ]
        });
        // Looking for the same id in HeaderFacets should not find the body facet
        expect(isFacetHidden('TestSet', 'HeaderFacets', { id: 'BodyOnly' }, metadata)).toBe(false);
    });
});
