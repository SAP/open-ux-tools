import { expect } from '@sap-ux-private/playwright';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V4 } from '../../project';
import { AdaptationEditorShell, AdpDialog, ListReport, readChanges, TableSettings } from './test-utils';
import { satisfies } from 'semver';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V4 });
test.describe(`@quick-actions @fe-v4 @list-report`, () => {
    test('1. Enable/Disable clear filter bar button', {}, async ({ page, previewFrame, ui5Version, projectCopy }) => {
        const lr = new ListReport(previewFrame);
        const editor = new AdaptationEditorShell(page, ui5Version);

        await editor.reloadCompleted();
        await expect(lr.clearButton).toBeHidden();

        await editor.quickActions.enableClearButton.click();

        await editor.toolbar.saveAndReloadButton.click();
        await expect(editor.toolbar.saveButton).toBeDisabled();
        await expect(lr.goButton).toBeVisible();
        await editor.reloadCompleted();

        await expect(lr.clearButton).toBeVisible();

        await expect
            .poll(async () => readChanges(projectCopy), {
                message: 'make sure change file is created'
            })
            .toEqual(
                expect.objectContaining({
                    changes: expect.arrayContaining([
                        expect.objectContaining({
                            fileType: 'change',
                            changeType: 'appdescr_fe_changePageConfiguration',
                            content: expect.objectContaining({
                                page: 'RootEntityList',
                                entityPropertyChange: expect.objectContaining({
                                    operation: 'UPSERT',
                                    propertyPath:
                                        'controlConfiguration/@com.sap.vocabularies.UI.v1.SelectionFields/showClearButton',
                                    propertyValue: true
                                })
                            })
                        })
                    ])
                })
            );
    });

    test(
        '2: Add Custom Table Column LR',
        {
            annotation: {
                type: 'skipUI5Version',
                // TODO: 1.84 and 1.96 there is an error when saving changes
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const lr = new ListReport(previewFrame);
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.quickActions.addCustomTableColumn.click();
            await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('table-column');
            await dialog.createButton.click();
            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            expect.objectContaining({
                fragments: expect.objectContaining({
                    'table-column.fragment.xml': expect.stringMatching(
                        new RegExp(`<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:table="sap.ui.mdc.table">
    <table:Column
        id="column-[a-z0-9]+"
        width="10%"
        header="New Column">
        <Text id="text-[a-z0-9]+" text="Sample data"/>
    </table:Column>
</core:FragmentDefinition>`)
                    )
                }),
                changes: expect.arrayContaining([
                    expect.objectContaining({
                        fileType: 'change',
                        changeType: 'addXML',
                        content: expect.objectContaining({
                            targetAggregation: 'columns',
                            fragmentPath: 'fragments/table-column.fragment.xml'
                        })
                    })
                ])
            });

            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await expect(previewFrame.getByRole('columnheader', { name: 'New column' }).locator('bdi')).toBeVisible();
            if (satisfies(ui5Version, '<1.120.0')) {
                await expect(previewFrame.getByRole('cell', { name: 'Sample data' })).toBeVisible();
            } else {
                await expect(previewFrame.getByRole('gridcell', { name: 'Sample data' })).toBeVisible();
            }
        }
    );

    test(
        '3. Add New Annotation File',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, projectCopy, ui5Version, previewFrame }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.addLocalAnnotationFile.click();

            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();
            await page.waitForTimeout(2000); // wait for changes to be processed
            await expect
                .poll(
                    async () => {
                        const changes = await readChanges(projectCopy);
                        const annotationFile = Object.keys(changes.annotations)[0];
                        expect(changes.annotations[annotationFile]).toContain(
                            `<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="local_`
                        );
                        return changes;
                    },
                    {
                        message: 'make sure change file is created'
                    }
                )
                .toEqual(
                    expect.objectContaining({
                        annotations: expect.any(Object), // Generic - just check it exists
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'appdescr_app_addAnnotationsToOData',
                                content: expect.objectContaining({
                                    dataSourceId: 'mainService',
                                    annotations: expect.arrayContaining([
                                        expect.stringMatching(/customer\.annotation\.annotation_\d+/)
                                    ])
                                })
                            })
                        ])
                    })
                );
            await editor.reloadCompleted();
            await editor.quickActions.showLocalAnnotationFile.click();
            await expect(
                previewFrame.getByText(/adp\.fiori\.elements\.v4\/changes\/annotations\/annotation_\d+\.xml/)
            ).toBeVisible();
            await expect(previewFrame.getByRole('button', { name: 'Show File in VSCode' })).toBeVisible();
        }
    );

    test(
        '4. Enable Variant Management in Tables and Charts',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.131.0'
            }
        },
        async ({ page, projectCopy, ui5Version }) => {
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.enableVariantManagementInTablesAndCharts.click();

            await editor.toolbar.saveAndReloadButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'appdescr_fe_changePageConfiguration',
                                content: expect.objectContaining({
                                    page: 'RootEntityList',
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'variantManagement',
                                        operation: 'UPSERT',
                                        propertyValue: 'Control'
                                    })
                                })
                            })
                        ])
                    })
                );
        }
    );

    test(
        '5. Change table actions',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.130.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const tableSettings = new TableSettings(previewFrame, 'fev4');
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.changeTableActions.click();

            let actionTexts = await tableSettings.getActionSettingsTexts();
            expect(actionTexts).toEqual(['Approve', 'Cancel', 'Delete', 'Add Card to Insights']);

            await tableSettings.moveActionUp(1);

            actionTexts = await tableSettings.getActionSettingsTexts();
            expect(actionTexts).toEqual(['Cancel', 'Approve', 'Delete', 'Add Card to Insights']);

            await tableSettings.actionSettingsDialog.getByRole('button').filter({ hasText: 'OK' }).click();

            await editor.toolbar.saveButton.click();
            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect(page.getByTestId('saved-changes-stack')).toBeVisible();
            const changes = await page.getByTestId('saved-changes-stack').getByText('Move Action Change').all();
            expect(changes.length).toBe(1);
        }
    );
});
