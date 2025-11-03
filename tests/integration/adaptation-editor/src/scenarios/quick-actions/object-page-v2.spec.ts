import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { AdaptationEditorShell, AdpDialog, ListReport, TableSettings, readChanges } from './test-utils';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { lt, satisfies } from 'semver';
import { join } from 'node:path';
import { readdir } from 'fs/promises';

test.use({
    projectConfig: {
        ...ADP_FIORI_ELEMENTS_V2,
        baseApp: {
            ...ADP_FIORI_ELEMENTS_V2.baseApp,
            userParams: {
                navigationProperty: 'toFirstAssociatedEntity',
                qualifier: 'tableSection'
            }
        }
    }
});
test.describe(`@quick-actions @fe-v2 @object-page`, () => {
    test(
        '1. Object Page: Enable Empty row mode and Change table actions',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.120.23'
            }
        },
        async ({ page, projectCopy, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame);
            const tableSettings = new TableSettings(previewFrame);

            await test.step('Select first row and Navigate to Object Page', async () => {
                await editor.toolbar.navigationModeButton.click();
                await lr.goButton.click();
                await lr.locatorForListReportTableRow(0).click();
            });

            await test.step('1.1 Enable Empty row mode', async () => {
                await editor.toolbar.uiAdaptationModeButton.click();
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
                                    changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                    content: expect.objectContaining({
                                        parentPage: expect.objectContaining({
                                            component: 'sap.suite.ui.generic.template.ObjectPage'
                                        }),
                                        entityPropertyChange: expect.objectContaining({
                                            propertyPath:
                                                'component/settings/sections/toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection/createMode',
                                            propertyValue: 'creationRows'
                                        })
                                    })
                                })
                            ])
                        })
                    );
            });

            await test.step('1.2 OP - Change table actions', async () => {
                await editor.toolbar.uiAdaptationModeButton.click();
                await editor.quickActions.changeTableActions.click();
                let actionTexts = await tableSettings.getActionSettingsTexts();
                expect(actionTexts).toEqual([
                    'SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField',
                    'Button - Create',
                    'Button - Delete'
                ]);
                await tableSettings.moveActionDown(0);
                actionTexts = await tableSettings.getActionSettingsTexts();
                expect(actionTexts).toEqual([
                    'Button - Create',
                    'SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField',
                    'Button - Delete'
                ]);
                await tableSettings.actionSettingsDialog.getByRole('button').filter({ hasText: 'OK' }).click();
                await editor.toolbar.saveButton.click();
                await expect(editor.toolbar.saveButton).toBeDisabled();
                await expect(page.getByTestId('saved-changes-stack')).toBeVisible();
                const changes = await page
                    .getByTestId('saved-changes-stack')
                    .getByText('Toolbar Content Move Change')
                    .all();
                expect(changes.length).toBe(1);
            });
        }
    );

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

            await editor.toolbar.navigationModeButton.click();

            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();

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

            await editor.reloadCompleted();

            await editor.quickActions.showPageController.click();

            await expect(
                previewFrame.getByText('adp.fiori.elements.v2/changes/coding/TestController.js')
            ).toBeVisible();

            await expect(previewFrame.getByRole('button', { name: 'Open in VS Code' })).toBeVisible();
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
            const lr = new ListReport(previewFrame);
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();

            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.addCustomTableAction.click();

            await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('op-table-action');
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
                            'op-table-action.fragment.xml': expect.stringMatching(
                                /<!-- Use stable and unique IDs!-->\s*<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>\s*<!-- viewName: sap\.suite\.ui\.generic\.template\.ObjectPage\.view\.Details -->\s*<!-- controlType: sap\.m\.OverflowToolbar -->\s*<!-- targetAggregation: content -->\s*<!-- add your xml here -->\s*<Button text="New Button"  id="btn-[a-z0-9]+"><\/Button>\s*<\/core:FragmentDefinition>/
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    targetAggregation: 'content',
                                    fragmentPath: 'fragments/op-table-action.fragment.xml'
                                })
                            })
                        ])
                    })
                );
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
            const lr = new ListReport(previewFrame);
            const tableSettings = new TableSettings(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.changeTableColumns.click();

            await expect(tableSettings.tableSettingsDialog.getByText('String Property')).toBeVisible();
            await expect(tableSettings.tableSettingsDialog.getByText('Date Property')).toBeVisible();
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

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.reloadCompleted();

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
                                /<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>\s*<!-- viewName: sap\.suite\.ui\.generic\.template\.ObjectPage\.view\.Details -->\s*<!-- controlType: sap\.m\.Table -->\s*<!-- targetAggregation: cells -->\s*<!-- add your xml here -->\s*<Text id="cell-text-[a-z0-9]+" text="Sample data" \/>\s*<\/core:FragmentDefinition>/
                            ),
                            'table-column.fragment.xml': expect.stringMatching(
                                /<!-- Use stable and unique IDs!-->\s*<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>\s*<!-- viewName: sap\.suite\.ui\.generic\.template\.ObjectPage\.view\.Details -->\s*<!-- controlType: sap\.m\.Table -->\s*<!-- targetAggregation: columns -->\s*<!-- add your xml here -->\s*<Column id="column-[a-z0-9]+"\s*width="12em"\s*hAlign="Left"\s*vAlign="Middle">\s*<Text id="column-title-[a-z0-9]+" text="New column" \/>\s*<customData>\s*<core:CustomData key="p13nData" id="custom-data-[a-z0-9]+"\s*value='\\{"columnKey": "column-[a-z0-9]+", "columnIndex": "3"}' \/>\s*<\/customData>\s*<\/Column>\s*<\/core:FragmentDefinition>/
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

            await editor.reloadCompleted();

            await expect(previewFrame.getByRole('columnheader', { name: 'New column' }).locator('div')).toBeVisible();
            if (satisfies(ui5Version, '<1.120.0')) {
                await expect(previewFrame.getByRole('cell', { name: 'Sample data' }).first()).toBeVisible();
            } else {
                await expect(previewFrame.getByRole('gridcell', { name: 'Sample data' }).first()).toBeVisible();
            }
        }
    );

    test(
        'Add Header Field',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const lr = new ListReport(previewFrame);
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();

            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.addHeaderField.click();

            await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('op-header-field');
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
                            'op-header-field.fragment.xml': expect.stringMatching(
                                /<!-- Use stable and unique IDs!-->\s*<core:FragmentDefinition\s*xmlns:uxap="sap.uxap"\s*xmlns:core='sap.ui.core'\s*xmlns='sap.m'\s*>\s*<!-- viewName: sap.suite.ui.generic.template.ObjectPage.view.Details -->\s*<!-- controlType: sap.uxap.ObjectPageLayout -->\s*<!-- targetAggregation: headerContent -->\s*<VBox id="vBox-[a-z0-9]+">\s*<Label id="label-[a-z0-9]+" text="New Field"><\/Label>\s*<\/VBox>\s*<\/core:FragmentDefinition>/
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    targetAggregation: expect.stringMatching(/^(headerContent|items)$/),
                                    fragmentPath: 'fragments/op-header-field.fragment.xml'
                                })
                            })
                        ])
                    })
                );
        }
    );

    test('Add Custom Section', {}, async ({ page, previewFrame, projectCopy, ui5Version }) => {
        const lr = new ListReport(previewFrame);
        const dialog = new AdpDialog(previewFrame, ui5Version);
        const editor = new AdaptationEditorShell(page, ui5Version);

        await editor.toolbar.navigationModeButton.click();

        await lr.goButton.click();
        await lr.locatorForListReportTableRow(0).click();

        await editor.toolbar.uiAdaptationModeButton.click();

        await editor.quickActions.addCustomSection.click();

        await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('op-section');
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
                        'op-section.fragment.xml': expect.stringMatching(
                            /<!-- Use stable and unique IDs!-->\s*<core:FragmentDefinition\s*xmlns:uxap="sap.uxap"\s*xmlns:core='sap.ui.core'\s*xmlns='sap.m'\s*>\s*<!-- viewName: sap\.suite\.ui\.generic\.template\.ObjectPage\.view\.Details -->\s*<!-- controlType: sap\.uxap\.ObjectPageLayout -->\s*<!-- targetAggregation: sections -->\s*<uxap:ObjectPageSection\s*id="op-section-[a-z0-9]+"\s*title="New Custom Section"\s*>\s*<uxap:ObjectPageSubSection id="op-subsection-[a-z0-9]+">\s*<HBox id="hbox-[a-z0-9]+">\s*<!-- add your xml here -->\s*<\/HBox>\s*<\/uxap:ObjectPageSubSection>\s*<\/uxap:ObjectPageSection>\s*<\/core:FragmentDefinition>/
                        )
                    }),
                    changes: expect.arrayContaining([
                        expect.objectContaining({
                            fileType: 'change',
                            changeType: 'addXML',
                            content: expect.objectContaining({
                                targetAggregation: 'sections',
                                fragmentPath: 'fragments/op-section.fragment.xml'
                            })
                        })
                    ])
                })
            );
    });
});
