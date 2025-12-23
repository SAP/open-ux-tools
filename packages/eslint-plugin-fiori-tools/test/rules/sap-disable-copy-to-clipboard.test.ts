import { RuleTester } from 'eslint';
import disableCopyToClipboardRule from '../../src/rules/sap-disable-copy-to-clipboard';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const _6_COLUMNS_ANNOTATIONS = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(
        V4_ANNOTATIONS,
        `
            <Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.LineItem">
                    <Collection>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="identifier"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="title"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="category_code"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="priority_code"/>
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="incidentStatus_code"/>
                        </Record>
                         <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="incidentStatus_code"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
                `
    )
};

const FACETS = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(
        V4_ANNOTATIONS,
        `
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
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="processStep" />
                            <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High" />
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="stepStatus" />
                            <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High" />
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
                `
    )
};

const TEST_NAME = 'sap-disable-copy-to-clipboard';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, disableCopyToClipboardRule, {
    valid: [
        createValidTest(
            {
                name: 'disableCopyToClipboard set to true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, {
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
                        'disableCopyToClipboard'
                    ],
                    value: true
                })
            },
            [_6_COLUMNS_ANNOTATIONS]
        ),
        createValidTest(
            {
                name: 'disableCopyToClipboard missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            [_6_COLUMNS_ANNOTATIONS]
        ),
        createValidTest(
            {
                name: 'disableCopyToClipboard is true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, {
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
                        'disableCopyToClipboard'
                    ],
                    value: true
                })
            },
            [_6_COLUMNS_ANNOTATIONS]
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'object page table - redundant false value',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, {
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
                        'disableCopyToClipboard'
                    ],
                    value: false
                }),
                errors: [
                    {
                        messageId: 'sap-disable-copy-to-clipboard',
                        line: 122,
                        column: 21
                    }
                ]
            },
            [FACETS, _6_COLUMNS_ANNOTATIONS]
        )
    ]
});
