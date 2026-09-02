import { RuleTester } from 'eslint';
import noCommaInSectionTitle from '../../src/rules/sap-no-comma-in-section-title.js';
import { meta, languages } from '../../src/index.js';
import {
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_I18N_PATH,
    V4_I18N_CONTENT,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    getAnnotationsAsXmlCode,
    setup
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-comma-in-section-title';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

const EXPECTED_MESSAGE =
    'Section or subsection title must not contain commas. Commas are used as delimiters for backend message grouping.';

const facetWithLabel = (label: string) => `<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="GeneratedFacet" />
                <PropertyValue Property="Label" String="${label}" />
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneratedGroup" />
            </Record>
        </Collection>
    </Annotation>
</Annotations>`;

// Annotation snippet helpers — replace the existing label in V4_ANNOTATIONS
const withV4Label = (label: string): string => getAnnotationsAsXmlCode(V4_ANNOTATIONS, facetWithLabel(label));

// Replace an i18n entry value in the fixture content
const withI18nEntry = (key: string, value: string): string =>
    V4_I18N_CONTENT.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);

// V4 annotation with a CollectionFacet containing a subsection with comma label
const V4_COLLECTION_FACET_COMMA = getAnnotationsAsXmlCode(
    V4_ANNOTATIONS,
    `<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
        <Record Type="UI.CollectionFacet">
            <PropertyValue Property="ID" String="GroupSection"/>
            <PropertyValue Property="Label" String="Group Section"/>
            <PropertyValue Property="Facets">
            <Collection>
                <Record Type="UI.ReferenceFacet">
                    <PropertyValue Property="ID" String="Sub1"/>
                    <PropertyValue Property="Label" String="Subsection, invalid"/>
                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneratedGroup1"/>
                </Record>
                </Collection>
            </PropertyValue>
        </Record>
    </Collection>
    </Annotation>
</Annotations>`
);

// V2 base with comma in section label
const V2_WITH_COMMA = V2_ANNOTATIONS.replace(
    '<PropertyValue Property="Label" String="Products" />',
    '<PropertyValue Property="Label" String="Products, Category" />'
);

ruleTester.run(TEST_NAME, noCommaInSectionTitle, {
    valid: [
        // V4: annotation with i18n binding label — not flagged in annotation pass (i18n pass handles it)
        createValidTest(
            {
                name: 'V4: i18n binding label is not flagged in annotations',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        // V4: direct label without comma
        createValidTest(
            {
                name: 'V4: direct label without comma',
                filename: V4_ANNOTATIONS_PATH,
                code: withV4Label('Clean Section Title')
            },
            []
        ),
        // V2: base annotations — "Products" has no comma
        createValidTest({ name: 'V2: label without comma', filename: V2_ANNOTATIONS_PATH, code: V2_ANNOTATIONS }, []),
        // V4: section label key exists in i18n but value has no comma
        createValidTest(
            {
                name: 'V4: i18n entry without comma is not flagged',
                filename: V4_I18N_PATH,
                code: withI18nEntry('tableSection00', 'table section 00')
            },
            [{ filename: V4_ANNOTATIONS_PATH, code: V4_ANNOTATIONS }]
        )
    ],
    invalid: [
        // V4: direct string label with comma
        createInvalidTest(
            {
                name: 'V4: section label with comma',
                filename: V4_ANNOTATIONS_PATH,
                code: withV4Label('Section, with comma'),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        // V4: subsection label with comma inside CollectionFacet
        createInvalidTest(
            {
                name: 'V4: subsection label with comma',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_COLLECTION_FACET_COMMA,
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        // V2: direct string label with comma
        createInvalidTest(
            {
                name: 'V2: section label with comma',
                filename: V2_ANNOTATIONS_PATH,
                code: V2_WITH_COMMA,
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            []
        ),
        // V4: i18n entry used as section label has comma → error reported on i18n property
        createInvalidTest(
            {
                name: 'V4: i18n entry value has comma',
                filename: V4_I18N_PATH,
                code: withI18nEntry('tableSection00', 'table, section, 00'),
                errors: [{ message: EXPECTED_MESSAGE }]
            },
            [{ filename: V4_ANNOTATIONS_PATH, code: withV4Label('{@i18n>tableSection00}') }]
        )
    ]
});
