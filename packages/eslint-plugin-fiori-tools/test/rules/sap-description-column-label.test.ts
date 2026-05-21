import { RuleTester } from 'eslint';
import descriptionColumnLabelRule from '../../src/rules/sap-description-column-label';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V2_METADATA,
    V2_METADATA_PATH
} from '../test-helper';

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

// Invalid (trivialLabel, direct path): text property is on the same entity type — no navigation hop
const TEXT_PROPERTY_DIRECT_PATH_TRIVIAL_LABEL = `
    <Annotations Target="IncidentService.Incidents/category_code">
        <Annotation Term="Common.Text" Path="title"/>
    </Annotations>
    <Annotations Target="IncidentService.Incidents/title">
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
                name: 'direct path (no navigation hop) - trivial label flagged',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, TEXT_PROPERTY_DIRECT_PATH_TRIVIAL_LABEL),
                errors: [{ messageId: 'trivialLabel' }]
            },
            []
        ),
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

// ─── V2 rule tests (inline sap:text / sap:label injection) ───────────────────

// The V2 metadata fixture, when linted directly, produces 3 errors from injected sap: attributes:
//   1. SEPMRA_C_ALP_ProductType/ProductName  sap:label="Name"         → trivialLabel
//   2. SEPMRA_C_ALP_ProductType/Currency_T   sap:label="Description"  → trivialLabel
//   3. Z_SEPMRA_SO_SALESORDERANALYSISType/QuantityUnitT  sap:label="Quantity Unit"
//      == QuantityUnit sap:label="Quantity Unit"          → duplicateLabel
//
// Linting annotation.xml for the same project produces no errors because the synthetic
// annotation elements are injected only into the metadata.xml annotation file AST, and the
// createAnnotations selector does not match them during annotation.xml traversal.

ruleTester.run(`${TEST_NAME} (V2)`, descriptionColumnLabelRule, {
    valid: [
        createValidTest(
            {
                name: 'V2 annotation.xml - no errors (synthetic sap:text/sap:label elements live in metadata.xml AST)',
                filename: V2_ANNOTATIONS_PATH,
                code: V2_ANNOTATIONS
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'V2 metadata.xml - trivial and duplicate labels from injected sap:text/sap:label are flagged',
                filename: V2_METADATA_PATH,
                code: V2_METADATA,
                errors: [
                    {
                        messageId: 'trivialLabel',
                        data: {
                            textPropertyTarget: 'TECHED_ALP_SOA_SRV.SEPMRA_C_ALP_ProductType/ProductName',
                            textPropertyLabel: 'Name',
                            idPropertyTarget: 'TECHED_ALP_SOA_SRV.SEPMRA_C_ALP_ProductType/Product',
                            idPropertyLabel: ''
                        }
                    },
                    {
                        messageId: 'trivialLabel',
                        data: {
                            textPropertyTarget: 'TECHED_ALP_SOA_SRV.SEPMRA_C_ALP_ProductType/Currency_T',
                            textPropertyLabel: 'Description',
                            idPropertyTarget: 'TECHED_ALP_SOA_SRV.SEPMRA_C_ALP_ProductType/Currency',
                            idPropertyLabel: ''
                        }
                    },
                    {
                        messageId: 'duplicateLabel',
                        data: {
                            textPropertyTarget: 'TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType/QuantityUnitT',
                            textPropertyLabel: 'Quantity Unit',
                            idPropertyTarget: 'TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType/QuantityUnit',
                            idPropertyLabel: 'Quantity Unit'
                        }
                    }
                ]
            },
            []
        )
    ]
});
