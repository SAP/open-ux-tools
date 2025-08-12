import { readdir } from 'fs/promises';
import { join } from 'path';

import { expect } from '@sap-ux-private/playwright';
import { lt, satisfies } from 'semver';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, AdpDialog, ListReport, readChanges, TableSettings } from './test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@quick-actions @fe-v2 @list-report`, () => {
    test('Enable/Disable clear filter bar button', {}, async ({ page, previewFrame, ui5Version, projectCopy }) => {
        const lr = new ListReport(previewFrame);
        const editor = new AdaptationEditorShell(page, ui5Version);

        await editor.reloadCompleted();
        await expect(lr.clearButton).toBeHidden();

        await editor.quickActions.enableClearButton.click();

        await expect(lr.clearButton).toBeVisible();

        await editor.toolbar.saveButton.click();

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
                            changeType: 'propertyChange',
                            content: expect.objectContaining({ property: 'showClearOnFB', newValue: true })
                        })
                    ])
                })
            );
        await editor.quickActions.disableClearButton.click();

        await expect(lr.clearButton).toBeHidden();

        await editor.toolbar.saveButton.click();

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
                            changeType: 'propertyChange',
                            content: expect.objectContaining({ property: 'showClearOnFB', newValue: false })
                        })
                    ])
                })
            );
    });

    test(
        'Add controller to page',
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

            await previewFrame.getByRole('textbox', { name: 'Controller Name' }).fill('TestController');
            await dialog.createButton.click();

            if (lt(ui5Version, '1.136.0')) {
                await expect(page.getByText('Changes detected!')).toBeVisible();
            } else {
                await editor.toolbar.saveButton.click();
            }

            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        coding: expect.objectContaining({
                            ['TestController.js']: expect.stringMatching(
                                /ControllerExtension\.extend\("adp\.fiori\.elements\.v2\.TestController"/
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'codeExt',
                                content: expect.objectContaining({ codeRef: 'coding/TestController.js' })
                            })
                        ])
                    })
                );

            await expect
                .poll(
                    async () => {
                        const changesDirectory = join(projectCopy, 'webapp', 'changes', 'coding');
                        const codingChanges = await readdir(changesDirectory);
                        return codingChanges.length;
                    },
                    {
                        message: 'make sure controller file is created',
                        timeout: 4_000
                    }
                )
                .toEqual(1);

            await editor.changesPanel.reloadButton.click();

            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted();

            await editor.quickActions.showPageController.click();

            await expect(
                previewFrame.getByText('adp.fiori.elements.v2/changes/coding/TestController.js')
            ).toBeVisible();

            await expect(previewFrame.getByRole('button', { name: 'Open in VS Code' })).toBeVisible();
        }
    );

    test(
        'Change table columns',
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

            await expect(tableSettings.tableSettingsDialog.getByText('String Property')).toBeVisible();
            await expect(tableSettings.tableSettingsDialog.getByText('Boolean Property')).toBeVisible();
            await expect(tableSettings.tableSettingsDialog.getByText('Currency')).toBeVisible();
        }
    );

    test(
        'Add Custom Table Action',
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

            await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('table-action');
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
                            'table-action.fragment.xml': expect.stringMatching(
                                new RegExp(`<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Button text="New Button"  id="btn-[a-z0-9]+"></Button>
</core:FragmentDefinition>
`)
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    targetAggregation: 'content',
                                    fragmentPath: 'fragments/table-action.fragment.xml'
                                })
                            })
                        ])
                    })
                );
        }
    );

    test(
        'Add Custom Table Column',
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
                await lr.goButton.click();
                await editor.toolbar.uiAdaptationModeButton.click();
            }

            await editor.quickActions.addCustomTableColumn.click();

            await previewFrame.getByRole('textbox', { name: 'Column Fragment Name' }).fill('table-column');
            await previewFrame.getByRole('textbox', { name: 'Cell Fragment Name' }).fill('table-cell');
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
                            'table-cell.fragment.xml': expect.stringMatching(
                                new RegExp(`<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Text id="cell-text-[a-z0-9]+" text="Sample data" />
</core:FragmentDefinition>`)
                            ),
                            'table-column.fragment.xml': expect.stringMatching(
                                new RegExp(`<!-- Use stable and unique IDs!-->
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
</core:FragmentDefinition>`)
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    targetAggregation: 'columns',
                                    fragmentPath: 'fragments/table-column.fragment.xml'
                                })
                            }),
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    boundAggregation: 'items',
                                    targetAggregation: 'cells',
                                    fragmentPath: 'fragments/table-cell.fragment.xml'
                                })
                            })
                        ])
                    })
                );

            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await expect(previewFrame.getByRole('columnheader', { name: 'New column' }).locator('div')).toBeVisible();
            if (satisfies(ui5Version, '<1.120.0')) {
                await expect(previewFrame.getByRole('cell', { name: 'Sample data' })).toBeVisible();
            } else {
                await expect(previewFrame.getByRole('gridcell', { name: 'Sample data' })).toBeVisible();
            }
        }
    );

    test(
        'Enable/Disable Semantic Date Range in Filter Bar',
        {
            annotation: {
                type: 'skipUI5Version',
                // TODO: it is supposed to work in 1.96 as well, but by default semantic date is disabled unlike other versions
                // and quick action does not work correctly
                description: '<1.108.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            if (satisfies(ui5Version, '~1.96.0')) {
                await previewFrame.getByTitle('Open Picker').click();
            } else {
                // click on second filter value help
                await previewFrame
                    .locator(
                        '[id="fiori\\.elements\\.v2\\.0\\:\\:sap\\.suite\\.ui\\.generic\\.template\\.ListReport\\.view\\.ListReport\\:\\:RootEntity--listReportFilter-filterItemControl_BASIC-DateProperty-input-vhi"]'
                    )
                    .click();
            }
            await expect(previewFrame.getByText('Yesterday')).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.disableSemanticDateRange.click();

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
                                changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                content: expect.objectContaining({
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'component/settings/filterSettings/dateSettings',
                                        propertyValue: expect.objectContaining({
                                            useDateRange: false
                                        })
                                    })
                                })
                            })
                        ])
                    })
                );

            await expect(lr.goButton).toBeVisible();
            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();

            await previewFrame.getByLabel('Open Picker').click();
            await expect(previewFrame.getByRole('button', { name: new Date().getFullYear().toString() })).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.enableSemanticDateRange.click();

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
                                changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                content: expect.objectContaining({
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'component/settings/filterSettings/dateSettings',
                                        propertyValue: expect.objectContaining({
                                            useDateRange: true
                                        })
                                    })
                                })
                            })
                        ])
                    })
                );
        }
    );

    test(
        'Enable Variant Management in Tables and Charts',
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
                                changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                content: expect.objectContaining({
                                    parentPage: expect.objectContaining({
                                        component: 'sap.suite.ui.generic.template.ListReport'
                                    }),
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'component/settings',
                                        propertyValue: expect.objectContaining({
                                            smartVariantManagement: false
                                        })
                                    })
                                })
                            })
                        ])
                    })
                );
        }
    );

    test(
        'Change table actions',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.120.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const tableSettings = new TableSettings(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.changeTableActions.click();

            let actionTexts = await tableSettings.getActionSettingsTexts();
            expect(actionTexts).toEqual(['Button - Create', 'Button - Delete', 'Button - Add Card to Insights']);

            await tableSettings.moveActionUp(1);

            actionTexts = await tableSettings.getActionSettingsTexts();
            expect(actionTexts).toEqual(['Button - Delete', 'Button - Create', 'Button - Add Card to Insights']);

            await tableSettings.actionSettingsDialog.getByRole('button').filter({ hasText: 'OK' }).click();

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect(page.getByTestId('saved-changes-stack')).toBeVisible();
            const changes = await page
                .getByTestId('saved-changes-stack')
                .getByText('Toolbar Content Move Change')
                .all();
            expect(changes.length).toBe(1);
        }
    );
});
