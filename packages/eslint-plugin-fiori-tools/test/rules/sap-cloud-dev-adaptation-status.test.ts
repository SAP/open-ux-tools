import { RuleTester } from 'eslint';
import cloudDevAdaptationStatusRule from '../../src/rules/sap-cloud-dev-adaptation-status.js';
import { meta, languages } from '../../src/index.js';
import {
    getManifestAsCode,
    setup,
    V4_MANIFEST,
    V4_MANIFEST_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH,
    CAP_APP_PATH,
    CAP_MANIFEST,
    CAP_MANIFEST_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-cloud-dev-adaptation-status';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);
const { createValidTest: createValidTestCAP, createInvalidTest: createInvalidTestCAP } = setup(
    `${TEST_NAME} - CAP`,
    CAP_APP_PATH
);

ruleTester.run(TEST_NAME, cloudDevAdaptationStatusRule, {
    valid: [
        createValidTest(
            {
                name: 'non-manifest JSON file should be ignored',
                filename: 'some-other-file.json',
                code: '{"sap.app":{"id":"test"}}'
            },
            []
        ),
        createValidTest(
            {
                name: 'non-JSON file should be ignored',
                filename: 'some-other-file.xml',
                code: '<>'
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - cloudDevAdaptationStatus "deprecated" - valid',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    { path: ['sap.fiori', 'cloudDevAdaptationStatus'], value: 'deprecated' }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - cloudDevAdaptationStatus "obsolete" - valid',
                filename: V2_MANIFEST_PATH,
                code: getManifestAsCode(V2_MANIFEST, [
                    { path: ['sap.fiori', 'cloudDevAdaptationStatus'], value: 'obsolete' }
                ])
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'V4 - cloudDevAdaptationStatus missing - should warn',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2),
                errors: [
                    {
                        message:
                            "The application hasn't set a release status for the developer adaptation in the cloud."
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2 - cloudDevAdaptationStatus missing - should warn',
                filename: V2_MANIFEST_PATH,
                code: JSON.stringify(V2_MANIFEST, undefined, 2),
                errors: [
                    {
                        message:
                            "The application hasn't set a release status for the developer adaptation in the cloud."
                    }
                ]
            },
            []
        )
    ]
});

ruleTester.run(`${TEST_NAME} - CAP`, cloudDevAdaptationStatusRule, {
    valid: [
        createValidTestCAP(
            {
                name: 'CAP - non-manifest file should be ignored',
                filename: 'some-other-file.json',
                code: '{"sap.app":{"id":"test"}}'
            },
            []
        ),
        createValidTestCAP(
            {
                name: 'CAP - cloudDevAdaptationStatus "released" - valid',
                filename: CAP_MANIFEST_PATH,
                code: getManifestAsCode(CAP_MANIFEST, [
                    { path: ['sap.fiori', 'cloudDevAdaptationStatus'], value: 'released' }
                ])
            },
            []
        )
    ],
    invalid: [
        createInvalidTestCAP(
            {
                name: 'CAP - cloudDevAdaptationStatus missing - should warn',
                filename: CAP_MANIFEST_PATH,
                code: JSON.stringify(CAP_MANIFEST, undefined, 2),
                errors: [
                    {
                        message:
                            "The application hasn't set a release status for the developer adaptation in the cloud."
                    }
                ]
            },
            []
        ),
        createInvalidTestCAP(
            {
                name: 'CAP - cloudDevAdaptationStatus has invalid value - should warn',
                filename: CAP_MANIFEST_PATH,
                code: getManifestAsCode(CAP_MANIFEST, [
                    { path: ['sap.fiori', 'cloudDevAdaptationStatus'], value: 'unknown-value' }
                ]),
                errors: [
                    {
                        message:
                            "The application hasn't set a release status for the developer adaptation in the cloud."
                    }
                ]
            },
            []
        )
    ]
});
