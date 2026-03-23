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
    V4_FACETS_ANNOTATIONS,
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
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
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
                name: 'non manifest file - json',
                filename: 'some-other-file.json',
                code: JSON.stringify(V4_MANIFEST)
            },
            []
        ),
        createValidTest(
            {
                name: 'non manifest file - xml',
                filename: 'some-other-file.xml',
                code: ''
            },
            []
        ),
        createValidTest(
            {
                name: 'widthIncludingColumnHeader set to true for small table',
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
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    }
                ])
            },
            [ORIGINAL_ANNOTATIONS]
        ),
        createValidTest(
            {
                name: 'table with 6 columns',
                filename: V4_MANIFEST_PATH,
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
                code: getManifestAsCode(V4_MANIFEST, []),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 124,
                        column: 19
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
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
                            'tableSettings'
                        ],
                        value: {
                            'widthIncludingColumnHeader': true,
                            'type': 'ResponsiveTable',
                            'selectionMode': 'Auto'
                        }
                    }
                ])
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
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    }
                ]),
                errors: [
                    {
                        messageId: 'width-including-column-header-manifest',
                        line: 139,
                        column: 13
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
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
                            'widthIncludingColumnHeader'
                        ],
                        value: true
                    },
                    {
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsObjectPage', 'options', 'settings'],
                        value: {
                            controlConfiguration: {
                                'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem': {
                                    tableSettings: {
                                        widthIncludingColumnHeader: true
                                    }
                                }
                            },
                            editableHeaderContent: false,
                            entitySet: 'Incidents',
                            showDraftToggle: true
                        }
                    }
                ])
            },
            [FACETS]
        )
    ]
});
