import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { AdaptationEditorShell, AdpDialog, ListReport, TableSettings, verifyChanges } from './test-utils';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { lt, satisfies } from 'semver';

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
        '1. Object Page: Enable Empty row mode',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.120.23'
            }
        },
        async ({ page, projectCopy, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnGoButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.enableEmptyRowMode.click();
            await editor.toolbar.saveAndReloadButton.click();
            await editor.toolbar.isDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                        content: {
                            parentPage: {
                                component: 'sap.suite.ui.generic.template.ObjectPage'
                            },
                            entityPropertyChange: {
                                propertyPath:
                                    'component/settings/sections/toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection/createMode',
                                propertyValue: 'creationRows'
                            }
                        }
                    }
                ]
            });
        }
    );

    test(
        '2. Change table actions',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.120.23'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame);
            const tableSettings = new TableSettings(previewFrame, 'Rearrange Toolbar Content');

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnGoButton();
            await lr.clickOnTableNthRow(0);
            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.changeTableActions.click();
            await tableSettings.expectItemsToBeVisible([
                'SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField',
                'Button - Create',
                'Button - Delete'
            ]);
            await tableSettings.moveActionDown(0);
            await tableSettings.expectItemsToBeVisible([
                'Button - Create',
                'SearchField - fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection::Table::Toolbar::SearchField',
                'Button - Delete'
            ]);
            await tableSettings.closeOrConfirmDialog();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.changesPanel.expectSavedChangesStack(page, 'Toolbar Content Move Change', 1);
        }
    );

    test(
        '3. Add controller to page',
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

            await lr.clickOnGoButton();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
            if (satisfies(ui5Version, '~1.71.0')) {
                await page.waitForTimeout(1000);
            }
            await editor.quickActions.addControllerToPage.click();

            await dialog.fillField('Controller Name', 'TestController');
            await dialog.clickCreateButton();
            if (lt(ui5Version, '1.136.0')) {
                await expect(page.getByText('Changes detected!')).toBeVisible();
            } else {
                await editor.toolbar.saveButton.click();
            }

            await verifyChanges(projectCopy, {
                coding: {
                    ['TestController.js']: /ControllerExtension\.extend\("adp\.fiori\.elements\.v2\.TestController"/
                },
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'codeExt',
                        content: { codeRef: 'coding/TestController.js' }
                    }
                ]
            });

            await editor.changesPanel.reloadButton.click();
            await editor.reloadCompleted();
            await editor.quickActions.showPageController.click();

            await expect(
                previewFrame.getByText('adp.fiori.elements.v2/changes/coding/TestController.js'),
                `Check file name \`adp.fiori.elements.v2/changes/coding/TestController.js\` is visible in dialog`
            ).toBeVisible();

            await expect(
                previewFrame.getByRole('button', { name: 'Open in VS Code' }),
                `Check \`Open in VS Code\` button visible in dialog.`
            ).toBeVisible();
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
            const lr = new ListReport(previewFrame);
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();

            await lr.clickOnGoButton();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.addCustomTableAction.click();

            await dialog.fillField('Fragment Name', 'op-table-action');
            await dialog.clickCreateButton();

            await editor.toolbar.saveAndReloadButton.click();

            await editor.toolbar.isDisabled();
            await verifyChanges(projectCopy, {
                fragments: {
                    'op-table-action.fragment.xml': `<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Button text="New Button"  id="btn-[a-z0-9]+"></Button>
</core:FragmentDefinition>`
                },
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: 'content',
                            fragmentPath: 'fragments/op-table-action.fragment.xml'
                        }
                    }
                ]
            });
        }
    );
    test(
        '5. Change table columns',
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
            await lr.clickOnGoButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.changeTableColumns.click();
            await tableSettings.expectItemsToBeVisible(['String Property', 'Date Property']);
        }
    );

    test(
        '6. Add Custom Table Column',
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
            await lr.clickOnGoButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.reloadCompleted();

            await editor.quickActions.addCustomTableColumn.click();

            await dialog.fillField('Column Fragment Name', 'table-column');
            await dialog.fillField('Cell Fragment Name', 'table-cell');
            await dialog.clickCreateButton();

            await editor.toolbar.saveAndReloadButton.click();

            await editor.toolbar.isDisabled();

            await verifyChanges(projectCopy, {
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
                },
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
                ]
            });

            await editor.reloadCompleted();

            await expect(
                previewFrame.getByRole('columnheader', { name: 'New column' }).locator('div'),
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
        '7. Add Header Field',
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

            await lr.clickOnGoButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.addHeaderField.click();

            await dialog.fillField('Fragment Name', 'op-header-field');
            await dialog.clickCreateButton();
            await editor.toolbar.saveAndReloadButton.click();

            await editor.toolbar.isDisabled();
            await verifyChanges(projectCopy, {
                fragments: {
                    'op-header-field.fragment.xml': `<!-- Use stable and unique IDs!-->
<core:FragmentDefinition
    xmlns:uxap="sap.uxap"
    xmlns:core='sap.ui.core'
    xmlns='sap.m'
>
     <VBox id="vBox-[a-z0-9]+">
         <Label id="label-[a-z0-9]+" text="New Field"></Label>
    </VBox>
</core:FragmentDefinition>`
                },
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: /^(headerContent|items)$/,
                            fragmentPath: 'fragments/op-header-field.fragment.xml'
                        }
                    }
                ]
            });
        }
    );
    test('8. Add Custom Section', {}, async ({ page, previewFrame, projectCopy, ui5Version }) => {
        const lr = new ListReport(previewFrame);
        const dialog = new AdpDialog(previewFrame, ui5Version);
        const editor = new AdaptationEditorShell(page, ui5Version);

        await editor.toolbar.navigationModeButton.click();

        await lr.clickOnGoButton();
        await lr.clickOnTableNthRow(0);

        await editor.toolbar.uiAdaptationModeButton.click();

        await editor.quickActions.addCustomSection.click();

        await dialog.fillField('Fragment Name', 'op-section');
        await dialog.clickCreateButton();

        await editor.toolbar.saveAndReloadButton.click();

        await editor.toolbar.isDisabled();
        await verifyChanges(projectCopy, {
            fragments: {
                ['op-section.fragment.xml']: `<!-- Use stable and unique IDs!-->
<core:FragmentDefinition
    xmlns:uxap="sap.uxap"
    xmlns:core='sap.ui.core'
    xmlns='sap.m'
>
    <uxap:ObjectPageSection
        id="op-section-[a-z0-9]+"
        title="New Custom Section"
    >
        <uxap:ObjectPageSubSection id="op-subsection-[a-z0-9]+">
            <HBox id="hbox-[a-z0-9]+">
                <!--  add your xml here -->
            </HBox>
        </uxap:ObjectPageSubSection>
    </uxap:ObjectPageSection>
</core:FragmentDefinition>`
            },
            changes: [
                {
                    fileType: 'change',
                    changeType: 'addXML',
                    content: {
                        targetAggregation: 'sections',
                        fragmentPath: 'fragments/op-section.fragment.xml'
                    }
                }
            ]
        });
    });
});
