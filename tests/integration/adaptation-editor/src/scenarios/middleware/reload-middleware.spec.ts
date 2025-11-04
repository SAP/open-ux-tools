import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, createChangeFlexFile, deleteChanges, exposeFunction, ListReport } from '../test-utils';
import { join } from 'node:path';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });
let messages: any[] = [];
test.describe(`@reload-middleware @cpe @adp`, () => {
    test.beforeEach(async ({ page }) => {
        await exposeFunction(page, messages);
    });
    test.afterEach(async ({}) => {
        messages = [];
    });
    test(
        '1. Manually change flex change file - SAVED CHANGES',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version, previewFrame, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const listReport = new ListReport(previewFrame);
            await editor.reloadCompleted();
            const webappChangesPath = join(projectCopy, 'webapp', 'changes');
            await createChangeFlexFile(webappChangesPath, ui5Version);
            await editor.changesPanel.checkText('Changes Detected');
            await editor.changesPanel.reloadButton.click();
            await listReport.checkAppLoaded();
            await editor.changesPanel.checkTextInPanel(['Text', 'Create New'], 'saved');
        }
    );
    test(
        '2. Manually change flex change file - UNSAVED CHANGES',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version, previewFrame, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const listReport = new ListReport(previewFrame);
            await listReport.clickOnControlOverlay('Create');
            await editor.propertiesPanel.fillStringEditor('text', 'Update');
            await page.getByTestId('text--Label').click();
            const webappChangesPath = join(projectCopy, 'webapp', 'changes');
            await createChangeFlexFile(webappChangesPath, ui5Version);
            await editor.changesPanel.checkText('Changes Detected');
            await editor.changesPanel.reloadButton.click();
            await listReport.checkAppLoaded();
            await editor.changesPanel.checkTextInPanel(['Text', 'Update'], 'saved');
            await listReport.checkControlLabel('Update');
        }
    );
    test(
        '3. External deletion of the local flex change file',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version, previewFrame, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            const listReport = new ListReport(previewFrame);
            await editor.reloadCompleted();
            const webappChangesPath = join(projectCopy, 'webapp', 'changes');
            await createChangeFlexFile(webappChangesPath, ui5Version);
            await editor.changesPanel.checkText('Changes Detected');
            await editor.changesPanel.reloadButton.click();
            await listReport.checkAppLoaded();
            await editor.changesPanel.checkTextInPanel(['Text', 'Create New'], 'saved');
            await listReport.checkControlLabel('Create New');
            await deleteChanges(webappChangesPath);
            await editor.changesPanel.reloadButton.click();
            await editor.changesPanel.checkTextInPanel(['No historic changes']);
            await listReport.checkAppLoaded();
            await listReport.checkControlLabel('Create');
        }
    );
    test(
        '4. UI change deletion - DELETE SAVED CHANGE',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version, previewFrame }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const listReport = new ListReport(previewFrame);
            await listReport.clickOnControlOverlay('Create');
            await editor.propertiesPanel.fillStringEditor('text', 'Manage');
            await page.getByTestId('text--Label').click();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.changesPanel.checkTextInPanel(['SAVED CHANGES']);
            await editor.changesPanel.checkTextInPanel(['Text', 'Manage'], 'saved');
            await (await editor.changesPanel.getDeleteButtonLocatorForSavedItem(['Text', 'Manage'])).click();
            await editor.changesPanel.deleteOnDilog.click();
            await editor.changesPanel.reloadButton.click();
            await editor.changesPanel.checkTextInPanel(['No historic changes']);
            await listReport.checkAppLoaded();
            await listReport.checkControlLabel('Create');
        }
    );
});
