import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport, readChanges } from './test-utils';
test.use({
    projectConfig: {
        ...ADP_FIORI_ELEMENTS_V2,
        baseApp: {
            ...ADP_FIORI_ELEMENTS_V2.baseApp,
            userParams: {
                navigationProperty: 'toFirstAssociatedEntity',
                variantManagement: false,
                qualifier: 'tableSection'
            }
        }
    }
});
test.describe(`@quick-actions @fe-v2 @object-page @op-variant-management`, () => {
    test(
        'Enable Variant Management in Tables',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, projectCopy, previewFrame, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const lr = new ListReport(previewFrame);
            await editor.toolbar.navigationModeButton.click();

            await lr.goButton.click();
            await lr.locatorForListReportTableRow(0).click();

            await editor.toolbar.uiAdaptationModeButton.click();
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
                                changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                content: expect.objectContaining({
                                    parentPage: expect.objectContaining({
                                        component: 'sap.suite.ui.generic.template.ObjectPage',
                                        entitySet: 'RootEntity'
                                    }),
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath:
                                            'component/settings/sections/toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection/tableSettings',
                                        operation: 'UPSERT',
                                        propertyValue: expect.objectContaining({
                                            variantManagement: true
                                        })
                                    })
                                })
                            })
                        ])
                    })
                );
        }
    );
});
