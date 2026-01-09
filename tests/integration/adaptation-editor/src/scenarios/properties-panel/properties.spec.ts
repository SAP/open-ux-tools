import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, exposeFunction, ListReport, verifyChanges } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });
let messages: any[] = [];
test.describe(`@properties-panel @property @cpe @adp`, () => {
    test.beforeEach(async ({ page }) => {
        await exposeFunction(page, messages);
    });
    test.afterEach(async ({}) => {
        messages = [];
    });
    test(
        '1. Change Button Text',
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
            await editor.propertiesPanel.checkControlIdAndControlType(
                await listReport.getControlIdByLabel('Create'),
                'sap.m.Button'
            );
            await editor.propertiesPanel.checkCopyToClipboardButton('CONTROLID');
            await editor.propertiesPanel.checkCopyToClipboardButton('CONTROLTYPE');
            await editor.propertiesPanel.fillStringEditor('text', 'Create New');
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.propertiesPanel.checkStringEditorPropertyValue('text', 'Create New');
            await editor.changesPanel.checkTextInPanel(['Text', 'Create New'], 'saved');
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'propertyChange',
                        content: { property: 'text', newValue: 'Create New' }
                    }
                ]
            });
        }
    );
    test(
        '2. Change Properties to Expression',
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
            await editor.propertiesPanel.setBooleanProperty('enabled', true);
            await listReport.checkControlState('Create', true);
            await editor.propertiesPanel.setBooleanProperty('enabled', false);
            await listReport.checkControlState('Create', false);
            await editor.propertiesPanel.getExpressionValueButton('enabled').click();
            await editor.propertiesPanel.checkValue('enabled', '{expression}');
            await editor.propertiesPanel.fillStringEditor('enabled', '{expression');
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.propertiesPanel.checkValue('enabled', '{expression');
            await editor.propertiesPanel.checkError(
                'enabled',
                `SyntaxError: no closing braces found in '{expression' after pos:0`
            );
            await editor.propertiesPanel.fillStringEditor('enabled', '{someExpression}');
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.propertiesPanel.checkValue('enabled', '{someExpression}');
            await editor.propertiesPanel.checkError('enabled', ``);

            await editor.propertiesPanel.checkValue('type', 'Transparent');
            await editor.propertiesPanel.getExpressionValueButton('type').click();
            await editor.propertiesPanel.checkValue('type', '{expression}');
            await editor.propertiesPanel.fillStringEditor('type', 'Back');
            await editor.propertiesPanel.checkValue('type', 'Back');
        }
    );
    test(
        '3. Undo/Redo',
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
            await listReport.clickOnControlOverlay('Delete');
            await editor.propertiesPanel.fillStringEditor('text', 'Remove');
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.toolbar.undoButton.click();
            await editor.propertiesPanel.checkStringEditorPropertyValue('text', '{i18n>DELETE}');
            await editor.toolbar.redoButton.click();
            await editor.propertiesPanel.checkStringEditorPropertyValue('text', 'Remove');
        }
    );
    test(
        '4. Filter Properties Show only editable properties',
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
            const propertiesRendered = await editor.propertiesPanel.getAllPropertiesEditorTypes();
            const propertiesFromApi = await editor.propertiesPanel.getAllPropertiesFromMessage(messages);

            await editor.propertiesPanel.checkIfPropertiesFromApiAreRendered(propertiesFromApi, propertiesRendered);

            await editor.propertiesPanel.filterProperties('text');
            await editor.propertiesPanel.checkPropertiesListIsFilteredByText('text');
            await editor.propertiesPanel.filterProperties('');

            await editor.propertiesPanel.mangeFiltersButton.click();
            await editor.propertiesPanel.getFilterOptionButton('Show only editable properties').click();

            const filteredPropertiesRendered = await editor.propertiesPanel.getAllPropertiesEditorTypes();
            expect(
                filteredPropertiesRendered.length,
                'Check all properties editable and non editable are rendered'
            ).toEqual(propertiesFromApi.length);
        }
    );

    test(
        '5. Tooltip for properties',
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
            await editor.propertiesPanel.checkTooltipContent('blocked', {
                'Default value': 'false',
                description: 'Whether the control is currently in blocked state.',
                infoIconDesc:
                    "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
                'Property name': 'blocked',
                'Property type': 'boolean',
                title: 'Blocked'
            });
        }
    );
});
