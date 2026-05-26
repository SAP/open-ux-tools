import { RuleTester } from 'eslint';
import enablePasteRule from '../../src/rules/sap-enable-paste';
import { meta, languages } from '../../src/index';
import {
    getAnnotationsAsXmlCode,
    getManifestAsCode,
    setup,
    V2_FLEX_CHANGE_CONTENT,
    V2_FLEX_CHANGE_FILE_PATH,
    V4_ANNOTATIONS,
    V4_ANNOTATIONS_PATH,
    V4_FACETS_ANNOTATIONS,
    V4_MANIFEST,
    V4_MANIFEST_PATH
} from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const FACETSV4 = {
    filename: V4_ANNOTATIONS_PATH,
    code: getAnnotationsAsXmlCode(V4_ANNOTATIONS, V4_FACETS_ANNOTATIONS)
};

const v2FlexChangePasteEnabledOP = {
    ...V2_FLEX_CHANGE_CONTENT,
    content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'showPasteButton' },
    selector: {
        ...V2_FLEX_CHANGE_CONTENT.content,
        id: 'v2xmlstart::sap.suite.ui.generic.template.ObjectPage.view.Details::Z_SEPMRA_SO_SALESORDERANALYSIS--Products::Table'
    }
};

const v2FlexChangePasteDisabledOP = {
    ...v2FlexChangePasteEnabledOP,
    content: { ...v2FlexChangePasteEnabledOP.content, newValue: false }
};

const TEST_NAME = 'sap-enable-paste';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

ruleTester.run(TEST_NAME, enablePasteRule, {
    valid: [
        createValidTest(
            {
                name: 'V4 - enablePaste missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - object page table - enablePaste is true on an Object Page',
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
                            'controlConfiguration',
                            'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'enablePaste'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),

        createValidTest(
            {
                name: 'V4 - object page table - enablePaste is false on a List Report Page',
                filename: V4_MANIFEST_PATH,
                code: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsList',
                            'options',
                            'settings',
                            'controlConfiguration',
                            '@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'enablePaste'
                        ],
                        value: false
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V2 - showPasteButton missing',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(V2_FLEX_CHANGE_CONTENT, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - object page table - showPasteButton is true on an Object Page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangePasteEnabledOP, undefined, 2)
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4 - enablePaste is false on an Object Page',
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
                            'controlConfiguration',
                            'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings',
                            'enablePaste'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        message: 'Paste functionality in the Products table must be enabled',
                        line: 145,
                        column: 21
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
                    {
                        path: [
                            'sap.ui5',
                            'routing',
                            'targets',
                            'IncidentsObjectPage',
                            'options',
                            'settings',
                            'controlConfiguration',
                            'incidentFlow/@com.sap.vocabularies.UI.v1.LineItem',
                            'tableSettings'
                        ],
                        value: {}
                    }
                ])
            },
            [FACETSV4]
        ),

        createInvalidTest(
            {
                name: 'V2 - showPasteButton is false on an Object Page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangePasteDisabledOP, undefined, 2),
                errors: [
                    {
                        message: 'Paste functionality in the Products table must be enabled',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangePasteEnabledOP, undefined, 2) // fix: { "newValue": true }
            },
            []
        )
    ]
});
