import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import { expect, type FrameLocator, type Page, type Locator } from '@sap-ux-private/playwright';

import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V4 } from '../../project';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V4 });

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

test.describe(`@quick-actions @fe-v4 @list-report`, () => {
    test('Enable/Disable clear filter bar button', {}, async ({ page, previewFrame, ui5Version, projectCopy }) => {
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
});
