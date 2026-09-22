import { RuleTester } from 'eslint';
import fieldGroupInTableTypeRestrictionRule from '../../src/rules/sap-field-group-in-table-type-restriction.js';
import { meta, languages } from '../../src/index.js';
import {
    CAP_ANNOTATIONS,
    CAP_ANNOTATIONS_PATH,
    CAP_APP_PATH,
    CAP_MANIFEST,
    CAP_MANIFEST_PATH,
    getManifestAsCode,
    setup
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-field-group-in-table-type-restriction';
const { createValidTest, createInvalidTest } = setup(`${TEST_NAME} - CDS`, CAP_APP_PATH);

// LineItem with DataFieldForAnnotation targeting FieldGroup
const CAP_LINEITEM_WITH_FIELDGROUP = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAnnotation',
        Target: '@UI.FieldGroup#ContactData',
    }
]);
`;

// LineItem with only regular DataField entries — no FieldGroup
const CAP_LINEITEM_NO_FIELDGROUP = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: title,
    },
    {
        $Type: 'UI.DataField',
        Value: description,
    }
]);
`;

// LineItem with DataFieldForAnnotation NOT targeting FieldGroup
const CAP_LINEITEM_WITH_OTHER_ANNOTATION = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAnnotation',
        Target: '@UI.Chart#SomeChart',
    }
]);
`;

// LineItem with two DataFieldForAnnotation entries targeting FieldGroup
const CAP_LINEITEM_WITH_TWO_FIELDGROUPS = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAnnotation',
        Target: '@UI.FieldGroup#GroupA',
    },
    {
        $Type : 'UI.DataFieldForAnnotation',
        Target: '@UI.FieldGroup#GroupB',
    }
]);
`;

// CAP manifest: set GridTable on IncidentsList
const CAP_MANIFEST_WITH_GRID_TABLE = getManifestAsCode(CAP_MANIFEST, [
    {
        path: [
            'sap.ui5',
            'routing',
            'targets',
            'IncidentsList',
            'options',
            'settings',
            'controlConfiguration',
            '@com.sap.vocabularies.UI.v1.LineItem',
            'tableSettings',
            'type'
        ],
        value: 'GridTable'
    }
]);

// CAP manifest: set AnalyticalTable on IncidentsList
const CAP_MANIFEST_WITH_ANALYTICAL_TABLE = getManifestAsCode(CAP_MANIFEST, [
    {
        path: [
            'sap.ui5',
            'routing',
            'targets',
            'IncidentsList',
            'options',
            'settings',
            'controlConfiguration',
            '@com.sap.vocabularies.UI.v1.LineItem',
            'tableSettings',
            'type'
        ],
        value: 'AnalyticalTable'
    }
]);

// Object page: CollectionFacet > CollectionFacet > ReferenceFacet → incidentFlow/@UI.LineItem
// Tests that the recursive traversal reaches a ReferenceFacet two levels deep
const CAP_NESTED_COLLECTION_FACET_WITH_FIELDGROUP = `
annotate service.Incidents with @(
    UI.Facets: [{
        $Type: 'UI.CollectionFacet',
        ID: 'OuterGroup',
        Label: 'Outer Group',
        Facets: [{
            $Type: 'UI.CollectionFacet',
            ID: 'InnerGroup',
            Label: 'Inner Group',
            Facets: [{
                $Type: 'UI.ReferenceFacet',
                ID: 'IncidentFlowSection',
                Label: 'Incident Flow',
                Target: 'incidentFlow/@UI.LineItem',
            }],
        }],
    }],
);

annotate service.IncidentFlow with @(UI.LineItem: [
    {
        $Type: 'UI.DataFieldForAnnotation',
        Target: '@UI.FieldGroup#FlowData',
    }
]);
`;

// CAP manifest: set GridTable for the incidentFlow table on the IncidentsObjectPage
const CAP_MANIFEST_OP_INCIDENT_FLOW_GRID_TABLE = getManifestAsCode(CAP_MANIFEST, [
    {
        path: [
            'sap.ui5',
            'routing',
            'targets',
            'IncidentsObjectPage',
            'options',
            'settings',
            'controlConfiguration',
            'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
            'tableSettings',
            'type'
        ],
        value: 'GridTable'
    }
]);

ruleTester.run(`${TEST_NAME} - CDS`, fieldGroupInTableTypeRestrictionRule, {
    valid: [
        createValidTest(
            {
                name: 'no annotation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'DataFieldForAnnotation targeting FieldGroup without configured table type (default)',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_LINEITEM_WITH_FIELDGROUP
            },
            []
        ),
        createValidTest(
            {
                name: 'GridTable with only DataField entries — no FieldGroup reference',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_LINEITEM_NO_FIELDGROUP
            },
            [{ filename: CAP_MANIFEST_PATH, code: CAP_MANIFEST_WITH_GRID_TABLE }]
        ),
        createValidTest(
            {
                name: 'GridTable with DataFieldForAnnotation targeting non-FieldGroup annotation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_LINEITEM_WITH_OTHER_ANNOTATION
            },
            [{ filename: CAP_MANIFEST_PATH, code: CAP_MANIFEST_WITH_GRID_TABLE }]
        ),
        createValidTest(
            {
                name: 'CollectionFacet inside CollectionFacet with ReferenceFacet → FieldGroup in ResponsiveTable (default)',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_NESTED_COLLECTION_FACET_WITH_FIELDGROUP
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'DataFieldForAnnotation targeting FieldGroup in GridTable',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_LINEITEM_WITH_FIELDGROUP,
                errors: [
                    {
                        message:
                            '`UI.FieldGroup` is not supported in `GridTable`. Change the table type to `ResponsiveTable` or use individual `UI.DataField` entries instead.'
                    }
                ]
            },
            [{ filename: CAP_MANIFEST_PATH, code: CAP_MANIFEST_WITH_GRID_TABLE }]
        ),
        createInvalidTest(
            {
                name: 'DataFieldForAnnotation targeting FieldGroup in AnalyticalTable',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_LINEITEM_WITH_TWO_FIELDGROUPS,
                errors: [
                    {
                        message:
                            '`UI.FieldGroup` is not supported in `AnalyticalTable`. Change the table type to `ResponsiveTable` or use individual `UI.DataField` entries instead.'
                    },
                    {
                        message:
                            '`UI.FieldGroup` is not supported in `AnalyticalTable`. Change the table type to `ResponsiveTable` or use individual `UI.DataField` entries instead.'
                    }
                ]
            },
            [{ filename: CAP_MANIFEST_PATH, code: CAP_MANIFEST_WITH_ANALYTICAL_TABLE }]
        ),
        createInvalidTest(
            {
                name: 'CollectionFacet inside CollectionFacet with ReferenceFacet → FieldGroup in GridTable on object page',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_NESTED_COLLECTION_FACET_WITH_FIELDGROUP,
                errors: [
                    {
                        message:
                            '`UI.FieldGroup` is not supported in `GridTable` in the Incident Flow section. Change the table type to `ResponsiveTable` or use individual `UI.DataField` entries instead.'
                    }
                ]
            },
            [{ filename: CAP_MANIFEST_PATH, code: CAP_MANIFEST_OP_INCIDENT_FLOW_GRID_TABLE }]
        )
    ]
});
