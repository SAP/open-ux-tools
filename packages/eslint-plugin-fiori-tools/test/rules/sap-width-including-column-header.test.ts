import { join } from 'node:path';

import { RuleTester } from 'eslint';
import flexEnabledRule from '../../src/rules/sap-width-including-column-header';
import { meta, languages } from '../../src/index';
import type { FileChange } from '../test-helper';
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

const ORIGINAL_ANNOTATIONS = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, '')
};

const TEST_NAME = 'sap-width-including-column-header';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, flexEnabledRule, {
    valid: [
        // Non-manifest files should be ignored
        createValidTest(
            {
                name: 'non manifest file',
                filename: 'some-other-file.json',
                code: JSON.stringify(V4_MANIFEST)
            },
            []
        ),
        createValidTest(
            {
                name: 'widthIncludingColumnHeader set to true for small table',
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
                        'widthIncludingColumnHeader'
                    ],
                    value: true
                })
            },
            [ORIGINAL_ANNOTATIONS]
        ),
        createValidTest(
            {
                name: 'table with 6 columns',
                filename: V4_MANIFEST_PATH,
                only: true,
                code: JSON.stringify(V4_MANIFEST)
            },
            [_6_COLUMNS_ANNOTATIONS]
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'widthIncludingColumnHeader missing for small table',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 119,
                        column: 19
                    }
                ]
            },
            [ORIGINAL_ANNOTATIONS]
        ),
        createInvalidTest(
            {
                name: 'small object page table (annotation file)',
                ...FACETS,
                errors: [
                    {
                        messageId: 'width-including-column-header',
                        line: 29,
                        column: 18
                    }
                ]
            },
            [
                {
                    filename: V4_MANIFEST_PATH,
                    code: JSON.stringify(V4_MANIFEST, undefined, 2)
                }
            ]
        ),
        createInvalidTest(
            {
                name: 'small object page table',
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
                        'widthIncludingColumnHeader'
                    ],
                    value: true
                }),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 134,
                        column: 13
                    }
                ]
            },
            [FACETS]
        )
    ]
});
