import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V4 } from '../../project';
import { AdaptationEditorShell, exposeFunction, ListReport, verifyChanges } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V4 });
let messages: any[] = [];
test.describe(`@properties-panel @manifest-property @adp`, () => {
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
                description: '<1.131.0'
            }
        },
        async ({ page, ui5Version, previewFrame, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const listReport = new ListReport(previewFrame);
            await listReport.clickOnV4Table();
            await editor.propertiesPanel.fillStringEditor('header', 'List Report Table');
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.propertiesPanel.checkStringEditorPropertyValue('header', 'List Report Table');
            await editor.changesPanel.checkTextInPanel(['header', 'List Report Table'], 'saved');
            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            page: 'RootEntityList',
                            entityPropertyChange: {
                                propertyPath:
                                    'controlConfiguration/@com.sap.vocabularies.UI.v1.LineItem/tableSettings/header',
                                operation: 'UPSERT',
                                propertyValue: 'List Report Table'
                            }
                        }
                    }
                ]
            });
        }
    );
    test(
        '2. Undo/Redo',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, ui5Version, previewFrame }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const listReport = new ListReport(previewFrame);
            await listReport.clickOnV4Table();
            await editor.propertiesPanel.fillStringEditor('header', 'List Report Table');
            await editor.propertiesPanel.clickElseWhereToLooseFocus();
            await editor.toolbar.undoButton.click();
            await editor.propertiesPanel.checkStringEditorPropertyValue('header', 'Root Entities');
            await editor.toolbar.redoButton.click();
            await editor.propertiesPanel.checkStringEditorPropertyValue('header', 'List Report Table');
        }
    );
    test(
        '3. Filter Properties Show only editable properties',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, ui5Version, previewFrame }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const listReport = new ListReport(previewFrame);
            await listReport.clickOnV4Table();
            const propertiesRendered = await editor.propertiesPanel.getAllPropertiesEditorTypes();
            const propertiesFromApi = await editor.propertiesPanel.getAllPropertiesFromMessage(messages);

            await editor.propertiesPanel.checkIfPropertiesFromApiAreRendered(propertiesFromApi, propertiesRendered);

            await editor.propertiesPanel.filterProperties('header');
            await editor.propertiesPanel.checkPropertiesListIsFilteredByText('header');
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
        '4. Tooltip for properties',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, ui5Version, previewFrame }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const listReport = new ListReport(previewFrame);
            await listReport.clickOnV4Table();
            await editor.propertiesPanel.checkTooltipContent('selectionLimit', {
                'Default value': '300',
                description: 'Define the selection limit',
                infoIconDesc:
                    "This is default value set by SAP UI5 control and it may be different than the one that is used by SAP Fiori Elements. This means that after deleting all the changes for the property it's value may differ from the one displayed here.",
                'Property name': 'selectionLimit',
                title: 'Selection Limit'
            });
        }
    );
});
