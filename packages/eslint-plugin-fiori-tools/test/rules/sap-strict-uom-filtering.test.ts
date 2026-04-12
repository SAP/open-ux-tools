import { RuleTester } from 'eslint';
import strictUomFilteringRule from '../../src/rules/sap-strict-uom-filtering';
import { meta, languages } from '../../src/index';
import { getManifestAsCode, setup, V4_MANIFEST, V4_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-strict-uom-filtering';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, strictUomFilteringRule, {
    valid: [
        createValidTest(
            {
                name: 'disableStrictUomFiltering not configured',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'disableStrictUomFiltering set to false - valid',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.fe', 'app', 'disableStrictUomFiltering'],
                        value: false
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'disableStrictUomFiltering is true but UI5 version is below 1.143 - should not report',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.fe', 'app', 'disableStrictUomFiltering'],
                        value: true
                    }
                ])
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'disableStrictUomFiltering is true - should report',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.143.0'
                    },
                    {
                        path: ['sap.fe', 'app', 'disableStrictUomFiltering'],
                        value: true
                    }
                ]),
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'dependencies', 'minUI5Version'],
                        value: '1.143.0'
                    },
                    {
                        path: ['sap.fe', 'app'],
                        value: {}
                    }
                ]),
                errors: [
                    {
                        messageId: 'sap-strict-uom-filtering',
                        line: 189,
                        column: 7
                    }
                ]
            },
            []
        )
    ]
});
