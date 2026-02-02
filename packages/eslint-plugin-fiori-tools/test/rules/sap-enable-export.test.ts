import { RuleTester } from 'eslint';
import enableExportRule from '../../src/rules/sap-enable-export';
import { meta, languages } from '../../src/index';
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

const FACETSV4 = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
};

const TEST_NAME = 'sap-enable-export';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, enableExportRule, {
    valid: [
        createValidTest(
            {
                name: 'V4 - enableExport missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - object page table - enableExport is true',
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
                            'enableExport'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4 - enableExport is false',
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
                            'enableExport'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-enable-export',
                        line: 127,
                        column: 21
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
                            type: 'ResponsiveTable',
                            selectionMode: 'Auto'
                            // enableExport property removed
                        }
                    }
                ])
            },
            [FACETSV4]
        )
    ]
});
