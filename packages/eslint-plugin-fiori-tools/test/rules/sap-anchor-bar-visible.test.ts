import { RuleTester } from 'eslint';
import anchorBarVisibleRule from '../../src/rules/sap-anchor-bar-visible';
import { meta, languages } from '../../src/index';
import { getManifestAsCode, setup, V4_MANIFEST, V4_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-anchor-bar-visible';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, anchorBarVisibleRule, {
    valid: [
        createValidTest(
            {
                name: 'anchorBarVisible not configured',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'Form Entry Object Page - both visible and anchorBarVisible are false (valid exception)',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'CategoriesObjectPage',
                            'options',
                            'settings',
                            'content',
                            'header',
                            'visible'
                        ],
                        value: false
                    },
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'CategoriesObjectPage',
                            'options',
                            'settings',
                            'content',
                            'header',
                            'anchorBarVisible'
                        ],
                        value: false
                    }
                ])
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'anchorBarVisible is false - should report',
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
                            'content',
                            'header',
                            'anchorBarVisible'
                        ],
                        value: false
                    }
                ]),
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsObjectPage',
                            'options',
                            'settings',
                            'content',
                            'header'
                        ],
                        value: {}
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-anchor-bar-visible',
                        line: 144,
                        column: 19
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'Form Entry Object Page - anchorBarVisible is false but visible is not false - should report',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'CategoriesObjectPage',
                            'options',
                            'settings',
                            'content',
                            'header',
                            'anchorBarVisible'
                        ],
                        value: false
                    }
                ]),
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'CategoriesObjectPage',
                            'options',
                            'settings',
                            'content',
                            'header'
                        ],
                        value: {}
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-anchor-bar-visible',
                        line: 164,
                        column: 19
                    }
                ]
            },
            []
        )
    ]
});
