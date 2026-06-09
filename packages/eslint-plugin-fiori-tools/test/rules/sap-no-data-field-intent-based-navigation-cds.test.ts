import { RuleTester } from 'eslint';
import intentBasedNavRule from '../../src/rules/sap-no-data-field-intent-based-navigation.js';
import { meta, languages } from '../../src/index.js';
import { CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH, CAP_FACETS_ANNOTATIONS, setup } from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const CAP_HEADER_FACETS_ANNOTATIONS = `
annotate service.Incidents with @(
    UI.HeaderFacets              : [{
        $Type : 'UI.ReferenceFacet',
        Label : 'header_section',
        ID    : 'header_section',
        Target: '@UI.FieldGroup#header_section',
    }, ],
    UI.FieldGroup #header_section: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: category_code,
            },
            {
                $Type: 'UI.DataField',
                Value: createdBy,
            },
            {
                $Type: 'UI.DataField',
                Value: createdAt,
            }
        ],
    },
);
`;

const CAP_TABLE_ANNOTATION_DF = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type         : 'UI.DataFieldForIntentBasedNavigation',
        SemanticObject: 'EPMProduct',
        Action        : 'manage_st',
        Inline        : true,
        IconUrl       : 'sap-icon://hello-world',
    },
    {
        $Type         : 'UI.DataFieldWithIntentBasedNavigation',
        Value         : category,
        SemanticObject: 'test',
    },
    {
        $Type: 'UI.DataField',
        Value: category,
    },
]);
`;

const CAP_FACETS_ANNOTATIONS_DF = `
annotate service.Incidents with @(
    UI.Facets                    : [{
        $Type : 'UI.ReferenceFacet',
        Target: 'incidentFlow/@UI.LineItem#table_section',
        Label : 'table_section',
        ID    : 'table_section',
    }, ],
);
annotate service.IncidentFlow with @(UI.LineItem #table_section: [
    {
        $Type : 'UI.DataField',
        Value : id,
        Label : 'id',
    },
    {
        $Type         : 'UI.DataFieldWithIntentBasedNavigation',
        Value         : criticality,
        SemanticObject: 'qwerty',
    },
    {
        $Type : 'UI.DataFieldForIntentBasedNavigation',
        SemanticObject : 'test',
    },
])`;

const CAP_HEADER_FACETS_ANNOTATION_DF = `
annotate service.Incidents with @(
    UI.HeaderFacets              : [{
        $Type : 'UI.ReferenceFacet',
        Label : 'header_section',
        ID    : 'header_section',
        Target: '@UI.FieldGroup#header_section',
    }, ],
    UI.FieldGroup #header_section: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: category_code,
            },
            {
                $Type         : 'UI.DataFieldForIntentBasedNavigation',
                SemanticObject: 'test',
            },
            {
                $Type         : 'UI.DataFieldWithIntentBasedNavigation',
                Value         : identifier,
                SemanticObject: 'test',
            },
        ],
    },
);
`;

const TEST_NAME = 'sap-no-data-field-intent-based-navigation';
const { createValidTest, createInvalidTest } = setup(`${TEST_NAME} - CDS`, CAP_APP_PATH);

ruleTester.run(`${TEST_NAME} - CDS`, intentBasedNavRule, {
    valid: [
        createValidTest(
            // Non-CDS files should be ignored
            {
                name: 'non CDS file - json',
                filename: 'some-other-file.json',
                code: '{}'
            },
            []
        ),
        createValidTest(
            {
                name: 'LR table with no DF intent based navigation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'OP table with no DF intent based navigation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_FACETS_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'FieldGroup annotation without DF intent based navigation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_HEADER_FACETS_ANNOTATIONS
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'LR table with DF intent based navigation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_TABLE_ANNOTATION_DF,
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 5,
                        endColumn: 6,
                        endLine: 51,
                        line: 45
                    },
                    {
                        message:
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 5,
                        endColumn: 6,
                        endLine: 56,
                        line: 52
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'OP table with DF intent based navigation',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CAP_FACETS_ANNOTATIONS_DF,
                errors: [
                    {
                        message:
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 5,
                        endColumn: 6,
                        endLine: 62,
                        line: 58
                    },
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 5,
                        endColumn: 6,
                        endLine: 66,
                        line: 63
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'FieldGroup annotation with DF intent based navigation',
                code: CAP_ANNOTATIONS + CAP_HEADER_FACETS_ANNOTATION_DF,
                filename: CAP_ANNOTATIONS_PATH,
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 13,
                        endColumn: 14,
                        endLine: 61,
                        line: 58
                    },
                    {
                        message:
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 13,
                        endColumn: 14,
                        endLine: 66,
                        line: 62
                    }
                ]
            },
            []
        )
    ]
});
