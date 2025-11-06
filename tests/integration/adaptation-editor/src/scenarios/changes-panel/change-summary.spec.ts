import { expect, type Page } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport, waitUntilFileIsDeleted } from '../test-utils';
import { join } from 'node:path';
/**
 * Creates changes under filter by toggling `enabled` property multiple times from properties panel
 * The reason behind multiple iterations is to create many changes and enable scrollbar
 *
 * @param page - Page instance from playwright
 */
async function createChanges(page: Page): Promise<void> {
    await test.step('Create multiple changes to enable scrollbar', async () => {
        for (let i = 0; i < 12; i++) {
            // for property 'enabled' true button is clicked
            await page.getByTestId('enabled--InputTypeToggle--booleanTrue').click();

            // for property 'enabled' false button is clicked
            await page.getByTestId('enabled--InputTypeToggle--booleanFalse').click();
        }
    });
}
test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@changes-panel @cpe @adp`, () => {
    test(
        '1. Summary view',
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
            await editor.changesPanel.checkTextInPanel(['No historic changes']);
            await editor.changesPanel.checkTextInPanel(['This application was not modified yet']);
            await expect(
                page.getByTestId('Control-Property-Editor-No-Changes-Icon'),
                `Check \`HistoryClock\` icon is visible in the Changes Panel`
            ).toBeVisible();
        }
    );

    test(
        '2. Change button text - UNSAVED CHANGES',
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
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.changesPanel.checkTextInPanel(['UNSAVED CHANGES']);
            await editor.changesPanel.checkTextInPanel(['Text', 'Manage'], 'unsaved');
        }
    );

    test(
        '3. Undo and Redo UNSAVED CHANGES',
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
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.toolbar.undoButton.click();
            await editor.toolbar.isUndoDisabled();
            await editor.toolbar.redoButton.click();
            await editor.toolbar.isUndoEnabled();
        }
    );
    test(
        '4. Save changes',
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
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.changesPanel.checkTextInPanel(['SAVED CHANGES']);
            await editor.changesPanel.checkTextInPanel(['Text', 'Manage'], 'saved');
        }
    );
    test(
        '5. Delete Saved changes',
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
            await editor.propertiesPanel.fillStringEditor('text', 'Manage');
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.changesPanel.checkDeleteButtonForSavedItem(['Text', 'Manage']);
            await (await editor.changesPanel.getDeleteButtonLocatorForSavedItem(['Text', 'Manage'])).click();
            await editor.changesPanel.deleteOnDilog.click();
            const path = join(projectCopy, 'changes');
            const files = await waitUntilFileIsDeleted(path);
            expect(files.length, 'Verify in the project `webapp --> changes` folder, change file is deleted.').toEqual(
                0
            );
        }
    );
    test(
        '6. Sticky Filter Bar',
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
            await expect(page.getByPlaceholder('Filter Changes')).toBeVisible();
            await createChanges(page);
            await editor.changesPanel.checkFilterBarIsSticky();
        }
    );
});
