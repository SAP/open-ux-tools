import { RuleTester } from 'eslint';
import enableExportRule from '../../src/rules/sap-enable-export';
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

const TEST_NAME = 'sap-enable-export';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

const v2FlexChangeExportEnabledOP = {
    ...V2_FLEX_CHANGE_CONTENT,
    content: { ...V2_FLEX_CHANGE_CONTENT.content, property: 'enableExport' },
    selector: {
        ...V2_FLEX_CHANGE_CONTENT.content,
        id: 'v2xmlstart::sap.suite.ui.generic.template.ObjectPage.view.Details::Z_SEPMRA_SO_SALESORDERANALYSIS::Table'
    }
};

const v2FlexChangeExportEnabledLR = {
    ...v2FlexChangeExportEnabledOP,
    selector: {
        ...v2FlexChangeExportEnabledOP.selector,
        id: 'v2xmlstart::sap.suite.ui.generic.template.AnalyticalListPage.view.ListReport::Z_SEPMRA_SO_SALESORDERANALYSIS::listReport'
    }
};

const v2FlexChangeExportDisabledOP = {
    ...v2FlexChangeExportEnabledOP,
    content: { ...v2FlexChangeExportEnabledOP.content, newValue: false }
};

const v2FlexChangeExportDisabledLR = {
    ...v2FlexChangeExportEnabledLR,
    content: { ...v2FlexChangeExportEnabledLR.content, newValue: false }
};

ruleTester.run(TEST_NAME, enableExportRule, {
    valid: [
        createValidTest(
            {
                name: 'V4 - enableExport missing',
                filename: V4_MANIFEST_PATH,
                code: JSON.stringify(V4_MANIFEST, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V4 - object page table - enableExport is true',
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
                            'enableExport'
                        ],
                        value: true
                    }
                ])
            },
            [FACETSV4]
        ),
        createValidTest(
            {
                name: 'V2 - enableExport missing',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(V2_FLEX_CHANGE_CONTENT, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - object page table - enableExport is true on object page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportEnabledOP, undefined, 2)
            },
            []
        ),
        createValidTest(
            {
                name: 'V2 - object page table - enableExport is true on list report page',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportEnabledLR, undefined, 2)
            },
            []
        )
    ],

    invalid: [
        createInvalidTest(
            {
                name: 'V4 - list report page - enableExport is false',
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
                            'enableExport'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        message: 'Export functionality in the table must be enabled',
                        line: 127,
                        column: 21
                    }
                ],
                output: getManifestAsCode(V4_MANIFEST, [
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
                            'tableSettings'
                        ],
                        value: {
                            type: 'ResponsiveTable',
                            selectionMode: 'Auto'
                            // enableExport property removed
                        }
                    }
                ])
            },
            [FACETSV4]
        ),
        createInvalidTest(
            {
                name: 'V4 - object page - enableExport is false',
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
                            'enableExport'
                        ],
                        value: false
                    }
                ]),
                errors: [
                    {
                        message: 'Export functionality in the Products table must be enabled',
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
                        value: {
                            // enableExport property removed
                        }
                    }
                ])
            },
            [FACETSV4]
        ),
        createInvalidTest(
            {
                name: 'V2 - list report page - enableExport is false',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportDisabledLR, undefined, 2),
                errors: [
                    {
                        message: 'Export functionality in the table must be enabled',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangeExportEnabledLR, undefined, 2)
            },
            []
        ),
        createInvalidTest(
            {
                name: 'V2 - object page - enableExport is false',
                filename: V2_FLEX_CHANGE_FILE_PATH,
                code: JSON.stringify(v2FlexChangeExportDisabledOP, undefined, 2),
                errors: [
                    {
                        message: 'Export functionality in the Products table must be enabled',
                        line: 10,
                        column: 5
                    }
                ],
                output: JSON.stringify(v2FlexChangeExportEnabledOP, undefined, 2)
            },
            []
        )
    ]
});
