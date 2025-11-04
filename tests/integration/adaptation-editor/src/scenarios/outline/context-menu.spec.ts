import { expect } from '@sap-ux-private/playwright';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, AdpDialog, ListReport, verifyChanges } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@outline @context-menu`, () => {
    test(
        '1: Trigger Add Fragment at OverflowToolbar node via context menu',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.135.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const dialog = new AdpDialog(previewFrame, ui5Version);

            await editor.outlinePanel.clickOnNode('OverflowToolbar', 'right');
            await editor.outlinePanel.clickOnContextMenu('Add: Fragment');
            await dialog.fillField('Fragment Name', 'toolbar-fragment');
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.reloadCompleted();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: 'content',
                            index: 10,
                            fragmentPath: 'fragments/toolbar-fragment.fragment.xml'
                        }
                    }
                ]
            });
        }
    );

    test(
        '2: Rename "Create" button via context menu',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.135.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const dialog = new AdpDialog(previewFrame, ui5Version, 'Rename');

            await editor.outlinePanel.clickOnNode('Create', 'right');
            await editor.outlinePanel.clickOnContextMenu('Rename');
            await dialog.fillField('Selected Label:', 'Add New');
            await editor.reloadCompleted();
            await dialog.clickOnOk();

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'rename',
                        texts: {
                            newText: {
                                value: 'Add New',
                                type: 'XBUT'
                            }
                        },
                        selector: {
                            id: 'fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--addEntry'
                        }
                    }
                ]
            });
        }
    );

    test(
        '3: Rename  Object Page Section via context menu',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.135.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const lr = new ListReport(previewFrame);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            const dialog = new AdpDialog(previewFrame, ui5Version, 'Rename');

            await expect(page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true })).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.outlinePanel.clickOnNode('ObjectPageSubSection', 'right');
            await editor.outlinePanel.clickOnContextMenu('Rename');
            await dialog.fillField('Selected Label:', 'Basic information');
            await dialog.clickOnOk();

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'rename',
                        texts: {
                            newText: {
                                value: 'Basic information',
                                type: 'XGRP'
                            }
                        },
                        selector: {
                            id: 'fiori.elements.v2.0::sap.suite.ui.generic.template.ObjectPage.view.Details::RootEntity--com.sap.vocabularies.UI.v1.FieldGroup::GeneralInfo::SubSection'
                        }
                    }
                ]
            });
        }
    );

    test(
        '4: Add Fragment at Section node via context menu',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.135.0'
            }
        },
        async ({ page, previewFrame, ui5Version, projectCopy }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const lr = new ListReport(previewFrame);

            await editor.toolbar.navigationModeButton.click();
            await lr.clickOnButton();
            await lr.clickOnTableNthRow(0);

            const dialog = new AdpDialog(previewFrame, ui5Version);

            await expect(page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true })).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();
            await editor.outlinePanel.clickOnNode('ObjectPageLayout', 'right');
            await editor.outlinePanel.clickOnContextMenu('Add: Fragment');
            await dialog.fillField('Fragment Name', 'custom-section');
            await dialog.clickCreateButton();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();
            await editor.reloadCompleted();

            await verifyChanges(projectCopy, {
                changes: [
                    {
                        fileType: 'change',
                        changeType: 'addXML',
                        content: {
                            targetAggregation: 'sections',
                            index: 3,
                            fragmentPath: 'fragments/custom-section.fragment.xml'
                        }
                    }
                ]
            });
        }
    );
});
