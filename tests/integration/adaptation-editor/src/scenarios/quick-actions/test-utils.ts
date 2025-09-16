import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { expect, type FrameLocator, type Page, type Locator } from '@sap-ux-private/playwright';
import { gte } from 'semver';

interface Changes {
    annotations: Record<string, string>;
    coding: Record<string, string>;
    fragments: Record<string, string>;
    changes: object[];
}

/**
 * Class representing a List Report in the Adaptation Editor.
 */
export class ListReport {
    private readonly frame: FrameLocator;
    private readonly ui5Version: string;
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
     * Returns a locator for the specified table row in the List Report.
     *
     * @param index - The index of the table row.
     * @returns Locator for the "Table Row".
     */
    locatorForListReportTableRow(index: number): Locator {
        const dataRows = this.frame.locator('tbody > tr');
        return dataRows.nth(index).locator('.sapMListTblNavCol').first();
    }
    /**
     * @param frame - FrameLocator for the List Report.
     */
    constructor(frame: FrameLocator) {
        this.frame = frame;
    }
}

/**
 * Class representing the table settings dialog in the Adaptation Editor.
 */
export class TableSettings {
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
     * @returns Locator for the table settings dialog.
     */
    get actionSettingsDialog(): Locator {
        return this.frame.getByLabel('Rearrange Toolbar Content');
    }
    /**
     * @returns Locator for the table settings dialog.
     */
    get tableActionsSettingsDialog(): Locator {
        return this.actionSettingsDialog;
    }
    /**
     * Returns an array of all visible texts in the first column of the rearrange toolbar content table.
     *
     * @returns {Promise<string[]>} An array of visible texts from the first column.
     */
    async getActionSettingsTexts(): Promise<string[]> {
        const rows = this.actionSettingsDialog.locator('tbody > tr:not(.sapMListTblHeader)');
        const count = await rows.count();
        const texts: string[] = [];
        for (let i = 0; i < count; i++) {
            const cell = rows.nth(i).locator('td').nth(1);
            texts.push((await cell.innerText()).trim());
        }
        return texts;
    }
    /**
     * Moves an action up by clicking the "Move Up" button in the specified row.
     *
     * @param index - The zero-based index of the action to move up.
     */
    async moveActionUp(index: number): Promise<void> {
        const rows = this.actionSettingsDialog.locator('tbody > tr:not(.sapMListTblHeader)');
        await rows.nth(index).hover();
        await rows.nth(index).getByRole('button', { name: 'Move Up' }).click();
    }
    /**
     * Moves an action down by clicking the "Move Down" button in the specified row.
     *
     * @param index - The zero-based index of the action to move down.
     */
    async moveActionDown(index: number): Promise<void> {
        const rows = this.actionSettingsDialog.locator('tbody > tr:not(.sapMListTblHeader)');
        await rows.nth(index).hover();
        await rows.nth(index).getByRole('button', { name: 'Move Down' }).click();
    }
    /**
     * @param frame - FrameLocator for the dialog.
     */
    constructor(frame: FrameLocator) {
        this.frame = frame;
    }
}

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
     * @returns Locator for the button to show the local annotation file.
     */
    get showLocalAnnotationFile(): Locator {
        return this.page.getByRole('button', { name: 'Show Local Annotation File' });
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
     * @returns Locator for the button to change Table Actions.
     */
    get changeTableActions(): Locator {
        return this.page.getByRole('button', { name: 'Change Table Actions' });
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
     * @returns Locator for the button to enable variant management in tables.
     */
    get enableOPVariantManagementInTable(): Locator {
        return this.page.getByRole('button', { name: 'Enable Variant Management in Tables' });
    }
    /**
     * @returns Locator for the button to enable empty row mode for tables.
     */
    get enableEmptyRowMode(): Locator {
        return this.page.getByRole('button', { name: 'Enable Empty Row Mode for Tables' });
    }
    /**
     * @returns Locator for the button to Add Header Field.
     */
    get addHeaderField(): Locator {
        return this.page.getByRole('button', { name: 'Add Header Field' });
    }
    /**
     * @returns Locator for the button to Add Custom Section.
     */
    get addCustomSection(): Locator {
        return this.page.getByRole('button', { name: 'Add Custom Section' });
    }
    /**
     * @returns Locator for the button to Add Local Annotation File.
     */
    get addLocalAnnotationFile(): Locator {
        return this.page.getByRole('button', { name: 'Add Local Annotation File' });
    }

    /**
     *
     * @param page
     */
    constructor(page: Page) {
        this.page = page;
    }
}

/**
 * Class representing the ADP Toolbar.
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
export class AdaptationEditorShell {
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
 * Class representing a dialog in the Adaptation Editor.
 */
export class AdpDialog {
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
 * Read changes from the changes folder in the project.
 *
 * @param root - Root directory of the project.
 * @returns Promise resolving to an object containing annotations, coding, fragments, and changes.
 */
export async function readChanges(root: string): Promise<Changes> {
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
