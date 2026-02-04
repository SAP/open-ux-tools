import rule from '../../src/rules/sap-table-column-vertical-alignment';
import { RuleTester } from 'eslint';
import { meta, languages } from '../../src/index';
import { getManifestAsCode, setup, V2_MANIFEST, V2_MANIFEST_PATH } from '../test-helper';

const ruleTester = new RuleTester({
    plugins: { ['@sap-ux/eslint-plugin-fiori-tools']: { ...meta, languages } },
    language: '@sap-ux/eslint-plugin-fiori-tools/fiori'
});

const TEST_NAME = 'sap-table-column-vertical-alignment';
const { createValidTest, createInvalidTest } = setup(TEST_NAME);

/**
 * Updates manifest for testing tableColumnVerticalAlignment rule.
 *
 * @param tableColumnVerticalAlignment Tested property value.
 * @param page Page that has a Responsive type table.
 * @param ui5Version Minimum UI5 version.
 * @returns Manifest content as string
 */
const getManifest = (
    tableColumnVerticalAlignment: 'Top' | 'Middle' | 'Bottom' | undefined = undefined,
    page: 'ALP' | 'OP' | undefined = undefined,
    ui5Version: string = '1.75.0'
): string => {
    const manifestChanges = [
        {
            path: ['sap.ui5', 'dependencies', 'minUI5Version'],
            value: ui5Version
        }
    ];
    if (page) {
        manifestChanges.push({
            path:
                page === 'ALP'
                    ? [
                          'sap.ui.generic.app',
                          'pages',
                          'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                          'component',
                          'settings',
                          'tableSettings',
                          'type'
                      ]
                    : [
                          'sap.ui.generic.app',
                          'pages',
                          'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                          'pages',
                          'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                          'component',
                          'settings',
                          'sections',
                          'Products',
                          'tableSettings',
                          'type'
                      ],
            value: 'ResponsiveTable'
        });
    }
    if (tableColumnVerticalAlignment) {
        manifestChanges.push({
            path: ['sap.ui.generic.app', 'settings', 'tableColumnVerticalAlignment'],
            value: tableColumnVerticalAlignment
        });
    }
    return getManifestAsCode(V2_MANIFEST, manifestChanges);
};

ruleTester.run(TEST_NAME, rule, {
    valid: [
        createValidTest(
            {
                name: 'ui5 version lower than 1.75',
                filename: V2_MANIFEST_PATH,
                code: getManifest('Top', 'ALP', '1.60.5')
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Middle", Responsive table exists on AnalyticalListPage',
                filename: V2_MANIFEST_PATH,
                code: getManifest('Middle', 'ALP')
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Middle", Responsive table exists on ObjectPage',
                filename: V2_MANIFEST_PATH,
                code: getManifest('Middle', 'OP')
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Top", no Responsive tables exist',
                filename: V2_MANIFEST_PATH,
                code: getManifest('Top')
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is undefined, Responsive table exists on ObjectPage',
                filename: V2_MANIFEST_PATH,
                code: getManifest(undefined, 'OP')
            },
            []
        ),
        createValidTest(
            {
                name: 'tableColumnVerticalAlignment value is undefined, no Responsive tables exist',
                filename: V2_MANIFEST_PATH,
                code: getManifest()
            },
            []
        )
    ],
    invalid: [
        createInvalidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Top", Responsive table exists on AnalyticalListPage',
                filename: V2_MANIFEST_PATH,
                code: getManifest('Top', 'ALP'),
                output: getManifest(undefined, 'ALP'),
                errors: [
                    {
                        messageId: 'sap-table-column-vertical-alignment',
                        line: 126,
                        column: 7
                    }
                ]
            },
            []
        ),
        createInvalidTest(
            {
                name: 'tableColumnVerticalAlignment value is "Bottom", Responsive table exists on ObjectPage',
                filename: V2_MANIFEST_PATH,
                code: getManifest('Bottom', 'OP'),
                output: getManifest(undefined, 'OP'),
                errors: [
                    {
                        messageId: 'sap-table-column-vertical-alignment',
                        line: 126,
                        column: 7
                    }
                ]
            },
            []
        )
    ]
});
