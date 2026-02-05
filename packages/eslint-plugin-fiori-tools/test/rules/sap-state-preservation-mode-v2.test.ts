/**
 * State Preservation Mode rule for Fiori Elements V2
 *
 * Decision tree:
 * - Is FCL (Flexible Column Layout) defined?
 *   - No → "discovery" mode is default/recommended
 *   - Yes → "persistence" mode is default/recommended
 */

import rule from '../../src/rules/sap-state-preservation-mode';
import { RuleTester } from 'eslint';
import { meta, languages } from '../../src/index';
import { getManifestAsCode, setup, V2_MANIFEST, V2_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-state-preservation-mode-v2';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

//------------------------------------------------------------------------------
// FE V2 Tests
//------------------------------------------------------------------------------
ruleTester.run(TEST_NAME, rule, {
    valid: [
        // Scenario 1: FCL defined + persistence mode (recommended for FCL)
        createValidTest(
            {
                name: 'FCL defined with persistence mode - PASS',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'flexibleColumnLayout', 'defaultTwoColumnLayoutType'],
                        value: 'TwoColumnsBeginExpanded'
                    },
                    {
                        path: ['sap.ui.generic.app', 'settings', 'statePreservationMode'],
                        value: 'persistence'
                    }
                ])
            },
            []
        ),
        // Scenario 2: No FCL + discovery mode (recommended for non-FCL)
        createValidTest(
            {
                name: 'No FCL with discovery mode - PASS',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'statePreservationMode'],
                        value: 'discovery'
                    }
                ])
            },
            []
        ),
        // Scenario 3: No statePreservationMode defined (defaults apply)
        createValidTest(
            {
                name: 'No statePreservationMode defined - PASS',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [])
            },
            []
        )
    ],
    invalid: [
        // Scenario 4: Invalid statePreservationMode value
        createInvalidTest(
            {
                name: 'Invalid statePreservationMode value - WARN',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'statePreservationMode'],
                        value: 'invalidMode'
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, []),
                errors: [
                    {
                        message: 'Invalid value "invalidMode" for statePreservationMode. "discovery" is recommended.'
                    }
                ]
            },
            []
        ),
        // Scenario 5: FCL defined with discovery mode (not recommended, should use persistence)
        createInvalidTest(
            {
                name: 'FCL defined with discovery mode - WARN (recommend persistence)',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'flexibleColumnLayout', 'defaultTwoColumnLayoutType'],
                        value: 'TwoColumnsBeginExpanded'
                    },
                    {
                        path: ['sap.ui.generic.app', 'settings', 'statePreservationMode'],
                        value: 'discovery'
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'flexibleColumnLayout', 'defaultTwoColumnLayoutType'],
                        value: 'TwoColumnsBeginExpanded'
                    }
                ]),
                errors: [
                    {
                        message:
                            'Consider using "persistence". For applications using Flexible Column Layout (FCL), "persistence" mode is recommended.'
                    }
                ]
            },
            []
        ),
        // Scenario 6: No FCL with persistence mode (not recommended, should use discovery)
        createInvalidTest(
            {
                name: 'No FCL with persistence mode - WARN (recommend discovery)',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    {
                        path: ['sap.ui.generic.app', 'settings', 'statePreservationMode'],
                        value: 'persistence'
                    }
                ]),
                output: getManifestAsCode(V2_MANIFEST, []),
                errors: [
                    {
                        message:
                            'Consider using "discovery". For applications not using Flexible Column Layout, "discovery" mode is recommended.'
                    }
                ]
            },
            []
        )
    ]
});
