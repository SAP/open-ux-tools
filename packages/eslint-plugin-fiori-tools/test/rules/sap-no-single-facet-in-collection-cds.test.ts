import { RuleTester } from 'eslint';
import noSingleFacetInCollectionRule from '../../src/rules/sap-no-single-facet-in-collection.js';
import { meta, languages } from '../../src/index.js';
import { CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH, setup } from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

// Single CollectionFacet with exactly one ReferenceFacet child — VIOLATION
const CAP_SINGLE_FACET_IN_COLLECTION = `
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'GeneralInfo',
        Label : 'General Information',
        Facets: [{
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#Details',
        }],
    }],
);
`;

// CollectionFacet with two ReferenceFacet children — VALID
const CAP_TWO_FACETS_IN_COLLECTION = `
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'GeneralInfo',
        Label : 'General Information',
        Facets: [
            {
                $Type : 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#Details',
            },
            {
                $Type : 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#Address',
            },
        ],
    }],
);
`;

// Direct ReferenceFacet without CollectionFacet wrapper — VALID
const CAP_DIRECT_REFERENCE_FACET = `
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneralInfo',
        Label : 'General Information',
        Target: '@UI.FieldGroup#Details',
    }],
);
`;

// CollectionFacet with empty Facets collection — VALID
const CAP_EMPTY_COLLECTION_FACET = `
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'GeneralInfo',
        Facets: [],
    }],
);
`;

// Outer CollectionFacet with two children, inner CollectionFacet with one ReferenceFacet — VIOLATION on inner
const CAP_NESTED_SINGLE_FACET_IN_COLLECTION = `
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'Outer',
        Facets: [
            {
                $Type : 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#Details',
            },
            {
                $Type : 'UI.CollectionFacet',
                ID    : 'Inner',
                Facets: [{
                    $Type : 'UI.ReferenceFacet',
                    Target: '@UI.FieldGroup#Address',
                }],
            },
        ],
    }],
);
`;

// Qualified UI.Facets with a single ReferenceFacet in CollectionFacet — VIOLATION
const CAP_SINGLE_FACET_IN_COLLECTION_QUALIFIED = `
annotate service.Incidents with @(
    UI.Facets #MyQualifier: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'GeneralInfo',
        Label : 'General Information',
        Facets: [{
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#Details',
        }],
    }],
);
`;

const TEST_NAME = 'sap-no-single-facet-in-collection';
const { createValidTest, createInvalidTest } = setup(`${TEST_NAME} - CDS`, CAP_APP_PATH);

ruleTester.run(`${TEST_NAME} - CDS`, noSingleFacetInCollectionRule, {
    valid: [
        createValidTest(
            {
                name: 'no UI.Facets annotation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'CollectionFacet with two ReferenceFacets',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_TWO_FACETS_IN_COLLECTION
            },
            []
        ),
        createValidTest(
            {
                name: 'direct ReferenceFacet without CollectionFacet wrapper',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_DIRECT_REFERENCE_FACET
            },
            []
        ),
        createValidTest(
            {
                name: 'CollectionFacet with empty Facets collection',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_EMPTY_COLLECTION_FACET
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'CollectionFacet with single ReferenceFacet',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_SINGLE_FACET_IN_COLLECTION,
                errors: [{ messageId: TEST_NAME }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'nested CollectionFacet with single ReferenceFacet',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_NESTED_SINGLE_FACET_IN_COLLECTION,
                errors: [{ messageId: TEST_NAME }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'qualified UI.Facets with single ReferenceFacet in CollectionFacet',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_SINGLE_FACET_IN_COLLECTION_QUALIFIED,
                errors: [{ messageId: TEST_NAME }]
            },
            []
        )
    ]
});
