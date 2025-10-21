import { expect } from '@sap-ux-private/playwright';
import { lt, satisfies } from 'semver';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, AdpDialog, ListReport, TableSettings, verifyChanges } from './test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@quick-actions @fe-v2 @list-report`, () => {
    test('1. Enable/Disable clear filter bar button', {}, async ({ page, previewFrame, ui5Version, projectCopy }) => {
        const lr = new ListReport(previewFrame);
        const editor = new AdaptationEditorShell(page, ui5Version);

        await editor.reloadCompleted();
        await expect(lr.clearButton, `Check \`Clear\` Button in the List Report filter bar is hidden`).toBeHidden();

        await editor.quickActions.enableClearButton.click();

        await expect(lr.clearButton, `Check \`Clear\` Button in the List Report filter bar is visible`).toBeVisible();

        await editor.toolbar.saveButton.click();

        await editor.toolbar.isDisabled();
        await verifyChanges(projectCopy, {
            changes: [
                {
                    fileType: 'change',
                    changeType: 'propertyChange',
                    content: { property: 'showClearOnFB', newValue: true }
                }
            ]
        });

        await editor.quickActions.disableClearButton.click();

        await expect(lr.clearButton, `Check \`Clear\` Button in the List Report filter bar is hidden`).toBeHidden();
        await editor.toolbar.saveButton.click();

        await editor.toolbar.isDisabled();
        await verifyChanges(projectCopy, {
            changes: [
                {
                    fileType: 'change',
                    changeType: 'propertyChange',
                    content: { property: 'showClearOnFB', newValue: false }
                }
            ]
        });
    });

    test(
        '2. Add controller to page',
        {
            annotation: {
                type: 'skipUI5Version',
                // TODO: 1.84 and 1.96 there is an error when saving changes
                description: '~1.134.0 || ~1.135.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const lr = new ListReport(previewFrame);
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.quickActions.addControllerToPage.click();

            await dialog.fillField('Controller Name', 'TestController');
            await dialog.clickCreateButton();

            if (lt(ui5Version, '1.136.0')) {
                await expect(page.getByText('Changes detected!')).toBeVisible();
            } else {
                await editor.toolbar.saveButton.click();
            }

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'codeExt',
                        content: { codeRef: 'coding/TestController.js' }
                    }
                ],
                coding: {
                    ['TestController.js']: /ControllerExtension\.extend\("adp\.fiori\.elements\.v2\.TestController"/
                }
            });

            await editor.changesPanel.reloadButton.click();

            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted();

            await editor.quickActions.showPageController.click();

            await expect(
                previewFrame.getByText('adp.fiori.elements.v2/changes/coding/TestController.js'),
                `Check filename \`adp.fiori.elements.v2/changes/coding/TestController.js\` is visible`
            ).toBeVisible();
            await dialog.openInVSCodeVisible();
        }
    );

    test(
        '3. Change table columns',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const tableSettings = new TableSettings(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.changeTableColumns.click();

            await tableSettings.expectItemsToBeVisible(['String Property', 'Boolean Property', 'Currency']);
        }
    );

    test(
        '4. Add Custom Table Action',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.addCustomTableAction.click();

            await dialog.fillField('Fragment Name', 'table-action');
            await dialog.clickCreateButton();

            await editor.toolbar.saveAndReloadButton.click();

            await editor.toolbar.isDisabled();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: 'content',
                            fragmentPath: 'fragments/table-action.fragment.xml'
                        }
                    }
                ],
                fragments: {
                    'table-action.fragment.xml': `<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Button text="New Button"  id="btn-[a-z0-9]+"></Button>
</core:FragmentDefinition>
`
                }
            });
        }
    );

    test(
        '5. Add Custom Table Column',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);
            if (await editor.quickActions.addCustomTableColumn.isDisabled()) {
                await editor.toolbar.navigationModeButton.click();
                await lr.clickOnGoButton();
                await editor.toolbar.uiAdaptationModeButton.click();
            }

            await editor.quickActions.addCustomTableColumn.click();

            await dialog.fillField('Column Fragment Name', 'table-column');
            await dialog.fillField('Cell Fragment Name', 'table-cell');
            await dialog.clickCreateButton();

            await editor.toolbar.saveAndReloadButton.click();

            await editor.toolbar.isDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: 'columns',
                            fragmentPath: 'fragments/table-column.fragment.xml'
                        }
                    },
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            boundAggregation: 'items',
                            targetAggregation: 'cells',
                            fragmentPath: 'fragments/table-cell.fragment.xml'
                        }
                    }
                ],
                fragments: {
                    'table-cell.fragment.xml': `<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Text id="cell-text-[a-z0-9]+" text="Sample data" />
</core:FragmentDefinition>`,
                    'table-column.fragment.xml': `<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
     <Column id="column-[a-z0-9]+"
        width="12em"
        hAlign="Left"
        vAlign="Middle">
        <Text id="column-title-[a-z0-9]+" text="New column" />

        <customData>
            <core:CustomData key="p13nData" id="custom-data-[a-z0-9]+"
                value='\\\\{"columnKey": "column-[a-z0-9]+", "columnIndex": "3"}' />
        </customData>
    </Column>
</core:FragmentDefinition>`
                }
            });
            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnGoButton();
            await expect(
                previewFrame.getByRole('columnheader', { name: 'New column' }).locator('div'),
                `Check Column Name is \`New Column\``
            ).toBeVisible();
            if (satisfies(ui5Version, '<1.120.0')) {
                await expect(previewFrame.getByRole('cell', { name: 'Sample data' })).toBeVisible();
            } else {
                await expect(
                    previewFrame.getByRole('gridcell', { name: 'Sample data' }),
                    `Check Column Data is \`Sample data\``
                ).toBeVisible();
            }
        }
    );
    test(
        '6. Enable/Disable Semantic Date Range in Filter Bar',
        {
            annotation: {
                type: 'skipUI5Version',
                // TODO: it is supposed to work in 1.96 as well, but by default semantic date is disabled unlike other versions
                // and quick action does not work correctly
                description: '<1.108.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            async function clickOnValueHelp(): Promise<void> {
                await test.step(`Click on value help button of \`Date Property\` filter`, async () => {
                    if (satisfies(ui5Version, '~1.96.0')) {
                        // Try getByTitle first, fallback to aria-label if not found
                        const btn = previewFrame.getByTitle('Open Picker');
                        if (await btn.count()) {
                            await btn.click();
                        } else {
                            await previewFrame.locator('[aria-label="Open Picker"]').click();
                        }
                    } else {
                        // click on second filter value help
                        await previewFrame
                            .locator(
                                '[id="fiori\\.elements\\.v2\\.0\\:\\:sap\\.suite\\.ui\\.generic\\.template\\.ListReport\\.view\\.ListReport\\:\\:RootEntity--listReportFilter-filterItemControl_BASIC-DateProperty-input-vhi"]'
                            )
                            .click();
                    }
                });
            }
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await clickOnValueHelp();

            await expect(
                previewFrame.getByText('Yesterday'),
                `Check semantic date \`Yesterday\` visible in filter`
            ).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.disableSemanticDateRange.click();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                        content: {
                            entityPropertyChange: {
                                propertyPath: 'component/settings/filterSettings/dateSettings',
                                propertyValue: {
                                    useDateRange: false
                                }
                            }
                        }
                    }
                ]
            });

            await expect(lr.goButton).toBeVisible();
            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();

            await test.step(`Click on value help button of \`Date Property\` filter`, async () => {
                const btn = previewFrame.getByTitle('Open Picker');
                if (await btn.count()) {
                    await btn.click();
                } else {
                    await previewFrame.locator('[aria-label="Open Picker"]').click();
                }
            });

            await expect(previewFrame.getByRole('button', { name: new Date().getFullYear().toString() })).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.enableSemanticDateRange.click();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                        content: {
                            entityPropertyChange: {
                                propertyPath: 'component/settings/filterSettings/dateSettings',
                                propertyValue: {
                                    useDateRange: true
                                }
                            }
                        }
                    }
                ]
            });
        }
    );

    test(
        '7. Enable Variant Management in Tables and Charts',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, projectCopy, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.enableVariantManagementInTablesAndCharts.click();

            await editor.toolbar.saveAndReloadButton.click();
            await editor.toolbar.isDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                        content: {
                            parentPage: {
                                component: 'sap.suite.ui.generic.template.ListReport'
                            },
                            entityPropertyChange: {
                                propertyPath: 'component/settings',
                                propertyValue: {
                                    smartVariantManagement: false
                                }
                            }
                        }
                    }
                ]
            });
        }
    );

    test(
        '8. Change table actions',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.120.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const tableSettings = new TableSettings(previewFrame, 'Rearrange Toolbar Content');
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.changeTableActions.click();

            await tableSettings.expectItemsToBeVisible([
                'Button - Create',
                'Button - Delete',
                'Button - Add Card to Insights'
            ]);

            await tableSettings.moveActionUp(1);
            await tableSettings.expectItemsToBeVisible([
                'Button - Delete',
                'Button - Create',
                'Button - Add Card to Insights'
            ]);

            await tableSettings.closeOrConfirmDialog();

            await editor.toolbar.saveButton.click();
            await editor.toolbar.isDisabled();

            await editor.changesPanel.expectSavedChangesStack(page, 'Toolbar Content Move Change', 1);
        }
    );
    test(
        '9. Add New Annotation File',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.108.27'
            }
        },
        async ({ page, projectCopy, ui5Version, previewFrame }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.addLocalAnnotationFile.click();

            await editor.toolbar.saveAndReloadButton.click();
            await editor.toolbar.isDisabled();
            await verifyChanges(projectCopy, {
                annotations: {
                    'file0': `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Common.xml">
        <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
    </edmx:Reference>
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">
        <edmx:Include Namespace="com.sap.vocabularies.UI.v1" Alias="UI"/>
    </edmx:Reference>
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Communication.xml">
        <edmx:Include Namespace="com.sap.vocabularies.Communication.v1" Alias="Communication"/>
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata/sap/SERVICE/\\$metadata">
        <edmx:Include Namespace="SERVICE"/>
    </edmx:Reference>
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="local_[0-9]+">
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`
                },
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_app_addAnnotationsToOData',
                        content: {
                            dataSourceId: 'mainService',
                            annotations: [/customer\.annotation\.annotation_\d+/]
                        }
                    }
                ]
            });

            await editor.reloadCompleted();
            await editor.quickActions.showLocalAnnotationFile.click();
            await expect(
                previewFrame.getByText(/adp\.fiori\.elements\.v2\/changes\/annotations\/annotation_\d+\.xml/),
                `Check filename \`adp.fiori.elements.v2/changes/annotations/annotation_<UNIQUE_ID>.xml\` is visible in the dialog`
            ).toBeVisible();
            await expect(
                previewFrame.getByRole('button', { name: 'Show File in VSCode' }),
                `Check button \`Show File in VSCode\` is visible in the dialog`
            ).toBeVisible();
        }
    );
});
