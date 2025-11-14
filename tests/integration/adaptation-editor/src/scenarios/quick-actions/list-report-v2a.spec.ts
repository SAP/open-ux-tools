import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport, verifyChanges } from '../test-utils';
test.use({
    projectConfig: {
        ...ADP_FIORI_ELEMENTS_V2,
        baseApp: {
            ...ADP_FIORI_ELEMENTS_V2.baseApp,
            userParams: {
                isManifestArray: true
            }
        }
    }
});
test.describe(`@quick-actions @fe-v2 @list-report @manifest-array-structure`, () => {
    test(
        '1. Enable/Disable Semantic Date Range in Filter Bar',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.134.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const lr = new ListReport(previewFrame, 'fev2', ui5Version);
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
            await lr.clickOnDatePropertyValueHelper();
            await lr.checkCalendarDisplayed();
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
});
