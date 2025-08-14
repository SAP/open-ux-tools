import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { AdaptationEditorShell, ListReport, TableSettings, readChanges } from './test-utils';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });
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
});
