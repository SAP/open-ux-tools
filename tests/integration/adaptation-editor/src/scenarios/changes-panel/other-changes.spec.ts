import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@changes-panel @other-changes @cpe @adp`, () => {
    // test.setTimeout(5 * 60 * 10000);
    test('1. Create other change - remove', {}, async ({ page, ui5Version, previewFrame }) => {
        const editor = new AdaptationEditorShell(page, ui5Version);
        await editor.reloadCompleted();
        const listReport = new ListReport(previewFrame);
        await listReport.clickOnControlOverlay('Create', 'right');
        await listReport.getContextMenuItem('Remove').click();
        await editor.changesPanel.expectUnSavedChangesStack(page, 'Hide Control Change', 1);
        await editor.toolbar.saveButton.click();
        await expect(editor.toolbar.saveButton).toBeDisabled();
        await editor.changesPanel.expectSavedChangesStack(page, 'Hide Control Change', 1);
    });
});
