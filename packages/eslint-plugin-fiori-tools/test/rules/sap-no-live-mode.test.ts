import { RuleTester } from 'eslint';
import noLiveModeRule from '../../src/rules/sap-no-live-mode.js';
import { meta, languages } from '../../src/index.js';
import {
    getManifestAsCode,
    setup,
    V2_MANIFEST,
    V2_MANIFEST_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-live-mode';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, noLiveModeRule, {
    valid: [
        createValidTest(
            {
                name: 'V4 - non-json file',
                filename: 'file_name.xml',
                code: '<>'
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - liveMode not defined',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - object page table - liveMode is false, property is not checked',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsObjectPage',
                            'options',
                            'settings',
                            'liveMode'
                        ],
                        value: false
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - ODataV2 application is not checked',
                filename: V2_MANIFEST_PATH,
                code: JSON.stringify(V2_MANIFEST, undefined, 2)
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4 - list report page - liveMode is true',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsList', 'options', 'settings', 'liveMode'],
                        value: true
                    }
                ]),
                errors: [
                    {
                        message:
                            'The Go Button must always be present in the application filter bar, so the liveMode property should not be used.',
                        line: 130,
                        column: 15
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsList', 'options', 'settings'],
                        value: {
                            // liveMode property removed
                            entitySet: 'Incidents',
                            variantManagement: 'Page',
                            navigation: {
                                Incidents: {
                                    detail: {
                                        route: 'IncidentsObjectPage'
                                    }
                                }
                            },
                            controlConfiguration: {
                                '@com.sap.vocabularies.UI.v1.LineItem': {
                                    tableSettings: {
                                        type: 'ResponsiveTable',
                                        selectionMode: 'Auto'
                                    }
                                }
                            }
                        }
                    }
                ])
            },
            []
        )
    ]
});
