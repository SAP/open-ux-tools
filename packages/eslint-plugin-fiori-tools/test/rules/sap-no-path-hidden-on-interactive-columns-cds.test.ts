import { RuleTester } from 'eslint';
import noPathHiddenOnInteractiveColumnsRule from '../../src/rules/sap-no-path-hidden-on-interactive-columns.js';
import { meta, languages } from '../../src/index.js';
import { setup, CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH } from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-path-hidden-on-interactive-columns';
const { createValidTest, createInvalidTest } = setup(`${TEST_NAME} - CDS`, CAP_APP_PATH);

// Valid: no dynamic UI.Hidden in the table
const CDS_NO_HIDDEN = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: title,
    },
    {
        $Type: 'UI.DataField',
        Value: description,
    },
]);
`;

// Valid: static UI.Hidden (Bool=true, not a path)
const CDS_STATIC_HIDDEN = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: title,
        ![@UI.Hidden]: true,
    },
]);
`;

// Valid: path-based UI.Hidden but column is restricted for both sort and filter
const CDS_DYNAMIC_HIDDEN_BOTH_RESTRICTED = `
annotate service.Incidents with @(
    Capabilities.SortRestrictions   : {NonSortableProperties: [title]},
    Capabilities.FilterRestrictions : {NonFilterableProperties: [title]},
    UI.LineItem                     : [
        {
            $Type : 'UI.DataField',
            Value : title,
            ![@UI.Hidden]: identifier,
        },
    ],
);
`;

// Invalid: path-based UI.Hidden on an interactive column (no capabilities restriction)
const CDS_DYNAMIC_HIDDEN_VIOLATION = `
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: title,
        ![@UI.Hidden]: description,
    },
]);
`;

ruleTester.run(`${TEST_NAME} - CDS`, noPathHiddenOnInteractiveColumnsRule, {
    valid: [
        createValidTest(
            {
                name: 'non CDS file - json',
                filename: 'some-other-file.json',
                code: '{}'
            },
            []
        ),
        createValidTest(
            {
                name: 'no UI.Hidden annotation in table',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_NO_HIDDEN
            },
            []
        ),
        createValidTest(
            {
                name: 'static UI.Hidden (Bool) on column',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_STATIC_HIDDEN
            },
            []
        ),
        createValidTest(
            {
                name: 'dynamic UI.Hidden but column restricted for both sort and filter',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_DYNAMIC_HIDDEN_BOTH_RESTRICTED
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'dynamic UI.Hidden on interactive column (no capabilities)',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_DYNAMIC_HIDDEN_VIOLATION,
                errors: [
                    {
                        message:
                            'UI.Hidden with a path-based value must not be used on a sortable or filterable column. Use a static UI.Hidden or restrict sorting and filtering via Capabilities annotations.'
                    }
                ]
            },
            []
        )
    ]
});
