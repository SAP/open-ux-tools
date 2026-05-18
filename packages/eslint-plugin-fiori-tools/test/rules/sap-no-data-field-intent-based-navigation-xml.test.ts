import { RuleTester } from 'eslint';
import intentBasedNavRule from '../../src/rules/sap-no-data-field-intent-based-navigation';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    setup,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
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

const V4_FIELD_GROUP_ANNOTATIONS = `<Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.HeaderFacets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Label" String="formSection" />
                            <PropertyValue Property="ID" String="formSection" />
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#formSection" />
                        </Record>
                    </Collection>
                </Annotation>
                <Annotation Term="UI.FieldGroup" Qualifier="formSection">
                    <Record Type="UI.FieldGroupType">
                        <PropertyValue Property="Data">
                            <Collection>
                                <Record Type="UI.DataField">
                                    <PropertyValue Property="Value" Path="identifier" />
                                    <PropertyValue Property="Label" String="identifier" />
                                </Record>
                                <Record Type="UI.DataField">
                                    <PropertyValue Property="Value" Path="createdBy" />
                                    <PropertyValue Property="Label" String="createdBy" />
                                </Record>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;

const V4_FIELD_GROUP_ANNOTATIONS_DF = `<Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.HeaderFacets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Label" String="formSection" />
                            <PropertyValue Property="ID" String="formSection" />
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#formSection" />
                        </Record>
                    </Collection>
                </Annotation>
                <Annotation Term="UI.FieldGroup" Qualifier="formSection">
                    <Record Type="UI.FieldGroupType">
                        <PropertyValue Property="Data">
                            <Collection>
                                <Record Type="UI.DataFieldForIntentBasedNavigation">
                                    <PropertyValue Property="SemanticObject" String="qwertty" />
                                    <PropertyValue Property="Action" String="toappnavsample" />
                                </Record>
                                <Record Type="UI.DataFieldWithIntentBasedNavigation">
                                    <PropertyValue Property="Value" Int="1" />
                                    <PropertyValue Property="SemanticObject" String="" />
                                    <PropertyValue Property="Label" String="test00" />
                                </Record>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;

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

const V2_TABLE_ANNOTATION_DF = `
           <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
                <Annotation Term="UI.LineItem">
                    <Collection>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="DeliveryCalendarYear" />
                            <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High" />
                        </Record>                        
                        <Record Type="UI.DataFieldForIntentBasedNavigation">
                            <PropertyValue Property="SemanticObject" String="qwerty"/>
                        </Record>
                        <Record Type="UI.DataFieldWithIntentBasedNavigation">
                            <PropertyValue Property="Value" String="asdfg"/>
                            <PropertyValue Property="SemanticObject" String=""/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
                `;

export const V2_FACETS_ANNOTATIONS = `
            <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
                 <Annotation Term="UI.Facets" >
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Products"/>
                            <PropertyValue Property="Target" AnnotationPath="@UI.LineItem"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
            `;

const V2_FACETS_ANNOTATIONS_DF = `
            <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
                 <Annotation Term="UI.Facets" >
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Products"/>
                            <PropertyValue Property="Target" AnnotationPath="@UI.LineItem"/>
                        </Record>
                    </Collection>
                </Annotation>
                <Annotation Term="UI.LineItem">
                    <Collection>                        
                        <Record Type="UI.DataFieldForIntentBasedNavigation">
                            <PropertyValue Property="SemanticObject" String="qwerty"/>
                        </Record>
                        <Record Type="UI.DataFieldWithIntentBasedNavigation">
                            <PropertyValue Property="Value" String="asdfg"/>
                            <PropertyValue Property="SemanticObject" String=""/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
            `;

const V2_FIELD_FROUP_ANNOTATIONS = ` <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
                <Annotation Term="UI.FieldGroup" Qualifier="formSection">
                    <Record Type="UI.FieldGroupType">
                        <PropertyValue Property="Data">
                            <Collection>
                                <Record Type="UI.DataField">
                                    <PropertyValue Property="Value" Path="Currency" />
                                    <PropertyValue Property="Label" String="Currency" />
                                </Record>
                                <Record Type="UI.DataField">
                                    <PropertyValue Property="Value" Path="GrossAmount" />
                                    <PropertyValue Property="Label" String="GrossAmount" />
                                </Record>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;

const V2_FIELD_FROUP_ANNOTATIONS_DF = ` <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
                <Annotation Term="UI.HeaderFacets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Label" String="formSection" />
                            <PropertyValue Property="ID" String="formSection" />
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#formSection" />
                        </Record>
                    </Collection>
                </Annotation>
                <Annotation Term="UI.FieldGroup" Qualifier="formSection">
                    <Record Type="UI.FieldGroupType">
                        <PropertyValue Property="Data">
                            <Collection>
                                <Record Type="UI.DataFieldForIntentBasedNavigation">
                                    <PropertyValue Property="SemanticObject" String="qwertty" />
                                    <PropertyValue Property="Action" String="toappnavsample" />
                                </Record>
                                <Record Type="UI.DataFieldWithIntentBasedNavigation">
                                    <PropertyValue Property="Value" Int="1" />
                                    <PropertyValue Property="SemanticObject" String="" />
                                    <PropertyValue Property="Label" String="test00" />
                                </Record>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>`;

const TEST_NAME = 'sap-no-data-field-intent-based-navigation';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, intentBasedNavRule, {
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
        ),
        createValidTest(
            {
                name: 'V4: FieldGroup annotation without DF intent based navigation',
                filename: V4_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FIELD_GROUP_ANNOTATIONS)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: LR table with no DF intent based navigation',
                filename: V2_ANNOTATIONS_PATH,
                code: V2_ANNOTATIONS
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: OP table with no DF intent based navigation',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_FACETS_ANNOTATIONS)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2: FieldGroup annotation without DF intent based navigation',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_FIELD_FROUP_ANNOTATIONS)
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
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        line: 20,
                        column: 25,
                        endLine: 23,
                        endColumn: 34
                    },
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
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
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        line: 31,
                        column: 24,
                        endLine: 34,
                        endColumn: 34
                    },
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 25,
                        endColumn: 34,
                        endLine: 37,
                        line: 35
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V4: FieldGroup annotation with DF intent based navigation',
                code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FIELD_GROUP_ANNOTATIONS_DF),
                filename: V4_ANNOTATIONS_PATH,
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 33,
                        endColumn: 42,
                        endLine: 33,
                        line: 30
                    },
                    {
                        message:
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 33,
                        endColumn: 42,
                        endLine: 38,
                        line: 34
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: LR table with DF intent based navigation',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_TABLE_ANNOTATION_DF),
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 25,
                        endColumn: 34,
                        endLine: 243,
                        line: 241
                    },
                    {
                        message:
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 25,
                        endColumn: 34,
                        endLine: 247,
                        line: 244
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: OP table with DF intent based navigation',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_FACETS_ANNOTATIONS_DF),
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        line: 245,
                        column: 25,
                        endLine: 247,
                        endColumn: 34
                    },
                    {
                        message:
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        line: 248,
                        column: 25,
                        endLine: 251,
                        endColumn: 34
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2: FieldGroup annotation with DF intent based navigation',
                filename: V2_ANNOTATIONS_PATH,
                code: getAnnotationsAsXmlCode(V2_ANNOTATIONS, V2_FIELD_FROUP_ANNOTATIONS_DF),
                errors: [
                    {
                        message:
                            'DataFieldForIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 33,
                        endColumn: 42,
                        endLine: 250,
                        line: 247
                    },
                    {
                        message:
                            'DataFieldWithIntentBasedNavigation annotation must not be used. Please use a semantic link navigation instead.',
                        column: 33,
                        endColumn: 42,
                        endLine: 255,
                        line: 251
                    }
                ]
            },
            []
        )
    ]
});
