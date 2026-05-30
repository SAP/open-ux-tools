import { RuleTester } from 'eslint';
import textArrangementHiddenRule from '../../src/rules/sap-text-arrangement-hidden.js';
import { meta, languages } from '../../src/index.js';
import { TEXT_ARRANGEMENT_HIDDEN } from '../../src/language/diagnostics.js';
import { setup, CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH } from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-text-arrangement-hidden';

// CDS (CAP) format tests

const CDS_TEXT_ARRANGEMENT_FORMAT2_HIDDEN = `
annotate service.Incidents with {
    category @(
        Common.Text                  : category.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};
annotate service.Category with {
    name @UI.Hidden
};
`;

const CDS_TEXT_ARRANGEMENT_FORMAT2_NOT_HIDDEN = `
annotate service.Incidents with {
    category @(
        Common.Text                  : category.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};
`;

const CDS_TEXT_ARRANGEMENT_FORMAT1_HIDDEN = `
annotate service.Incidents with {
    category @Common : {
        Text            : category.name,
        TextArrangement : #TextOnly
    }
};
annotate service.Category with {
    name @UI.Hidden
};
`;

const CDS_TEXT_ARRANGEMENT_FORMAT2_NOT_HIDDEN_EXPLICIT_FALSE = `
annotate service.Incidents with {
    category @(
        Common.Text                  : category.name,
        Common.Text.@UI.TextArrangement : #TextOnly,
    )
};
annotate service.Category with {
    name @UI.Hidden: false
};
`;

// Entity-type level UI.TextArrangement acts as a fallback for all Common.Text properties on that type
const CDS_TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_HIDDEN = `
annotate service.Incidents with @UI.TextArrangement: #TextFirst;
annotate service.Incidents with {
    title @Common.Text: description
};
annotate service.Incidents with {
    description @UI.Hidden
};
`;

const CDS_TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_NOT_HIDDEN = `
annotate service.Incidents with @UI.TextArrangement: #TextFirst;
annotate service.Incidents with {
    title @Common.Text: description
};
`;

const { createValidTest, createInvalidTest } = setup(`${TEST_NAME} - CDS`, CAP_APP_PATH);

ruleTester.run(`${TEST_NAME} - CDS`, textArrangementHiddenRule, {
    valid: [
        createValidTest(
            {
                name: 'CDS Format 2 inline TextArrangement with text property not hidden',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_TEXT_ARRANGEMENT_FORMAT2_NOT_HIDDEN
            },
            []
        ),
        createValidTest(
            {
                name: 'CDS Format 2 inline TextArrangement with text property explicitly not hidden (Bool=false)',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_TEXT_ARRANGEMENT_FORMAT2_NOT_HIDDEN_EXPLICIT_FALSE
            },
            []
        ),
        createValidTest(
            {
                name: 'CDS entity-type level TextArrangement with text property not hidden',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_NOT_HIDDEN
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'CDS Format 2 inline TextArrangement with hidden text property',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_TEXT_ARRANGEMENT_FORMAT2_HIDDEN,
                errors: [{ messageId: TEXT_ARRANGEMENT_HIDDEN }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'CDS Format 1 record TextArrangement with hidden text property',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_TEXT_ARRANGEMENT_FORMAT1_HIDDEN,
                errors: [{ messageId: TEXT_ARRANGEMENT_HIDDEN }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'CDS entity-type level TextArrangement with hidden text property',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_TEXT_ARRANGEMENT_ENTITY_TYPE_LEVEL_HIDDEN,
                errors: [{ messageId: TEXT_ARRANGEMENT_HIDDEN }]
            },
            []
        )
    ]
});
