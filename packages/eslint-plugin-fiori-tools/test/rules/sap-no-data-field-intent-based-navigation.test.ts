import { RuleTester } from 'eslint';
import flexEnabledRule from '../../src/rules/sap-no-data-field-intent-based-navigation';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_FACETS_ANNOTATIONS
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const V4_TABLE_ANNOTATION_DF = `
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.LineItem">
                    <Collection>
                        <Record Type="UI.DataFieldWithIntentBasedNavigation">
                            <PropertyValue Property="Value" Bool="false" />
                            <PropertyValue Property="SemanticObject" String="" />
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="title"/>
                        </Record>
                        <Record Type="UI.DataFieldForIntentBasedNavigation">
                            <PropertyValue Property="SemanticObject" String="qwerty"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
                `;

const V4_FACETS_ANNOTATIONS_DF = `
            <Annotations Target="IncidentService.Incidents">
                 <Annotation Term="UI.Facets" >
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Products"/>
                            <PropertyValue Property="Label" String="Prducts"/>
                            <PropertyValue Property="Target" AnnotationPath="incidentFlow/@UI.LineItem"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
             <Annotations Target="IncidentService.IncidentFlow">
                 <Annotation Term="UI.LineItem">
                    <Collection>
                       <Record Type="UI.DataFieldWithIntentBasedNavigation">
                            <PropertyValue Property="Value" Bool="false" />
                            <PropertyValue Property="SemanticObject" String="" />
                        </Record>
                        <Record Type="UI.DataFieldForIntentBasedNavigation">
                            <PropertyValue Property="SemanticObject" String="qwerty"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
            `;

const TEST_NAME = 'sap-no-data-field-intent-based-navigation';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, flexEnabledRule, {
    valid: [
        createValidTest(
            // Non-XML files should be ignored
            {
                name: 'non XML file - json',
                filename: 'some-other-file.json',
                code: '{}'
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: LR table with no DF intent based navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: V4_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V4: OP table with no DF intent based navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4: LR table with DF intent based navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_TABLE_ANNOTATION_DF),
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation as well as the DataFieldWithIntentBasedNavigation should not be used. Please use a semantic link navigation instead.',
                        line: 20,
                        column: 25,
                        endLine: 23,
                        endColumn: 34
                    },
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation as well as the DataFieldWithIntentBasedNavigation should not be used. Please use a semantic link navigation instead.',
                        line: 27,
                        column: 25,
                        endLine: 29,
                        endColumn: 34
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: OP table with DF intent based navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS_DF),
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation as well as the DataFieldWithIntentBasedNavigation should not be used. Please use a semantic link navigation instead.',
                        line: 31,
                        column: 24,
                        endLine: 34,
                        endColumn: 34
                    },
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation as well as the DataFieldWithIntentBasedNavigation should not be used. Please use a semantic link navigation instead.',
                        column: 25,
                        endColumn: 34,
                        endLine: 37,
                        line: 35
                    }
                ]
            },
            []
        )
    ]
});
