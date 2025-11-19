import { expect } from '@sap-ux-private/playwright';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V4 } from '../../project';
import { AdaptationEditorShell, AdpDialog, ListReport, TableSettings, verifyChanges } from '../test-utils';
import { satisfies } from 'semver';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V4 });

test.describe(`@quick-actions @fe-v4 @object-page`, () => {
    test(
        '1. Add Custom Table Column.',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const lr = new ListReport(previewFrame, 'fev4');
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            // wait until the quick actions label is rendered in the preview
            await editor.quickActions.waitForObjectPageQuickActionLoaded();
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
                            index: 3,
                            fragmentPath: 'fragments/table-column.fragment.xml'
                        }
                    }
                ],
                fragments: {
                    'table-column.fragment.xml': new RegExp(
                        `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:table="sap.ui.mdc.table">\\s*` +
                            `<!-- viewName: sap.fe.templates.ObjectPage.ObjectPage -->\\s*` +
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

            await editor.reloadCompleted();

            await expect(
                previewFrame.getByRole('columnheader', { name: 'New column' }).locator('bdi'),
                `Check Column Name is \`New Column\``
            ).toBeVisible();
            if (satisfies(ui5Version, '<1.120.0')) {
                await expect(previewFrame.getByRole('cell', { name: 'Sample data' }).first()).toBeVisible();
            } else {
                await expect(
                    previewFrame.getByRole('gridcell', { name: 'Sample data' }).first(),
                    `Check Column Data is \`Sample data\``
                ).toBeVisible();
            }
        }
    );
    test(
        '2. Enable Variant Management in Tables.',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, projectCopy, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame, 'fev4');
            await editor.toolbar.navigationModeButton.click();

            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.waitForObjectPageQuickActionLoaded();
            await editor.quickActions.enableOPVariantManagementInTable.click();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            page: 'RootEntityObjectPage',
                            entityPropertyChange: {
                                propertyPath: 'variantManagement',
                                operation: 'UPSERT',
                                propertyValue: 'Control'
                            }
                        }
                    }
                ]
            });
            await editor.quickActions.checkQADisabled(
                'Enable Variant Management in Tables',
                `This option has been disabled because variant management is already enabled for tables and charts`
            );
        }
    );
    test(
        '3. Enable Empty row mode.',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, projectCopy, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame, 'fev4');
            await editor.toolbar.navigationModeButton.click();

            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.waitForObjectPageQuickActionLoaded();
            await editor.quickActions.enableEmptyRowMode.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            page: 'RootEntityObjectPage',
                            entityPropertyChange: {
                                propertyPath:
                                    'controlConfiguration/toFirstAssociatedEntity/@com.sap.vocabularies.UI.v1.LineItem#tableSection/tableSettings/creationMode/name',
                                operation: 'UPSERT',
                                propertyValue: 'InlineCreationRows'
                            }
                        }
                    }
                ]
            });

            await editor.quickActions.checkQADisabled(
                'Enable Empty Row Mode for Tables',
                `This option has been disabled because empty row mode is already enabled for this table`
            );
        }
    );
    test(
        '4. Change table actions',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame, 'fev4');
            const tableSettings = new TableSettings(previewFrame, 'Toolbar Configuration', 'fev4');

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.waitForObjectPageQuickActionLoaded();
            await editor.quickActions.changeTableActions.click();
            await tableSettings.expectItemsToBeVisible(['Basic Search', 'Approve', 'Callback', 'Delete']);

            await tableSettings.moveActionUp(1);

            await tableSettings.expectItemsToBeVisible(['Approve', 'Basic Search', 'Cancel', 'Delete']);
            await tableSettings.dialog.getByRole('button').filter({ hasText: 'OK' }).click();

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await editor.changesPanel.expectSavedChangesStack(page, 'Move Action Change', 1);
        }
    );

    test(
        '5. Add SubObject Page Quick Action',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.135.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame, 'fev4');
            const dialog = new AdpDialog(previewFrame, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.waitForObjectPageQuickActionLoaded();
            await editor.quickActions.addSubPage.click();
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_addNewPage',
                        content: {
                            sourcePage: {
                                id: 'RootEntityObjectPage',
                                navigationSource: 'toFirstAssociatedEntity'
                            },
                            targetPage: {
                                type: 'Component',
                                id: 'FirstAssociatedEntityObjectPage',
                                name: 'sap.fe.templates.ObjectPage',
                                routePattern:
                                    'RootEntity({key})/toFirstAssociatedEntity({FirstAssociatedEntityKey}):?query:',
                                settings: {
                                    contextPath: '/FirstAssociatedEntity',
                                    editableHeaderContent: false,
                                    entitySet: 'FirstAssociatedEntity'
                                }
                            }
                        }
                    }
                ]
            });

            await editor.quickActions.checkQADisabled(
                'Add Subpage',
                `This option has been disabled because there are no subpages to add`
            );
        }
    );
    test(
        '6. Add Custom Table Action to Object page',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const lr = new ListReport(previewFrame, 'fev4');
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            // wait until the quick actions label is rendered in the preview
            await editor.quickActions.waitForObjectPageQuickActionLoaded();
            await editor.quickActions.addCustomTableAction.click();

            await dialog.fillField('Fragment Name', 'op-table-action');
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
                            index: 0,
                            fragmentPath: 'fragments/op-table-action.fragment.xml'
                        }
                    }
                ],
                fragments: {
                    'op-table-action.fragment.xml': new RegExp(
                        `<core:FragmentDefinition  xmlns:core='sap.ui.core' xmlns='sap.m'>\\s*` +
                            `<!-- viewName: sap.fe.templates.ObjectPage.ObjectPage -->\\s*` +
                            `<!-- controlType: sap.ui.mdc.Table -->\\s*` +
                            `<!-- targetAggregation: actions -->\\s*` +
                            `<actiontoolbar:ActionToolbarAction xmlns:actiontoolbar="sap.ui.mdc.actiontoolbar" id="toolbarAction-[a-z0-9]+" >\\s*` +
                            `<Button xmlns:m="sap.m" id="btn-[a-z0-9]+" visible="true" text="New Action" />\\s*` +
                            `</actiontoolbar:ActionToolbarAction>\\s*` +
                            `</core:FragmentDefinition>`
                    )
                }
            });

            await editor.reloadCompleted();
            await lr.checkControlVisible('New Action');
        }
    );

    test(
        '7: Add Custom Page Action to OP page',
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

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            // wait until the quick actions label is rendered in the preview
            await editor.quickActions.waitForObjectPageQuickActionLoaded();
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
});
