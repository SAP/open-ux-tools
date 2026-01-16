/**
 * State Preservation Mode rule for Fiori Elements V4
 *
 * V4 Decision logic:
 * - Only "persistence" mode is supported
 * - "discovery" mode is not applicable to SAP Fiori elements for OData V4
 */

import rule from '../../src/rules/sap-state-preservation-mode';
import { RuleTester } from 'eslint';
import { meta, languages } from '../../src/index';
import { getManifestAsCode, setup, V4_MANIFEST, V4_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-state-preservation-mode-v4';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

//------------------------------------------------------------------------------
// FE V4 Tests
//------------------------------------------------------------------------------
ruleTester.run(TEST_NAME, rule, {
    valid: [
        // Scenario 1: V4 with persistence mode (only valid option)
        createValidTest(
            {
                name: 'V4 with persistence mode - PASS',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.fe', 'settings', 'statePreservationMode'],
                        value: 'persistence'
                    }
                ])
            },
            []
        ),
        // Scenario 2: V4 without statePreservationMode defined (defaults to persistence)
        createValidTest(
            {
                name: 'V4 without statePreservationMode defined - PASS',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [])
            },
            []
        )
    ],
    invalid: [
        // Scenario 3: V4 with discovery mode (not supported)
        createInvalidTest(
            {
                name: 'V4 with discovery mode - ERROR (not supported)',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.fe', 'settings', 'statePreservationMode'],
                        value: 'discovery'
                    }
                ]),
                errors: [
                    {
                        messageId: 'discoveryNotSupportedV4'
                    }
                ]
            },
            []
        ),
        // Scenario 4: V4 with invalid statePreservationMode value
        createInvalidTest(
            {
                name: 'V4 with invalid statePreservationMode - ERROR',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.fe', 'settings', 'statePreservationMode'],
                        value: 'invalidMode'
                    }
                ]),
                errors: [
                    {
                        messageId: 'invalidMode'
                    }
                ]
            },
            []
        )
    ]
});