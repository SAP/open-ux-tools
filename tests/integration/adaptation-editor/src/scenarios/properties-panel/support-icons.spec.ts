import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport, verifyChanges } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@properties-panel @support-icons @cpe @adp`, () => {
    test(
        '1. Change icon property for button control',
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
            await editor.propertiesPanel.getValueHelpInput('activeIcon').hover();
            await test.step('Check the `tooltip` is `Select Icon`', async () => {
                const title = await editor.propertiesPanel.getValueHelpInput('activeIcon').getAttribute('title');
                expect(title).toBe('Select Icon');
            });
            await editor.propertiesPanel.getValueHelpInput('activeIcon').click();
            await editor.propertiesPanel.fillValueHelpFilter('action');
            await editor.propertiesPanel.getValueHelpTableCell('action-settings').click();
            await editor.propertiesPanel.getButton('OK', 'Select Icon Dialog').click();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.propertiesPanel.checkStringEditorPropertyValue('activeIcon', 'sap-icon://action-settings');
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'propertyChange',
                        content: { property: 'activeIcon', newValue: 'sap-icon://action-settings' }
                    }
                ]
            });
        }
    );
});
