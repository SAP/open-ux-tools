import { RuleTester } from 'eslint';
import flexEnabledRule from '../../src/rules/sap-flex-enabled';
import { meta, languages } from '../../src/index';
import { V4_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

ruleTester.run('sap-flex-enabled', flexEnabledRule, {
    valid: [
        {
            name: ' Non-manifest files should be ignored',
            filename: 'some-other-file.json',
            code: '{"sap.ui5":{"flexEnabled":false}}'
        },

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

        {
            name: ' Non-object root - should be ignored',
            filename: V4_MANIFEST_PATH,
            code: '"not an object"'
        },

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
        }
    ],

    invalid: [
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
        }
    ]
});
