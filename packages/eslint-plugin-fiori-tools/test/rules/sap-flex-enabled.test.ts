import { RuleTester } from 'eslint';
import flexEnabledRule from '../../src/rules/sap-flex-enabled';
import { meta, languages } from '../../src/index';
import { setup, V4_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-flex-enabled';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, flexEnabledRule, {
    valid: [
        createValidTest(
            {
                name: ' Non-manifest files should be ignored',
                filename: 'some-other-file.json',
                code: '{"sap.ui5":{"flexEnabled":false}}'
            },
            []
        ),
        createValidTest(
            {
                name: ' flexEnabled is true - valid',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: true,
                            dependencies: {
                                minUI5Version: '1.56.0'
                            }
                        }
                    },
                    null,
                    2
                )
            },
            []
        ),
        createValidTest(
            {
                name: ' UI5 version below 1.56.0 - rule should not apply',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: false,
                            dependencies: {
                                minUI5Version: '1.55.0'
                            }
                        }
                    },
                    null,
                    2
                )
            },
            []
        ),
        createValidTest(
            {
                name: ' No minUI5Version specified - rule should not apply',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: false
                        }
                    },
                    null,
                    2
                )
            },
            []
        ),
        createValidTest(
            {
                name: ' Non-object root - should be ignored',
                filename: V4_MANIFEST_PATH,
                code: '"not an object"'
            },
            []
        ),
        createValidTest(
            {
                name: ' No sap.ui5 section - rule should not apply',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.app': {
                            id: 'test.app'
                        }
                    },
                    null,
                    2
                )
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: ' flexEnabled is false - should be fixed to true',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: false,
                            dependencies: {
                                minUI5Version: '1.56.0'
                            }
                        }
                    },
                    null,
                    2
                ),
                output: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: true,
                            dependencies: {
                                minUI5Version: '1.56.0'
                            }
                        }
                    },
                    null,
                    2
                ),
                errors: [
                    {
                        messageId: 'sap-flex-enabled',
                        line: 3,
                        column: 5
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: ' flexEnabled missing - should be created if this has minUI5Version >= 1.56.0',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.ui5': {
                            dependencies: {
                                minUI5Version: '1.56.0'
                            }
                        }
                    },
                    null,
                    2
                ),
                output: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: true,
                            dependencies: {
                                minUI5Version: '1.56.0'
                            }
                        }
                    },
                    null,
                    2
                ),
                errors: [
                    {
                        messageId: 'sap-flex-enabled',
                        line: 2,
                        column: 3
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'Higher UI5 version - should enforce flexEnabled',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: false,
                            dependencies: {
                                minUI5Version: '1.60.0'
                            }
                        }
                    },
                    null,
                    2
                ),
                output: JSON.stringify(
                    {
                        'sap.ui5': {
                            flexEnabled: true,
                            dependencies: {
                                minUI5Version: '1.60.0'
                            }
                        }
                    },
                    null,
                    2
                ),
                errors: [
                    {
                        messageId: 'sap-flex-enabled',
                        line: 3,
                        column: 5
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'Complex manifest with flexEnabled missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(
                    {
                        'sap.app': {
                            id: 'com.example.app',
                            type: 'application'
                        },
                        'sap.ui': {
                            technology: 'UI5'
                        },
                        'sap.ui5': {
                            dependencies: {
                                minUI5Version: '1.58.0'
                            },
                            models: {
                                '': {
                                    dataSource: 'mainService'
                                }
                            }
                        }
                    },
                    null,
                    2
                ),
                output: JSON.stringify(
                    {
                        'sap.app': {
                            id: 'com.example.app',
                            type: 'application'
                        },
                        'sap.ui': {
                            technology: 'UI5'
                        },
                        'sap.ui5': {
                            flexEnabled: true,
                            dependencies: {
                                minUI5Version: '1.58.0'
                            },
                            models: {
                                '': {
                                    dataSource: 'mainService'
                                }
                            }
                        }
                    },
                    null,
                    2
                ),
                errors: [
                    {
                        messageId: 'sap-flex-enabled',
                        line: 9,
                        column: 3
                    }
                ]
            },
            []
        )
    ]
});
