import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import { expect, type FrameLocator, type Page, type Locator } from '@sap-ux-private/playwright';
import { gte, lt, satisfies } from 'semver';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

/**
 * Class representing the quick action panel in the Adaptation Editor.
 */
class QuickActionPanel {
    private readonly page: Page;

    /**
     * @returns Locator for the button to add a controller to the page.
     */
    get addControllerToPage(): Locator {
        return this.page.getByRole('button', { name: 'Add Controller to Page' });
    }

    /**
     * @returns Locator for the button to show the page controller.
     */
    get showPageController(): Locator {
        return this.page.getByRole('button', { name: 'Show Page Controller' });
    }

    /**
     * @returns Locator for the button to enable the "Clear" button in the filter bar.
     */
    get enableClearButton(): Locator {
        return this.page.getByRole('button', { name: 'Enable "Clear" Button in Filter Bar' });
    }

    /**
     * @returns Locator for the button to disable the "Clear" button in the filter bar.
     */
    get disableClearButton(): Locator {
        return this.page.getByRole('button', { name: 'Disable "Clear" Button in Filter Bar' });
    }

    /**
     * @returns Locator for the button to enable the semantic date range in the filter bar.
     */
    get enableSemanticDateRange(): Locator {
        return this.page.getByRole('button', { name: 'Enable Semantic Date Range in Filter Bar' });
    }

    /**
     * @returns Locator for the button to disable the semantic date range in the filter bar.
     */
    get disableSemanticDateRange(): Locator {
        return this.page.getByRole('button', { name: 'Disable Semantic Date Range in Filter Bar' });
    }

    /**
     * @returns Locator for the button to change table columns.
     */
    get changeTableColumns(): Locator {
        return this.page.getByRole('button', { name: 'Change Table Columns' });
    }

    /**
     * @returns Locator for the button to add a custom table action.
     */
    get addCustomTableAction(): Locator {
        return this.page.getByRole('button', { name: 'Add Custom Table Action' });
    }

    /**
     * @returns Locator for the button to add a custom table column.
     */
    get addCustomTableColumn(): Locator {
        return this.page.getByRole('button', { name: 'Add Custom Table Column' });
    }

    /**
     * @returns Locator for the button to enable variant management in tables and charts.
     */
    get enableVariantManagementInTablesAndCharts(): Locator {
        return this.page.getByRole('button', { name: 'Enable Variant Management in Tables and Charts' });
    }

    /**
     * @param page - Page object for the quick action panel.
     */
    constructor(page: Page) {
        this.page = page;
    }
}

/**
 *
 */
class Toolbar {
    private readonly page: Page;
    /**
     * @returns Locator for the "Save" button.
     */
    get saveButton(): Locator {
        return this.page.getByRole('button', { name: 'Save' });
    }
    /**
     * @returns Locator for the "Save and Reload" button.
     */
    get saveAndReloadButton(): Locator {
        return this.page.getByRole('button', { name: 'Save and Reload' });
    }
    /**
     * @returns Locator for the "UI Adaptation" mode button.
     */
    get uiAdaptationModeButton(): Locator {
        return this.page.getByRole('button', { name: 'UI Adaptation' });
    }
    /**
     * @returns Locator for the "Navigation" mode button.
     */
    get navigationModeButton(): Locator {
        return this.page.getByRole('button', { name: 'Navigation' });
    }
    /**
     * @param page - Page object for the toolbar.
     */
    constructor(page: Page) {
        this.page = page;
    }
}
/**
 * Class representing the Changes Panel in the Adaptation Editor.
 */
class ChangesPanel {
    private readonly page: Page;
    /**
     * @returns Locator for the "Reload" button.
     */
    get reloadButton(): Locator {
        return this.page.getByRole('link', { name: 'Reload' });
    }
    /**
     * @param page - Page object for the Changes Panel.
     */
    constructor(page: Page) {
        this.page = page;
    }
}

/**
 * Class representing the Adaptation Editor shell.
 */
class AdaptationEditorShell {
    private readonly page: Page;
    private readonly ui5Version: string;
    readonly quickActions: QuickActionPanel;
    readonly toolbar: Toolbar;
    readonly changesPanel: ChangesPanel;

    async reloadCompleted(): Promise<void> {
        await expect(this.toolbar.uiAdaptationModeButton).toBeEnabled({ timeout: 15_000 });
    }
    /**
     * @param page - Page object for the Adaptation Editor.
     * @param ui5Version - UI5 version.
     */
    constructor(page: Page, ui5Version: string) {
        this.ui5Version = ui5Version;
        this.page = page;
        this.quickActions = new QuickActionPanel(page);
        this.toolbar = new Toolbar(page);
        this.changesPanel = new ChangesPanel(page);
    }
}

/**
 * Class representing a List Report in the Adaptation Editor.
 */
class ListReport {
    private readonly frame: FrameLocator;
    /**
     * @returns Locator for the "Go" button.
     */
    get goButton(): Locator {
        return this.frame.getByRole('button', { name: 'Go' });
    }

    /**
     * @returns Locator for the "Clear" button.
     */
    get clearButton(): Locator {
        return this.frame.getByRole('button', { name: 'Clear' });
    }
    /**
     * @param frame - FrameLocator for the List Report.
     */
    constructor(frame: FrameLocator) {
        this.frame = frame;
    }
}

/**
 * Class representing a dialog in the Adaptation Editor.
 */
class AdpDialog {
    private readonly frame: FrameLocator;
    private readonly ui5Version: string;
    /**
     * @returns Locator for the "Create" button in the dialog.
     */
    get createButton(): Locator {
        if (gte(this.ui5Version, '1.120.0')) {
            return this.frame.getByLabel('Footer actions').getByRole('button', { name: 'Create' });
        } else {
            return this.frame.locator('#createDialogBtn');
        }
    }

    /**
     * @param frame - FrameLocator for the dialog.
     * @param ui5Version - UI5 version.
     */
    constructor(frame: FrameLocator, ui5Version: string) {
        this.frame = frame;
        this.ui5Version = ui5Version;
    }
}

/**
 * Class representing the table settings dialog in the Adaptation Editor.
 */
class TableSettings {
    private readonly frame: FrameLocator;
    /**
     * @returns Locator for the dialog containing table settings.
     */
    get dialog(): Locator {
        return this.frame.getByLabel('View Settings');
    }
    /**
     * @returns Locator for the table settings dialog.
     */
    get tableSettingsDialog(): Locator {
        return this.dialog;
    }
    /**
     * @param frame - FrameLocator for the dialog.
     */
    constructor(frame: FrameLocator) {
        this.frame = frame;
    }
}

interface Changes {
    annotations: Record<string, string>;
    coding: Record<string, string>;
    fragments: Record<string, string>;
    changes: object[];
}

/**
 * Read changes from the changes folder in the project.
 *
 * @param root - Root directory of the project.
 * @returns Promise resolving to an object containing annotations, coding, fragments, and changes.
 */
async function readChanges(root: string): Promise<Changes> {
    const changesDirectory = join(root, 'webapp', 'changes');
    const result: Changes = {
        annotations: {},
        coding: {},
        fragments: {},
        changes: []
    };
    try {
        const files = await readdir(changesDirectory, { withFileTypes: true });
        for (const file of files) {
            try {
                if (file.isFile()) {
                    const text = await readFile(join(changesDirectory, file.name), { encoding: 'utf-8' });
                    result.changes.push(JSON.parse(text) as object);
                } else if (file.name === 'annotations' || file.name === 'coding' || file.name === 'fragments') {
                    const children = await readdir(join(changesDirectory, file.name), { withFileTypes: true });
                    for (const child of children) {
                        if (child.isFile()) {
                            result[file.name][child.name] = await readFile(
                                join(changesDirectory, file.name, child.name),
                                {
                                    encoding: 'utf-8'
                                }
                            );
                        }
                    }
                }
            } catch (e) {
                // ignore error
            }
        }
    } catch (e) {
        // ignore error
    }
    return result;
}

test.describe(`@quick-actions @fe-v2 @list-report`, () => {
    test('Enable/Disable clear filter bar button', {}, async ({ page, previewFrame, ui5Version, projectCopy }) => {
        const lr = new ListReport(previewFrame);
        const editor = new AdaptationEditorShell(page, ui5Version);

        await editor.reloadCompleted();
        await expect(lr.clearButton).toBeHidden();

        await editor.quickActions.enableClearButton.click();

        await expect(lr.clearButton).toBeVisible();

        await editor.toolbar.saveButton.click();

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
                            changeType: 'propertyChange',
                            content: expect.objectContaining({ property: 'showClearOnFB', newValue: true })
                        })
                    ])
                })
            );
        await editor.quickActions.disableClearButton.click();

        await expect(lr.clearButton).toBeHidden();

        await editor.toolbar.saveButton.click();

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
                            changeType: 'propertyChange',
                            content: expect.objectContaining({ property: 'showClearOnFB', newValue: false })
                        })
                    ])
                })
            );
    });

    test(
        'Add controller to page',
        {
            annotation: {
                type: 'skipUI5Version',
                // TODO: 1.84 and 1.96 there is an error when saving changes
                description: '~1.134.0 || ~1.135.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const lr = new ListReport(previewFrame);
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.addControllerToPage.click();

            await previewFrame.getByRole('textbox', { name: 'Controller Name' }).fill('TestController');
            await dialog.createButton.click();

            if (lt(ui5Version, '1.136.0')) {
                await expect(page.getByText('Changes detected!')).toBeVisible();
            } else {
                await editor.toolbar.saveButton.click();
            }

            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        coding: expect.objectContaining({
                            ['TestController.js']: expect.stringMatching(
                                /ControllerExtension\.extend\("adp\.fiori\.elements\.v2\.TestController"/
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'codeExt',
                                content: expect.objectContaining({ codeRef: 'coding/TestController.js' })
                            })
                        ])
                    })
                );

            await expect
                .poll(
                    async () => {
                        const changesDirectory = join(projectCopy, 'webapp', 'changes', 'coding');
                        const codingChanges = await readdir(changesDirectory);
                        return codingChanges.length;
                    },
                    {
                        message: 'make sure controller file is created',
                        timeout: 4_000
                    }
                )
                .toEqual(1);

            await editor.changesPanel.reloadButton.click();

            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted();

            await editor.quickActions.showPageController.click();

            await expect(
                previewFrame.getByText('adp.fiori.elements.v2/changes/coding/TestController.js')
            ).toBeVisible();

            await expect(previewFrame.getByRole('button', { name: 'Open in VS Code' })).toBeVisible();
        }
    );

    test(
        'Change table columns',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, ui5Version }) => {
            const tableSettings = new TableSettings(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.changeTableColumns.click();

            await expect(tableSettings.tableSettingsDialog.getByText('String Property')).toBeVisible();
            await expect(tableSettings.tableSettingsDialog.getByText('Boolean Property')).toBeVisible();
            await expect(tableSettings.tableSettingsDialog.getByText('Currency')).toBeVisible();
        }
    );

    test(
        'Add Custom Table Action',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.quickActions.addCustomTableAction.click();

            await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('table-action');
            await dialog.createButton.click();

            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        fragments: expect.objectContaining({
                            'table-action.fragment.xml': expect.stringMatching(
                                new RegExp(`<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Button text="New Button"  id="btn-[a-z0-9]+"></Button>
</core:FragmentDefinition>
`)
                            )
                        }),
                        changes: expect.arrayContaining([
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    targetAggregation: 'content',
                                    fragmentPath: 'fragments/table-action.fragment.xml'
                                })
                            })
                        ])
                    })
                );
        }
    );

    test(
        'Add Custom Table Column',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const dialog = new AdpDialog(previewFrame, ui5Version);
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            if (await editor.quickActions.addCustomTableColumn.isDisabled()) {
                await editor.toolbar.navigationModeButton.click();
                await lr.goButton.click();
                await editor.toolbar.uiAdaptationModeButton.click();
            }

            await editor.quickActions.addCustomTableColumn.click();

            await previewFrame.getByRole('textbox', { name: 'Column Fragment Name' }).fill('table-column');
            await previewFrame.getByRole('textbox', { name: 'Cell Fragment Name' }).fill('table-cell');
            await dialog.createButton.click();

            await editor.toolbar.saveAndReloadButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect
                .poll(async () => readChanges(projectCopy), {
                    message: 'make sure change file is created'
                })
                .toEqual(
                    expect.objectContaining({
                        fragments: expect.objectContaining({
                            'table-cell.fragment.xml': expect.stringMatching(
                                new RegExp(`<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
    <Text id="cell-text-[a-z0-9]+" text="Sample data" />
</core:FragmentDefinition>`)
                            ),
                            'table-column.fragment.xml': expect.stringMatching(
                                new RegExp(`<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!--  add your xml here -->
     <Column id="column-[a-z0-9]+"
        width="12em"
        hAlign="Left"
        vAlign="Middle">
        <Text id="column-title-[a-z0-9]+" text="New column" />

        <customData>
            <core:CustomData key="p13nData" id="custom-data-[a-z0-9]+"
                value='\\\\{"columnKey": "column-[a-z0-9]+", "columnIndex": "3"}' />
        </customData>
    </Column>
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
                            }),
                            expect.objectContaining({
                                fileType: 'change',
                                changeType: 'addXML',
                                content: expect.objectContaining({
                                    boundAggregation: 'items',
                                    targetAggregation: 'cells',
                                    fragmentPath: 'fragments/table-cell.fragment.xml'
                                })
                            })
                        ])
                    })
                );

            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();
            await lr.goButton.click();
            await expect(previewFrame.getByRole('columnheader', { name: 'New column' }).locator('div')).toBeVisible();
            if (satisfies(ui5Version, '<1.120.0')) {
                await expect(previewFrame.getByRole('cell', { name: 'Sample data' })).toBeVisible();
            } else {
                await expect(previewFrame.getByRole('gridcell', { name: 'Sample data' })).toBeVisible();
            }
        }
    );

    test(
        'Enable/Disable Semantic Date Range in Filter Bar',
        {
            annotation: {
                type: 'skipUI5Version',
                // TODO: it is supposed to work in 1.96 as well, but by default semantic date is disabled unlike other versions
                // and quick action does not work correctly
                description: '<1.108.0'
            }
        },
        async ({ page, previewFrame, projectCopy, ui5Version }) => {
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page, ui5Version);

            await editor.toolbar.navigationModeButton.click();
            if (satisfies(ui5Version, '~1.96.0')) {
                await previewFrame.getByTitle('Open Picker').click();
            } else {
                // click on second filter value help
                await previewFrame
                    .locator(
                        '[id="fiori\\.elements\\.v2\\.0\\:\\:sap\\.suite\\.ui\\.generic\\.template\\.ListReport\\.view\\.ListReport\\:\\:RootEntity--listReportFilter-filterItemControl_BASIC-DateProperty-input-vhi"]'
                    )
                    .click();
            }
            await expect(previewFrame.getByText('Yesterday')).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.disableSemanticDateRange.click();

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
                                changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                content: expect.objectContaining({
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'component/settings/filterSettings/dateSettings',
                                        propertyValue: expect.objectContaining({
                                            useDateRange: false
                                        })
                                    })
                                })
                            })
                        ])
                    })
                );

            await expect(lr.goButton).toBeVisible();
            await editor.reloadCompleted();

            await editor.toolbar.navigationModeButton.click();

            await previewFrame.getByLabel('Open Picker').click();
            await expect(previewFrame.getByRole('button', { name: new Date().getFullYear().toString() })).toBeVisible();
            await editor.toolbar.uiAdaptationModeButton.click();

            await editor.quickActions.enableSemanticDateRange.click();

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
                                changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                content: expect.objectContaining({
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'component/settings/filterSettings/dateSettings',
                                        propertyValue: expect.objectContaining({
                                            useDateRange: true
                                        })
                                    })
                                })
                            })
                        ])
                    })
                );
        }
    );

    test(
        'Enable Variant Management in Tables and Charts',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.96.0'
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
                                changeType: 'appdescr_ui_generic_app_changePageConfiguration',
                                content: expect.objectContaining({
                                    parentPage: expect.objectContaining({
                                        component: 'sap.suite.ui.generic.template.ListReport'
                                    }),
                                    entityPropertyChange: expect.objectContaining({
                                        propertyPath: 'component/settings',
                                        propertyValue: expect.objectContaining({
                                            smartVariantManagement: false
                                        })
                                    })
                                })
                            })
                        ])
                    })
                );
        }
    );
});
