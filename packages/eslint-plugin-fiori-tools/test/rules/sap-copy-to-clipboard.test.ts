import { RuleTester } from 'eslint';
import copyToClipboardRule from '../../src/rules/sap-copy-to-clipboard';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH,
    V2_ANNOTATIONS,
    V2_ANNOTATIONS_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const FACETSV4 = {
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

const FACETSV2 = {
    filename: V2_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(
        V2_ANNOTATIONS,
        `
            <Annotations Target="TECHED_ALP_SOA_SRV.Z_SEPMRA_SO_SALESORDERANALYSISType">
                 <Annotation Term="UI.Facets" >
                 <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Products"/>
                            <PropertyValue Property="Label" String="TableFacet"/>
                            <PropertyValue Property="Target" AnnotationPath="@UI.LineItem"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
            `
    )
};

const TEST_NAME = 'sap-copy-to-clipboard';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, copyToClipboardRule, {
    valid: [
        // V2
        createValidTest(
            {
                name: 'V2 - copy missing',
                filename: V2_MANIFEST_PATH,
                code: JSON.stringify(V2_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - object page table - redundant true value',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'pages',
                            'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'sections',
                            '',
                            'tableSettings',
                            'copy'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV2]
        ),
        // V4
        createValidTest(
            {
                name: 'V4 - disableCopyToClipboard missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - object page table - redundant false value',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
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
                    }
                ])
            },
            [FACETSV4]
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V2 - copy is false',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'pages',
                            'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'sections',
                            '',
                            'tableSettings',
                            'copy'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-copy-to-clipboard',
                        line: 154,
                        column: 23
                    }
                ]
            },
            [FACETSV2]
        ),
        createInvalidTest(
            {
                name: 'V4 - disableCopyToClipboard is true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
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
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-copy-to-clipboard',
                        line: 127,
                        column: 21
                    }
                ]
            },
            [FACETSV4]
        )
    ]
});
