import { RuleTester } from 'eslint';
import flexEnabledRule from '../../src/rules/flex-enabled';
import consistency from '../../src/index';

const ruleTester = new RuleTester({
    plugins: {
        consistency
    },
    language: 'consistency/json'
});

ruleTester.run('flex-enabled', flexEnabledRule, {
    valid: [
        // Non-manifest files should be ignored
        {
            filename: 'some-other-file.json',
            code: '{"sap.ui5":{"flexEnabled":false}}'
        },

        // flexEnabled is true - valid
        {
            filename: 'manifest.json',
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

        // UI5 version below 1.56.0 - rule should not apply
        {
            filename: 'manifest.json',
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

        // No minUI5Version specified - rule should not apply
        {
            filename: 'manifest.json',
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

        // Non-object root - should be ignored
        {
            filename: 'manifest.json',
            code: '"not an object"'
        },

        // No sap.ui5 section - rule should not apply
        {
            filename: 'manifest.json',
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
        // flexEnabled is false - should be fixed to true
        {
            filename: 'manifest.json',
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
                    messageId: 'flexEnabled',
                    line: 3,
                    column: 5
                }
            ]
        },

        // flexEnabled missing - should be created if this has minUI5Version >= 1.56.0
        {
            filename: 'manifest.json',
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
                    messageId: 'flexEnabled',
                    line: 2,
                    column: 3
                }
            ]
        },

        // Higher UI5 version - should enforce flexEnabled
        {
            filename: 'manifest.json',
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
                    messageId: 'flexEnabled',
                    line: 3,
                    column: 5
                }
            ]
        },

        // Complex manifest with flexEnabled missing
        {
            filename: 'manifest.json',
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
                    messageId: 'flexEnabled',
                    line: 9,
                    column: 3
                }
            ]
        }
    ]
});
