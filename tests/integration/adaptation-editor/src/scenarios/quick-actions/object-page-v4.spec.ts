import { expect } from '@sap-ux-private/playwright';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V4 } from '../../project';
import { AdaptationEditorShell, AdpDialog, ListReport, readChanges, TableSettings } from './test-utils';
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
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.reloadCompleted();
            // wait until the quick actions label is rendered in the preview
            await expect(page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true })).toBeVisible();
            await editor.quickActions.addCustomTableColumn.click();

            await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('table-column');
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        fragments: expect.objectContaining({
                            'table-column.fragment.xml': expect.stringMatching(
                                new RegExp(`<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:table="sap.ui.mdc.table">
    <table:Column
        id="column-[a-z0-9]+"
        width="10%"
        header="New Column">
        <Text id="text-[a-z0-9]+" text="Sample data"/>
    </table:Column>
</core:FragmentDefinition>`)
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    targetAggregation: 'columns',
                                    index: 3,
                                    fragmentPath: 'fragments/table-column.fragment.xml'
                                })
                            })
                        ])
                    })
                );

            await editor.reloadCompleted();

            await expect(previewFrame.getByRole('columnheader', { name: 'New column' }).locator('bdi')).toBeVisible();
            if (satisfies(ui5Version, '<1.120.0')) {
                await expect(previewFrame.getByRole('cell', { name: 'Sample data' }).first()).toBeVisible();
            } else {
                await expect(previewFrame.getByRole('gridcell', { name: 'Sample data' }).first()).toBeVisible();
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
            const lr = new ListReport(previewFrame);
            await editor.toolbar.navigationModeButton.click();

            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            await expect(page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true })).toBeVisible();
            await editor.quickActions.enableOPVariantManagementInTable.click();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'appdescr_fe_changePageConfiguration',
                                content: expect.objectContaining({
                                    page: 'RootEntityObjectPage',
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'variantManagement',
                                        operation: 'UPSERT',
                                        propertyValue: 'Control'
                                    })
                                })
                            })
                        ])
                    })
                );
            // TODO: Check QA state disabled and check the message to be "'This option has been disabled because variant management is already enabled for tables and charts'"
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
            const lr = new ListReport(previewFrame);
            await editor.toolbar.navigationModeButton.click();

            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            await expect(page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true })).toBeVisible();
            await editor.quickActions.enableEmptyRowMode.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'appdescr_fe_changePageConfiguration',
                                content: expect.objectContaining({
                                    page: 'RootEntityObjectPage',
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath:
                                            'controlConfiguration/toFirstAssociatedEntity/@com.sap.vocabularies.UI.v1.LineItem#tableSection/tableSettings/creationMode/name',
                                        operation: 'UPSERT',
                                        propertyValue: 'InlineCreationRows'
                                    })
                                })
                            })
                        ])
                    })
                );

            // TODO check the button disabled state and the message
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
            const lr = new ListReport(previewFrame);
            const tableSettings = new TableSettings(previewFrame, 'fev4');

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            await expect(page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true })).toBeVisible();
            // await page.waitForTimeout(3000); // wait for the quick actions to be ready
            await editor.quickActions.changeTableActions.click();

            let actionTexts = await tableSettings.getActionSettingsTexts();

            expect(actionTexts).toEqual(['Basic Search', 'Approve', 'Cancel', 'Delete']);

            await tableSettings.moveActionUp(1);

            actionTexts = await tableSettings.getActionSettingsTexts();
            expect(actionTexts).toEqual(['Approve', 'Basic Search', 'Cancel', 'Delete']);

            await tableSettings.actionSettingsDialog.getByRole('button').filter({ hasText: 'OK' }).click();

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect(page.getByTestId('saved-changes-stack')).toBeVisible();
            const changes = await page.getByTestId('saved-changes-stack').getByText('Move Action Change').all();
            expect(changes.length).toBe(1);
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
            const lr = new ListReport(previewFrame);
            const dialog = new AdpDialog(previewFrame, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            await expect(page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true })).toBeVisible();
            // await page.waitForTimeout(3000); // wait for the quick actions to be ready
            await editor.quickActions.addSubPage.click();
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'appdescr_fe_addNewPage',
                                content: expect.objectContaining({
                                    sourcePage: expect.objectContaining({
                                        id: 'RootEntityObjectPage',
                                        navigationSource: 'toFirstAssociatedEntity'
                                    }),
                                    targetPage: {
                                        type: 'Component',
                                        id: 'FirstAssociatedEntityObjectPage',
                                        name: 'sap.fe.templates.ObjectPage',
                                        routePattern:
                                            'RootEntity({key})/toFirstAssociatedEntity({FirstAssociatedEntityKey}):?query:',
                                        settings: expect.objectContaining({
                                            contextPath: '/FirstAssociatedEntity',
                                            editableHeaderContent: false,
                                            entitySet: 'FirstAssociatedEntity'
                                        })
                                    }
                                })
                            })
                        ])
                    })
                );
        }
    );
});
