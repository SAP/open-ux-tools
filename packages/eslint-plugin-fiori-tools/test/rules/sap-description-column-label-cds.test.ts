import { RuleTester } from 'eslint';
import descriptionColumnLabelRule from '../../src/rules/sap-description-column-label';
import { meta, languages } from '../../src/index';
import { setup, CAP_ANNOTATIONS, CAP_ANNOTATIONS_PATH, CAP_APP_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-description-column-label';

// ─── CDS (CAP) tests ─────────────────────────────────────────────────────────

const CDS_TRIVIAL_LABEL = `
annotate service.Incidents with {
    category @Common.Text: category.name
};
annotate service.Category with {
    name @Common.Label: 'Name'
};
`;

const CDS_DUPLICATE_LABEL = `
annotate service.Incidents with {
    category @Common.Text: category.name
        @Common.Label: 'Category'
};
annotate service.Category with {
    name @Common.Label: 'Category'
};
`;

const CDS_MEANINGFUL_LABEL = `
annotate service.Incidents with {
    category @Common.Text: category.name
};
annotate service.Category with {
    name @Common.Label: 'Category Name'
};
`;

const { createValidTest, createInvalidTest } = setup(`${TEST_NAME} - CDS`, CAP_APP_PATH);

ruleTester.run(`${TEST_NAME} - CDS`, descriptionColumnLabelRule, {
    valid: [
        createValidTest(
            {
                name: 'CDS text property with meaningful distinct label - not flagged',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_MEANINGFUL_LABEL
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'CDS text property with trivial "Name" label',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_TRIVIAL_LABEL,
                errors: [{ messageId: 'trivialLabel' }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'CDS text property label identical to ID property label',
                filename: CAP_ANNOTATIONS_PATH,
                code: CAP_ANNOTATIONS + CDS_DUPLICATE_LABEL,
                errors: [{ messageId: 'duplicateLabel' }]
            },
            []
        )
    ]
});
