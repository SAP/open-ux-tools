import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport, waitForChangeFile } from '../test-utils';
import { join } from 'node:path';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });
test.describe(`@properties-panel @change-indicators @cpe @adp`, () => {
    test(
        '1. UnSaved Change Indicator',
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
            await editor.propertiesPanel.fillStringEditor('text', 'Create New');
            await page.getByTestId('text--Label').click();
            await editor.propertiesPanel.checkPropertyIndicator('text', 'UnSaved');
            await editor.propertiesPanel.checkTooltipContent('text', {
                'Current value': 'Create New',
                'Default value': '-',
                description: 'Determines the text of the Button.',
                infoIconDesc:
                    "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
                'Property name': 'text',
                'Property type': 'string',
                title: 'Text'
            });
            await editor.outlinePanel.checkOutlineNodeIndicator('Create New', 'UnSaved');
        }
    );

    test(
        '2. Saved and Unsaved Change Indicator',
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
            await editor.propertiesPanel.fillStringEditor('text', 'Create New');
            await page.getByTestId('text--Label').click();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.propertiesPanel.checkPropertyIndicator('text', 'Saved');
            await editor.propertiesPanel.checkTooltipContent('text', {
                'Saved value': 'Create New',
                'Default value': '-',
                description: 'Determines the text of the Button.',
                infoIconDesc:
                    "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
                'Property name': 'text',
                'Property type': 'string',
                title: 'Text'
            });
            await editor.outlinePanel.checkOutlineNodeIndicator('Create New', 'Saved');

            await editor.propertiesPanel.fillStringEditor('text', 'Create Newest');
            await page.getByTestId('text--Label').click();
            await editor.propertiesPanel.checkPropertyIndicator('text', 'SavedAndUnSaved');
            await editor.outlinePanel.checkOutlineNodeIndicator('Create Newest', 'SavedAndUnSaved');
        }
    );

    test(
        "3. Delete Changes from Property's Tooltip",
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
            await editor.propertiesPanel.fillStringEditor('text', 'Create New');
            await page.getByTestId('text--Label').click();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.changesPanel.expectSavedChangesStack(page, 'Button', 1);
            const changesFolderPath = join(projectCopy, 'webapp', 'changes');
            await waitForChangeFile(changesFolderPath);
            await editor.propertiesPanel.openTooltip('text');
            await editor.propertiesPanel
                .getButton('Delete all changes for this property', `\`text\` Property tooltip`)
                .click();
            await editor.propertiesPanel.getButton('Delete', 'Confirm property change deletion').click();
            await waitForChangeFile(changesFolderPath, 0);
        }
    );
});
