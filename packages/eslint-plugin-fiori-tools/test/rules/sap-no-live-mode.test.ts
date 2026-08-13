import { RuleTester } from 'eslint';
import noLiveModeRule from '../../src/rules/sap-no-live-mode.js';
import { meta, languages } from '../../src/index.js';
import {
    getManifestAsCode,
    setup,
    V2_FLEX_CHANGE_CONTENT,
    V2_FLEX_CHANGE_FILE_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper.js';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-no-live-mode';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

const v2FlexChangeLiveModeEnabledLR = {
    ...V2_FLEX_CHANGE_CONTENT,
    content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'liveMode' },
    selector: {
        ...V2_FLEX_CHANGE_CONTENT.selector,
        id: 'v2xmlstart::sap.suite.ui.generic.template.AnalyticalListPage.view.AnalyticalListPage::Z_SEPMRA_SO_SALESORDERANALYSIS--analyticalListPageFilter'
    }
};

const v2FlexChangeLiveModeDisabledLR = {
    ...v2FlexChangeLiveModeEnabledLR,
    content: { ...v2FlexChangeLiveModeEnabledLR.content, property: 'liveMode', newValue: false }
};

const v2FlexChangeLiveModeEnabledOP = {
    ...v2FlexChangeLiveModeEnabledLR,
    selector: {
        ...v2FlexChangeLiveModeEnabledLR.selector,
        id: 'v2xmlstart::sap.suite.ui.generic.template.ObjectPage.view.Details::Z_SEPMRA_SO_SALESORDERANALYSIS--Products'
    }
};

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
                name: 'V4 - list report table - liveMode is false',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsList', 'options', 'settings', 'liveMode'],
                        value: false
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - object page table - liveMode is true, but property is not checked',
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
                        value: true
                    }
                ])
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - liveMode not defined',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(V2_FLEX_CHANGE_CONTENT, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - liveMode is not checked on object page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeLiveModeEnabledOP, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - liveMode is false on list report page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeLiveModeDisabledLR, undefined, 2)
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
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsList', 'options', 'settings'],
                        value: {
                            entitySet: 'Incidents',
                            liveMode: true
                        }
                    }
                ]),
                errors: [
                    {
                        message: 'Live mode must not be used because it has a negative impact on performance.',
                        line: 114,
                        column: 15
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: ['sap.ui5', 'routing', 'targets', 'IncidentsList', 'options', 'settings'],
                        value: {
                            // liveMode property removed
                            entitySet: 'Incidents'
                        }
                    }
                ])
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2 - liveMode is true on a list report page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeLiveModeEnabledLR, undefined, 2),
                errors: [
                    {
                        message: 'Live mode must not be used because it has a negative impact on performance.',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangeLiveModeDisabledLR, undefined, 2) // liveMode set to false
            },
            []
        )
    ]
});
