import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport, verifyChanges } from './test-utils';
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
        '1. Enable Variant Management in Tables',
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

            await lr.clickOnGoButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.enableOPVariantManagementInTable.click();

            await editor.toolbar.saveAndReloadButton.click();
            await editor.toolbar.isDisabled();
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                        content: {
                            parentPage: {
                                component: 'sap.suite.ui.generic.template.ObjectPage',
                                entitySet: 'RootEntity'
                            },
                            entityPropertyChange: {
                                propertyPath:
                                    'component/settings/sections/toFirstAssociatedEntity::com.sap.vocabularies.UI.v1.LineItem::tableSection/tableSettings',
                                operation: 'UPSERT',
                                propertyValue: {
                                    variantManagement: true
                                }
                            }
                        }
                    }
                ]
            });
        }
    );
});
