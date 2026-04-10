import { RuleTester } from 'eslint';
import descriptionColumnLabelRule from '../../src/rules/sap-description-column-label';
import { meta, languages } from '../../src/index';
import { getAnnotationsAsXmlCode, setup, V4_ANNOTATIONS, V4_ANNOTATIONS_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-description-column-label';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

// ─── Annotation snippets ─────────────────────────────────────────────────────

// Valid: Common.Text with a meaningful, distinct label
const COMMON_TEXT_WITH_MEANINGFUL_LABEL = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name"/>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="Common.Label" String="Category Name"/>
    </Annotations>`;

// Valid: Common.Text but text property has no Common.Label — not flagged
// Individual/businessPartnerID has no label annotation in the base metadata
const COMMON_TEXT_WITHOUT_LABEL_ANNOTATION = `
    <Annotations Target="IncidentService.Incidents/assignedIndividual_id">
        <Annotation Term="Common.Text" Path="assignedIndividual/businessPartnerID"/>
    </Annotations>`;

// Valid: Priority entity type is not on any page in the manifest — not flagged
const COMMON_TEXT_ON_ENTITY_TYPE_NOT_ON_PAGE = `
    <Annotations Target="IncidentService.Priority/code">
        <Annotation Term="Common.Text" Path="name"/>
    </Annotations>
    <Annotations Target="IncidentService.Priority/name">
        <Annotation Term="Common.Label" String="Name"/>
    </Annotations>`;

// Invalid (trivialLabel): text property label is "Name"
const TEXT_PROPERTY_TRIVIAL_LABEL_NAME = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name"/>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="Common.Label" String="Name"/>
    </Annotations>`;

// Invalid (trivialLabel): text property label is "Description"
const TEXT_PROPERTY_TRIVIAL_LABEL_DESCRIPTION = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name"/>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="Common.Label" String="Description"/>
    </Annotations>`;

// Invalid (duplicateLabel): text property label is identical to the ID property label
const TEXT_PROPERTY_DUPLICATE_LABEL = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="category/name"/>
    </Annotations>
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Label" String="Category"/>
    </Annotations>
    <Annotations Target="IncidentService.Category/name">
        <Annotation Term="Common.Label" String="Category"/>
    </Annotations>`;

// ─── Test suite ──────────────────────────────────────────────────────────────

ruleTester.run(TEST_NAME, descriptionColumnLabelRule, {
    valid: [
        createValidTest(
            {
                name: 'no annotation',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'Common.Text with meaningful distinct label - not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, COMMON_TEXT_WITH_MEANINGFUL_LABEL)
            },
            []
        ),
        createValidTest(
            {
                name: 'Common.Text but text property has no Common.Label - not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, COMMON_TEXT_WITHOUT_LABEL_ANNOTATION)
            },
            []
        ),
        createValidTest(
            {
                name: 'entity type not on any page - not flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, COMMON_TEXT_ON_ENTITY_TYPE_NOT_ON_PAGE)
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'text property label is "Name" - trivial label flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_PROPERTY_TRIVIAL_LABEL_NAME),
                errors: [{ messageId: 'trivialLabel' }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'text property label is "Description" - trivial label flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_PROPERTY_TRIVIAL_LABEL_DESCRIPTION),
                errors: [{ messageId: 'trivialLabel' }]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'text property label is identical to ID property label - duplicate label flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_PROPERTY_DUPLICATE_LABEL),
                errors: [{ messageId: 'duplicateLabel' }]
            },
            []
        )
    ]
});
