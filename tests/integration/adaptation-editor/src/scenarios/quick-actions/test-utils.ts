import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { expect, type Page, type FrameLocator, type Locator } from '@sap-ux-private/playwright';

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
        const dataRows = this.frame.locator('[role="row"]:not(.sapMListTblHeader)');
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
 * Class representing Table Settings in the Adaptation Editor.
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
export class QuickActionPanel {
    private readonly page: Page;
    get addControllerToPage(): Locator {
        return this.page.getByRole('button', { name: 'Add Controller to Page' });
    }
    get showPageController(): Locator {
        return this.page.getByRole('button', { name: 'Show Page Controller' });
    }
    get enableClearButton(): Locator {
        return this.page.getByRole('button', { name: 'Enable "Clear" Button in Filter Bar' });
    }
    get disableClearButton(): Locator {
        return this.page.getByRole('button', { name: 'Disable "Clear" Button in Filter Bar' });
    }
    get enableSemanticDateRange(): Locator {
        return this.page.getByRole('button', { name: 'Enable Semantic Date Range in Filter Bar' });
    }
    get disableSemanticDateRange(): Locator {
        return this.page.getByRole('button', { name: 'Disable Semantic Date Range in Filter Bar' });
    }
    get changeTableColumns(): Locator {
        return this.page.getByRole('button', { name: 'Change Table Columns' });
    }
    get changeTableActions(): Locator {
        return this.page.getByRole('button', { name: 'Change Table Actions' });
    }
    get addCustomTableAction(): Locator {
        return this.page.getByRole('button', { name: 'Add Custom Table Action' });
    }
    get addCustomTableColumn(): Locator {
        return this.page.getByRole('button', { name: 'Add Custom Table Column' });
    }
    get enableVariantManagementInTablesAndCharts(): Locator {
        return this.page.getByRole('button', { name: 'Enable Variant Management in Tables and Charts' });
    }
    get enableEmptyRowMode(): Locator {
        return this.page.getByRole('button', { name: 'Enable Empty Row Mode for Tables' });
    }
    constructor(page: Page) {
        this.page = page;
    }
}

export class Toolbar {
    private readonly page: Page;
    get saveButton(): Locator {
        return this.page.getByRole('button', { name: 'Save' });
    }
    get saveAndReloadButton(): Locator {
        return this.page.getByRole('button', { name: 'Save and Reload' });
    }
    get uiAdaptationModeButton(): Locator {
        return this.page.getByRole('button', { name: 'UI Adaptation' });
    }
    get navigationModeButton(): Locator {
        return this.page.getByRole('button', { name: 'Navigation' });
    }
    constructor(page: Page) {
        this.page = page;
    }
}

export class ChangesPanel {
    private readonly page: Page;
    get reloadButton(): Locator {
        return this.page.getByRole('link', { name: 'Reload' });
    }
    constructor(page: Page) {
        this.page = page;
    }
}

export class AdaptationEditorShell {
    private readonly page: Page;
    private readonly ui5Version: string;
    readonly quickActions: QuickActionPanel;
    readonly toolbar: Toolbar;
    readonly changesPanel: ChangesPanel;
    async reloadCompleted(): Promise<void> {
        await expect(this.toolbar.uiAdaptationModeButton).toBeEnabled({ timeout: 15_000 });
    }
    constructor(page: Page, ui5Version: string) {
        this.ui5Version = ui5Version;
        this.page = page;
        this.quickActions = new QuickActionPanel(page);
        this.toolbar = new Toolbar(page);
        this.changesPanel = new ChangesPanel(page);
    }
}

export class AdpDialog {
    private readonly frame: FrameLocator;
    private readonly ui5Version: string;
    get createButton(): Locator {
        if (this.ui5Version && this.ui5Version >= '1.120.0') {
            return this.frame.getByLabel('Footer actions').getByRole('button', { name: 'Create' });
        } else {
            return this.frame.locator('#createDialogBtn');
        }
    }
    constructor(frame: FrameLocator, ui5Version: string) {
        this.frame = frame;
        this.ui5Version = ui5Version;
    }
}

/**
 * Read changes from the changes folder in the project.
 *
 * @param root - The root directory of the project.
 * @returns An object containing the parsed changes.
 */
export async function readChanges(root: string): Promise<any> {
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
                    result.changes.push(JSON.parse(text));
                }
            } catch (e) {
                // ignore error
            }
        }
    } catch (e) {
        // ignore err
    }
    return result;
}
