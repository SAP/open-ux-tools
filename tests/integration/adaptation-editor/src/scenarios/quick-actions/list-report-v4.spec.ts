import { expect } from '@sap-ux-private/playwright';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V4 } from '../../project';
import { AdaptationEditorShell, AdpDialog, ListReport, TableSettings, verifyChanges } from '../test-utils';
import { satisfies } from 'semver';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V4 });
test.describe(`@quick-actions @fe-v4 @list-report`, () => {
    test(
        '1. Enable/Disable clear filter bar button',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const lr = new ListReport(previewFrame, 'fev4');
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.reloadCompleted();
            await expect(lr.clearButton, `Check \`Clear\` button in the List Report filter bar is hidden`).toBeHidden();

            await editor.quickActions.enableClearButton.click();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.reloadCompleted();

            await expect(
                lr.clearButton,
                `Check \`Clear\` button in the List Report filter bar is visible`
            ).toBeVisible();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            page: 'RootEntityList',
                            entityPropertyChange: {
                                operation: 'UPSERT',
                                propertyPath:
                                    'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/showClearButton',
                                propertyValue: true
                            }
                        }
                    }
                ]
            });
        }
    );

    test(
        '2: Add Custom Table Column LR',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const lr = new ListReport(previewFrame, 'fev4');
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.quickActions.addCustomTableColumn.click();
            await dialog.fillField('Fragment Name', 'table-column');
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: 'columns',
                            fragmentPath: 'fragments/table-column.fragment.xml'
                        }
                    }
                ],
                fragments: {
                    'table-column.fragment.xml': new RegExp(
                        `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:table="sap.ui.mdc.table">\\s*` +
                            `<!-- viewName: sap.fe.templates.ListReport.ListReport -->\\s*` +
                            `<!-- controlType: sap.ui.mdc.Table -->\\s*` +
                            `<!-- targetAggregation: columns -->\\s*` +
                            `<table:Column\\s*` +
                            `id="column-[a-z0-9]+"\\s*` +
                            `width="10%"\\s*` +
                            `header="New Column">\\s*` +
                            `<Text id="text-[a-z0-9]+" text="Sample data"/>\\s*` +
                            `</table:Column>\\s*` +
                            `</core:FragmentDefinition>`
                    )
                }
            });

            await expect(lr.goButton).toBeVisible();
            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await expect(
                previewFrame.getByRole('columnheader', { name: 'New column' }).locator('bdi'),
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
        '3. Add New Annotation File',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, projectCopy, ui5Version, previewFrame }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.quickActions.addLocalAnnotationFile.click();
            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.quickActions.showLocalAnnotationFile.waitFor({ state: 'visible' }); // wait for changes to be processed
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
                previewFrame.getByText(/adp\.fiori\.elements\.v4\/changes\/annotations\/annotation_\d+\.xml/),
                `Check filename \`adp.fiori.elements.v2/changes/annotations/annotation_<UNIQUE_ID>.xml\` is visible in the dialog`
            ).toBeVisible();
            await expect(
                previewFrame.getByRole('button', { name: 'Show File in VSCode' }),
                `Check button \`Show File in VSCode\` is visible in the dialog`
            ).toBeVisible();
        }
    );

    test(
        '4. Enable Variant Management in Tables and Charts',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, projectCopy, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.enableVariantManagementInTablesAndCharts.click();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            page: 'RootEntityList',
                            entityPropertyChange: {
                                propertyPath: 'variantManagement',
                                operation: 'UPSERT',
                                propertyValue: 'Control'
                            }
                        }
                    }
                ]
            });
        }
    );

    test(
        '5. Change table actions',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const tableSettings = new TableSettings(previewFrame, 'Toolbar Configuration', 'fev4');
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.quickActions.changeTableActions.click();
            await tableSettings.expectItemsToBeVisible(['Approve', 'Callback', 'Delete', 'Add Card to Insights']);
            await tableSettings.moveActionUp(1);

            await tableSettings.expectItemsToBeVisible(['Callback', 'Approve', 'Delete', 'Add Card to Insights']);
            await tableSettings.dialog.getByRole('button').filter({ hasText: 'OK' }).click();

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.changesPanel.expectSavedChangesStack(page, 'Move Action Change', 1);
        }
    );

    test(
        '6: Add Custom Page Action to LR page',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const lr = new ListReport(previewFrame, 'fev4');
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.quickActions.addCustomPageAction.click();
            await dialog.fillField('Action Id', 'testActionId');
            await dialog.fillField('Button Text', 'Test Page Action');
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            page: 'RootEntityList',
                            entityPropertyChange: {
                                operation: 'UPSERT',
                                propertyPath: 'content/header/actions/testActionId',
                                propertyValue: {
                                    enabled: true,
                                    press: '',
                                    text: 'Test Page Action',
                                    visible: true
                                }
                            }
                        }
                    }
                ]
            });
            await lr.checkControlVisible('Test Page Action');
        }
    );
    test(
        '7: Add Custom Table Action to LR page',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const lr = new ListReport(previewFrame, 'fev4');
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.quickActions.addCustomTableAction.click();
            await dialog.fillField('Fragment Name', 'test-table-action');
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: 'actions',
                            fragmentPath: 'fragments/test-table-action.fragment.xml',
                            index: 0
                        },
                        selector: {
                            id: 'fiori.elements.v4.0::RootEntityList--fe::table::RootEntity::LineItem'
                        }
                    }
                ],
                fragments: {
                    'test-table-action.fragment.xml': new RegExp(
                        `<core:FragmentDefinition  xmlns:core='sap.ui.core' xmlns='sap.m'>\\s*` +
                            `<!-- viewName: sap.fe.templates.ListReport.ListReport -->\\s*` +
                            `<!-- controlType: sap.ui.mdc.Table -->\\s*` +
                            `<!-- targetAggregation: actions -->\\s*` +
                            `<actiontoolbar:ActionToolbarAction xmlns:actiontoolbar="sap.ui.mdc.actiontoolbar" id="toolbarAction-[a-z0-9]+" >\\s*` +
                            `<Button xmlns:m="sap.m" id="btn-[a-z0-9]+" visible="true" text="New Action" />\\s*` +
                            `</actiontoolbar:ActionToolbarAction>\\s*` +
                            `</core:FragmentDefinition>`
                    )
                }
            });
            await lr.checkControlVisible('New Action');
        }
    );

    test(
        '8. Enable/Disable Semantic Date Range in Filter Bar',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const lr = new ListReport(previewFrame, 'fev4');
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnDatePropertyValueHelper();
            await lr.checkSemanticDateOptionsExist('DateProperty', ['Yesterday']);
            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.disableSemanticDateRange.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            entityPropertyChange: {
                                propertyPath:
                                    'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/useSemanticDateRange',
                                propertyValue: false,
                                operation: 'UPSERT'
                            }
                        }
                    }
                ]
            });

            await expect(lr.goButton).toBeVisible();
            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnDatePropertyValueHelper(true);
            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.enableSemanticDateRange.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            entityPropertyChange: {
                                propertyPath:
                                    'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/useSemanticDateRange',
                                propertyValue: true,
                                operation: 'UPSERT'
                            }
                        }
                    }
                ]
            });
        }
    );

    test(
        '9. Enable Table Filtering for Page Variants',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const tableSettings = new TableSettings(previewFrame, 'View Settings', 'fev4');
            await editor.quickActions.changeTableColumns.click();
            await tableSettings.checkTabsExist(['Sort', 'Group', 'Columns']);
            await tableSettings.closeOrConfirmDialog('Cancel');
            await editor.quickActions.enableTableFilterForPageVariants.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            page: 'RootEntityList',
                            entityPropertyChange: {
                                propertyPath:
                                    'controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/tableSettings/personalization',
                                propertyValue: {
                                    sort: true,
                                    column: true,
                                    filter: true,
                                    group: true,
                                    aggregate: true
                                },
                                operation: 'UPSERT'
                            }
                        }
                    }
                ]
            });
            await editor.quickActions.checkQADisabled('Enable Table Filtering for Page Variants');
            await editor.quickActions.changeTableColumns.click();
            await tableSettings.checkTabsExist(['Filter']);
            await tableSettings.closeOrConfirmDialog('Cancel');
        }
    );
});
