import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport, TableSettings } from './test-utils';
test.use({
    projectConfig: {
        ...ADP_FIORI_ELEMENTS_V2,
        baseApp: {
            ...ADP_FIORI_ELEMENTS_V2.baseApp,
            userParams: {
                navigationProperty: 'toFirstAssociatedEntity',
                qualifier: 'tableSection',
                analyticalTable: true
            }
        }
    }
});
test.describe(`@quick-actions @fe-v2 @object-page @op-analytical-table`, () => {
    test(
        '1. Change table columns (analytical table)',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnGoButton();
            await lr.clickOnTableNthRow(0);

            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.quickActions.changeTableColumns.click();
            const tableSettings = new TableSettings(previewFrame);
            await tableSettings.expectItemsToBeVisible(['String Property', 'Date Property']);
        }
    );
});
