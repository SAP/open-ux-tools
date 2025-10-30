import { readdir, readFile } from 'fs/promises';
import { join } from 'node:path';
import { expect, test, type FrameLocator, type Page, type Locator } from '@sap-ux-private/playwright';
import { gte } from 'semver';
import { readdirSync } from 'node:fs';

interface Changes {
    annotations: Record<string, string>;
    coding: Record<string, string | RegExp>;
    fragments: Record<string, string>;
    changes: object[];
}

export const Selection = {
    show_common_only: 'show_common_only',
    focus_editable: 'focus_editable',
    All: 'all'
};

export const Selector = {
    show_common_only: '[id=list-outline] [class=tree-row]',
    focus_editable: 'span.tree-cell'
};

/**
 * Creates a locator for a button element with description for better test reporting.
 *
 * @param page - Page or FrameLocator to search within
 * @param name - Name of the button to locate
 * @param context - Context description for the button (e.g., 'Quick Actions Panel')
 * @returns Locator for the button with added description
 */
export function getButtonLocator(page: Page | FrameLocator, name: string, context: string): Locator {
    return page.getByRole('button', { name }).describe(`\`${name}\` button in the ${context}`);
}

/**
 * Class representing a List Report in the Adaptation Editor.
 */
export class ListReport {
    private readonly frame: FrameLocator;
    private readonly feVersion: 'fev2' | 'fev4';
    private readonly context: string = 'Running Application Preview';
    /**
     * @returns Locator for the "Go" button.
     */
    get goButton(): Locator {
        return getButtonLocator(this.frame, 'Go', this.context);
    }
    /**
     * @returns Locator for the "Clear" button.
     */
    get clearButton(): Locator {
        return getButtonLocator(this.frame, 'Clear', this.context);
    }

    get createButton(): Locator {
        return getButtonLocator(this.frame, 'Create', this.context);
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
     * Clicks on the go button.
     *
     * @param buttonText - The text of the button to click.
     */
    async clickOnButton(buttonText: string = 'Go'): Promise<void> {
        await test.step(`Click on \`${buttonText}\` button.`, async () => {
            //await this.goButton.click();
            const locator = this.getButtonByLabel(buttonText);
            await locator.click();
        });
    }
    /**
     * Clicks on the specified row in the List Report table.
     *
     * @param index - table row index
     */
    async clickOnTableNthRow(index: number): Promise<void> {
        const tableTitle = await this.getTableTitleText();
        // Extract only the string part before parentheses (e.g., "Root Entities" from "Root Entities (2)")
        const match = tableTitle.match(/^(.+?)\s*\(/);
        const tableName = match ? match[1] : tableTitle;
        await test.step(`Click on row \`${index + 1}\` of \`${tableName}\` table `, async () => {
            await this.locatorForListReportTableRow(index).click();
        });
    }

    /**
     * @returns Locator for the table title/header.
     */
    get tableTitle(): Locator {
        if (this.feVersion === 'fev4') {
            return this.frame.locator('.sapMListHdr .sapMTitle');
        }
        return this.frame.locator('.sapMTitle.sapUiCompSmartTableHeader');
    }

    /**
     * Gets the table title text.
     *
     * @returns Promise resolving to the table title text.
     */
    async getTableTitleText(): Promise<string> {
        return (await this.tableTitle.textContent()) ?? '';
    }

    /**
     * @param text - control label to check.
     * @returns Locator for the given text in the List Report.
     */

    getButtonByLabel(text: string): Locator {
        return this.frame.getByRole('button', { name: text });
    }

    /**
     * @param label - control label to check.
     */
    async checkControlLabel(label: string): Promise<void> {
        await test.step(`Check control's label is \`${label}\` in the \`${this.context}\``, async () => {
            const value = await this.getButtonByLabel(label).innerText();
            expect(value).toStrictEqual(label);
        });
    }

    /**
     * Clicks on the control overlay for the specified control label.
     *
     * @param text - The label of the control to click on.
     * @param button - The mouse button to use for the click action ('left', 'right', or 'middle'). Default is 'left'.
     */

    async clickOnControlOverlay(text: string, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
        const clickedButton = button === 'left' ? 'Click' : 'Right Click';
        await test.step(`${clickedButton} on \`${text}\` in the \`${this.context}\``, async () => {
            const controlLocator = this.getButtonByLabel(text);
            const controlId = await controlLocator.getAttribute('id');
            const escaped = controlId!.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
            const overlayLocator = this.frame.locator(`[data-sap-ui-dt-for="${escaped}"]`);
            await overlayLocator.click({
                button: button
            });
        });
    }

    /**
     * Clicks on an item in the context menu.
     *
     * @param itemText - The text of the context menu item to click.
     * @returns Locator for the context menu item.
     */
    getContextMenuItem(itemText: string): Locator {
        return this.frame.getByText(itemText).describe(`\`${itemText}\` item in the context menu`);
    }

    /**
     * @param label - control label to check.
     */
    async checkControlHasOverlay(label: string): Promise<void> {
        await test.step(`Check control with label \`${label}\` has \`Overlay\` in the \`${this.context}\``, async () => {
            const overlayLocator = this.frame.locator('[class*="sapUiDtOverlaySelected"]');
            await expect(overlayLocator).toBeVisible();
            const overlayFor = await overlayLocator.getAttribute('data-sap-ui-dt-for');
            const escape = overlayFor!.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
            const controlLocator = this.frame.locator(`#${escape}`);
            await expect(controlLocator).toBeVisible();
            const controlText = await controlLocator.innerText();
            expect(controlText).toContain(label);
        });
    }

    /**
     * Checks if the List Report app is loaded in the preview iframe.
     *
     *  @return Promise that resolves when the app is loaded.
     */
    async checkAppLoaded(): Promise<void> {
        await test.step(`Check app rendered in the preview iframe \`${this.context}\``, async () => {
            await this.frame
                .locator(
                    `[id="fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--listReportFilter"]`
                )
                .waitFor({ state: 'visible' });
        });
    }

    /**
     * @param frame - FrameLocator for the List Report.
     * @param feVersion - The Fiori Elements version, either 'fev2' or 'fev4'. Defaults to 'fev2'.
     */
    constructor(frame: FrameLocator, feVersion: 'fev2' | 'fev4' = 'fev2') {
        this.frame = frame;
        this.feVersion = feVersion;
    }
}

/**
 * Class representing the table settings dialog in the Adaptation Editor.
 */
export class TableSettings {
    private readonly frame: FrameLocator;
    private dialogName: string;
    private feVersion: 'fev2' | 'fev4';
    /**
     * @returns Locator for the dialog containing table settings.
     */
    get dialog(): Locator {
        return this.frame.getByLabel(this.dialogName);
    }

    /**
     * Returns an array of all visible texts in the first column of the rearrange toolbar content table.
     *
     * @returns {Promise<string[]>} An array of visible texts from the first column.
     */
    async getSettingsTexts(): Promise<string[]> {
        if (this.feVersion === 'fev4') {
            const rows = this.dialog.locator('tbody > tr');
            const count = await rows.count();
            const texts: string[] = [];
            for (let i = 0; i < count; i++) {
                const row = rows.nth(i);
                // skip group/header rows
                const roleDesc = await row.getAttribute('aria-roledescription');
                if (roleDesc === 'Group Row') {
                    continue;
                }
                const bdi = row.locator('bdi');
                if ((await bdi.count()) === 0) {
                    continue;
                }
                texts.push((await bdi.first().innerText()).trim());
            }
            return texts;
        }
        const rows = this.dialog.locator('tbody > tr:not(.sapMListTblHeader)');
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
        let rows;
        let modifiedIndex = index;
        if (this.feVersion === 'fev4') {
            modifiedIndex = index + 1; // adjust for header row
            rows = this.dialog.locator('tbody > tr');
        } else {
            rows = this.dialog.locator('tbody > tr:not(.sapMListTblHeader)');
        }
        await test.step(`Hover over row \`${index + 1}\` and click on \`Move up\` button in the row of \`${
            this.dialogName
        }\` table`, async () => {
            await rows.nth(modifiedIndex).hover();
            await rows.nth(modifiedIndex).getByRole('button', { name: 'Move Up' }).click();
        });
    }
    /**
     * Confirm or cancel the dialog.
     *
     * @param text - Dialog's confirm button text.
     */
    async closeOrConfirmDialog(text = 'OK'): Promise<void> {
        await test.step(`Click on \`${text}\` button of the dialog \`${this.dialogName}\``, async () => {
            await this.dialog.getByRole('button', { name: 'OK' }).click();
        });
    }

    /**
     * @param frame - FrameLocator for the dialog.
     * @param dialogName - Name of the dialog.
     * @param feVersion - The Fiori Elements version, either 'fev2' or 'fev4'. Defaults to 'fev2'.
     */
    constructor(frame: FrameLocator, dialogName = 'View Settings', feVersion: 'fev2' | 'fev4' = 'fev2') {
        this.frame = frame;
        this.dialogName = dialogName;
        this.feVersion = feVersion;
    }

    /**
     * Moves an action down by clicking the "Move Down" button in the specified row.
     *
     * @param index - The zero-based index of the action to move down.
     */
    async moveActionDown(index: number): Promise<void> {
        let rows;
        if (this.feVersion === 'fev4') {
            rows = this.dialog.locator('tbody > tr');
        } else {
            rows = this.dialog.locator('tbody > tr:not(.sapMListTblHeader)');
        }

        await test.step(`Hover over row \`${index + 1}\` and click on Move down button in the row of \`${
            this.dialogName
        }\` table`, async () => {
            await rows.nth(index).hover();
            await rows.nth(index).getByRole('button', { name: 'Move Down' }).click();
        });
    }
    /**
     * Checks given elements are visible.
     *
     * @param texts - list of texts to checked.
     */
    async expectItemsToBeVisible(texts: string[]): Promise<void> {
        const textsList = texts.join(', ');
        await test.step(`Check \`${textsList}\` exist in the \`${this.dialogName}\` dialog`, async () => {
            for (const text of texts) {
                await expect(this.dialog.getByText(text)).toBeVisible();
            }
        });
    }
}

/**
 * Class representing the quick action panel in the Adaptation Editor.
 */
class QuickActionPanel {
    private readonly page: Page;
    private readonly context: string = `Quick Actions Panel`;

    /**
     * Helper method to get a button locator with description.
     *
     * @param name - Button name/label
     * @returns Locator with description
     */
    private getButtonLocator(name: string): Locator {
        return getButtonLocator(this.page, name, this.context);
    }

    /**
     * @returns Locator for the button to add a controller to the page.
     */
    get addControllerToPage(): Locator {
        return this.getButtonLocator('Add Controller to Page');
    }

    /**
     * @returns Locator for the button to show the page controller.
     */
    get showPageController(): Locator {
        return this.getButtonLocator('Show Page Controller');
    }

    /**
     * @returns Locator for the button to show the local annotation file.
     */
    get showLocalAnnotationFile(): Locator {
        return this.getButtonLocator('Show Local Annotation File');
    }

    /**
     * @returns Locator for the button to enable the "Clear" button in the filter bar.
     */
    get enableClearButton(): Locator {
        return this.getButtonLocator('Enable "Clear" Button in Filter Bar');
    }

    /**
     * @returns Locator for the button to disable the "Clear" button in the filter bar.
     */
    get disableClearButton(): Locator {
        return this.getButtonLocator('Disable "Clear" Button in Filter Bar');
    }

    /**
     * @returns Locator for the button to enable the semantic date range in the filter bar.
     */
    get enableSemanticDateRange(): Locator {
        return this.getButtonLocator('Enable Semantic Date Range in Filter Bar');
    }

    /**
     * @returns Locator for the button to disable the semantic date range in the filter bar.
     */
    get disableSemanticDateRange(): Locator {
        return this.getButtonLocator('Disable Semantic Date Range in Filter Bar');
    }

    /**
     * @returns Locator for the button to change table columns.
     */
    get changeTableColumns(): Locator {
        return this.getButtonLocator('Change Table Columns');
    }
    /**
     * @returns Locator for the button to change Table Actions.
     */
    get changeTableActions(): Locator {
        return this.getButtonLocator('Change Table Actions');
    }

    /**
     * @returns Locator for the button to add a custom table action.
     */
    get addCustomTableAction(): Locator {
        return this.getButtonLocator('Add Custom Table Action');
    }

    /**
     * @returns Locator for the button to add a custom table column.
     */
    get addCustomTableColumn(): Locator {
        return this.getButtonLocator('Add Custom Table Column');
    }

    /**
     * @returns Locator for the button to enable variant management in tables and charts.
     */
    get enableVariantManagementInTablesAndCharts(): Locator {
        return this.getButtonLocator('Enable Variant Management in Tables and Charts');
    }
    /**
     * @returns Locator for the button to enable variant management in tables.
     */
    get enableOPVariantManagementInTable(): Locator {
        return this.getButtonLocator('Enable Variant Management in Tables');
    }
    /**
     * @returns Locator for the button to enable empty row mode for tables.
     */
    get enableEmptyRowMode(): Locator {
        return this.getButtonLocator('Enable Empty Row Mode for Tables');
    }
    /**
     * @returns Locator for the button to Add Header Field.
     */
    get addHeaderField(): Locator {
        return this.getButtonLocator('Add Header Field');
    }
    /**
     * @returns Locator for the button to Add Custom Section.
     */
    get addCustomSection(): Locator {
        return this.getButtonLocator('Add Custom Section');
    }
    /**
     * @returns Locator for the button to Add Local Annotation File.
     */
    get addLocalAnnotationFile(): Locator {
        return this.getButtonLocator('Add Local Annotation File');
    }
    /**
     * @returns Locator for the button to Add Subpage.
     */
    get addSubPage(): Locator {
        return this.getButtonLocator('Add Subpage');
    }

    /**
     * Constructor for QuickActionPanel.
     *
     * @param page - Page object.
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
    private readonly context: string = 'toolBar';
    /**
     * @returns Locator for the "Undo" button.
     */
    get undoButton(): Locator {
        return getButtonLocator(this.page, 'Undo', this.context);
    }
    /**
     * @returns Locator for the "Redo" button.
     */
    get redoButton(): Locator {
        return getButtonLocator(this.page, 'Redo', this.context);
    }
    /**
     * @returns Locator for the "Save" button.
     */
    get saveButton(): Locator {
        return getButtonLocator(this.page, 'Save', this.context);
    }
    /**
     * @returns Locator for the "Save and Reload" button.
     */
    get saveAndReloadButton(): Locator {
        return getButtonLocator(this.page, 'Save and Reload', this.context);
    }
    /**
     * @returns Locator for the "UI Adaptation" mode button.
     */
    get uiAdaptationModeButton(): Locator {
        return getButtonLocator(this.page, 'UI Adaptation', this.context);
    }
    /**
     * @returns Locator for the "Navigation" mode button.
     */
    get navigationModeButton(): Locator {
        return getButtonLocator(this.page, 'Navigation', this.context);
    }

    /**
     * @returns Locator for the "Zoom Out" button.
     */
    get zoomOutButton(): Locator {
        return getButtonLocator(this.page, 'Zoom Out', this.context);
    }
    /**
     * @returns Locator for the "Zoom In" button.
     */
    get zoomInButton(): Locator {
        return getButtonLocator(this.page, 'Zoom In', this.context);
    }

    /**
     * Changes the preview scale by selecting the specified scale from the combobox.
     *
     * @param scale - The scale value to select (e.g., '100%', '75%').
     */
    async changePreviewScale(scale: string): Promise<void> {
        await test.step(`Change preview scale to \`${scale}\` in the \`${this.context}\``, async () => {
            const comboBox = await this.page
                .getByTestId('testId-view-changer-combobox')
                .locator('button')
                .describe('Scale combobox in the toolbar');
            await comboBox.click();
            const option = this.page
                .getByRole('option', { name: scale })
                .describe(`\`${scale}\` option in the Scale combobox`);
            await option.click();
        });
    }

    async getCurrentPreviewScale(): Promise<string> {
        const comboBox = this.page
            .getByTestId('testId-view-changer-combobox')
            .describe('Scale combobox in the toolbar');
        return await comboBox.locator('input').inputValue();
    }

    /**
     * Checks if the "Save" button is disabled.
     *
     * @returns Promise that resolves when the "Save" button is verified to be disabled.
     */
    async isDisabled(): Promise<void> {
        return await expect(this.saveButton, `Check \`Save\` button in the toolbar is disabled`).toBeDisabled();
    }

    /**
     * Checks if the "Undo" button is disabled.
     *
     * @returns Promise that resolves when the "Save" button is verified to be disabled.
     */
    async isUndoDisabled(): Promise<void> {
        return await expect(this.undoButton, `Check \`Undo\` button in the toolbar is disabled`).toBeDisabled();
    }
    /**
     * Checks if the "Undo" button is enabled.
     *
     * @returns Promise that resolves when the "Save" button is verified to be disabled.
     */
    async isUndoEnabled(): Promise<void> {
        return await expect(this.undoButton, `Check \`Undo\` button in the toolbar is enabled`).toBeEnabled();
    }
    /**
     * Selects a theme from the theme selector in the toolbar.
     *
     * @param theme - The name of the theme to select.
     */
    async selectTheme(theme: string): Promise<void> {
        // click setting icon
        await this.page
            .locator(`i[data-icon-name="themePainter"]`)
            .describe(`\`themePainter\` icon to open the Theme Selector Callout`)
            .click();
        await this.page
            .getByRole('button', { name: theme })
            .describe(`on  \`${theme}\` theme button in the Theme Selector Callout`)
            .click();
        await this.page
            .locator(`i[data-icon-name="themePainter"]`)
            .describe(`\`themePainter\` icon to close the Theme Selector Callout`)
            .click();
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
    private readonly context: string = 'Changes Panel';

    /**
     * @returns Locator for the "Reload" button.
     */
    get reloadButton(): Locator {
        // This was using 'link' role before, so we need a special case for it
        return this.page.getByRole('link', { name: 'Reload' }).describe('`Reload` link in the Changes Panel');
    }
    /**
     * @param page - Page object for the Changes Panel.
     */
    constructor(page: Page) {
        this.page = page;
    }
    /**
     * Reusable function to check saved changes stack for specific change types.
     *
     * @param page - Page object to search within.
     * @param changeText - Text to search for within the saved-changes-stack.
     * @param expectedCount - Expected number of changes.
     * @returns Promise that resolves when the assertion passes.
     */
    async expectSavedChangesStack(page: Page, changeText: string, expectedCount: number): Promise<void> {
        await test.step(`Check saved changes stack contains \`${expectedCount}\` \`${changeText}\` change(s)`, async () => {
            await expect(page.getByTestId('saved-changes-stack')).toBeVisible();
            const changes = await page.getByTestId('saved-changes-stack').getByText(changeText).all();
            expect(changes.length).toBe(expectedCount);
        });
    }

    /**
     * Reusable function to check saved changes stack for specific change types.
     *
     * @param page - Page object to search within.
     * @param changeText - Text to search for within the saved-changes-stack.
     * @param expectedCount - Expected number of changes.
     * @returns Promise that resolves when the assertion passes.
     */
    async expectUnSavedChangesStack(page: Page, changeText: string, expectedCount: number): Promise<void> {
        await test.step(`Check unsaved changes stack contains \`${expectedCount}\` \`${changeText}\` change(s)`, async () => {
            await expect(page.getByTestId('unsaved-changes-stack')).toBeVisible();
            const changes = await page.getByTestId('unsaved-changes-stack').getByText(changeText).all();
            expect(changes.length).toBe(expectedCount);
        });
    }

    /**
     * Checks if the specified text is visible in the Changes Panel.
     *
     * @param text - The text to check for visibility.
     * @param stack - Optional stack to check ('unsaved' or 'saved').
     */
    async checkTextInPanel(text: string[], stack?: string): Promise<void> {
        await test.step(`Check \`${text.join('->')}\` text is visible in the ${this.context}`, async () => {
            let textLocator = this.page.getByText(text.join(''));
            if (stack === 'unsaved') {
                textLocator = this.page.getByTestId('unsaved-changes-stack').getByText(text.join(''));
            } else if (stack === 'saved') {
                textLocator = this.getGenericItemLocatorInSavedStack(text);
            }
            await expect(textLocator).toBeVisible();
        });
    }
    /**
     * Checks if the specified text is visible in the Changes Panel.
     *
     * @param text - The text to check for visibility.
     */
    async checkDeleteButtonForSavedItem(text: string[]): Promise<void> {
        await test.step(`Hover item with \`${text.join('->')}\` text and check \`delete\` is visible in the ${
            this.context
        }`, async () => {
            const deleteButton = await this.getDeleteButtonLocatorForSavedItem(text);
            await expect(deleteButton).toBeVisible();
        });
    }

    /**
     * Gets the locator for the delete button of a saved item.
     *
     * @param text - The text of the saved item.
     * @returns Locator for the delete button.
     */
    async getDeleteButtonLocatorForSavedItem(text: string[]): Promise<Locator> {
        const textLocator = this.getGenericItemLocatorInSavedStack(text);
        await textLocator.hover();
        return (
            textLocator
                .locator(`i[data-icon-name="TrashCan"]`)
                //.getByRole('button', { name: 'Delete' })
                .describe(`\`Delete\` button for \`${text.join('->')}\` item in the ${this.context}`)
        );
    }

    getGenericItemLocatorInSavedStack(text: string[]): Locator {
        const index = 0; // for the second match (0-based)
        let locator = this.page
            .getByTestId('saved-changes-stack')
            .locator('div[data-testid="generic-change"]')
            .describe(`\`${text}\` item in the saved changes stack of the ${this.context}`);
        for (const txt of text) {
            locator = locator.filter({ hasText: txt });
        }
        locator = locator.nth(index);
        return locator;
    }

    get deleteOnDilog(): Locator {
        return this.page
            .getByLabel('Confirm change deletion')
            .getByRole('button', { name: 'Delete' })
            .describe(`\`Delete\` button in the dialog to confirm change deletion in the ${this.context}`);
    }

    checkFilterBarIsSticky(): Promise<void> {
        return test.step(`Check \`Changes Panel\` filter bar is sticky in the ${this.context}`, async () => {
            const scroller = await this.page
                .getByPlaceholder('Filter Changes')
                .locator(
                    'xpath=ancestor::div/following-sibling::div[contains(@class,"app-panel-scroller") and contains(@class,"auto-element-scroller")]'
                );

            await expect(scroller).toBeVisible();
            const lastItem = scroller.locator(':scope > *').last();
            await lastItem.scrollIntoViewIfNeeded();
            await expect(this.page.getByPlaceholder('Filter Changes')).toBeVisible();
        });
    }
}

/**
 * Class representing the quick action panel in the Adaptation Editor.
 */
class OutlinePanel {
    private readonly page: Page;
    private readonly context: string = `Outline Panel`;

    /**
     * Finds and right-clicks on a node in the outline panel based on the provided text.
     *
     * @param text - The text to search for within the outline panel.
     * @param clickButton - The mouse button to use for the click action. Defaults to 'left'.
     * @returns Promise that resolves when the right-click action is completed.
     */
    async clickOnNode(text: string, clickButton: 'left' | 'right' | 'middle' | undefined = 'left'): Promise<void> {
        const clickDesc = clickButton === 'right' ? 'right click' : 'click';
        return test.step(`Find and ${clickDesc} on \`${text}\` node in the Outline Panel`, async () => {
            // First check if the element exists at all
            const selector = `.tree-cell div:text-is("${text}")`;
            const count = await this.page.locator(selector).count();

            if (count === 0) {
                throw new Error(`Node with text "${text}" not found in the outline panel`);
            }

            // Element exists but may not be in viewport, scroll it into view
            await this.page.evaluate(
                ({ nodeText }: { querySelector: string; nodeText: string }) => {
                    const el = Array.from(document.querySelectorAll('.tree-cell div')).filter(
                        (el) => el.textContent?.trim() === nodeText
                    )[0];
                    // for (const el of elements) {
                    if (el.textContent?.trim() === nodeText) {
                        // Get the scroll container
                        const scrollContainer = document.querySelector('#list-outline');
                        if (scrollContainer) {
                            // Get the node's parent row that should be scrolled into view
                            const nodeToScroll = el.closest('.tree-row');
                            if (nodeToScroll) {
                                // Use scrollIntoView for initial positioning
                                nodeToScroll.scrollIntoView({ behavior: 'instant', block: 'center' });

                                // Fine-tune scroll position to ensure visibility
                                const containerRect = scrollContainer.getBoundingClientRect();
                                const nodeRect = nodeToScroll.getBoundingClientRect();

                                // Adjust scroll if needed to center the element
                                if (nodeRect.top < containerRect.top || nodeRect.bottom > containerRect.bottom) {
                                    scrollContainer.scrollTop +=
                                        nodeRect.top - containerRect.top - (containerRect.height - nodeRect.height) / 2;
                                }

                                return true;
                            }
                            // }
                        }
                    }
                    return false;
                },
                { querySelector: selector, nodeText: text }
            );

            const node = this.page.locator(selector).first();
            await expect(node).toBeVisible();
            await node.click({ button: clickButton });
        });
    }

    // Click on one of the menus is opend context menu of the outline panel
    /**
     * Clicks on a menu item in the context menu of the outline panel.
     *
     * @param menuName - The name of the menu item to click.
     * @returns Promise that resolves when the click action is completed.
     */
    async clickOnContextMenu(menuName: string): Promise<void> {
        // return test.step(`Click on \`${menuName}\` item in the context menu of the Outline Panel`, async () => {
        const menuItem = this.page.getByRole('menu').getByRole('menuitem', { name: menuName });
        await expect(menuItem).toBeVisible();
        await menuItem.describe(`\`${menuName}\` item in the context menu of the Outline Panel`).click();
        //});
    }

    /**
     *
     * @param text
     */
    async filterOutline(text: string): Promise<void> {
        const filterInput = this.page.getByPlaceholder('Filter Outline');
        await test.step(`Fill \`Filter Outline\` input field with \`${text}\``, async () => {
            await filterInput.fill(text);
        });
    }

    async checkOutlineNodeSelected(text: string): Promise<void> {
        await test.step(`Check \`${text}\` node is selected in the ${this.context}`, async () => {
            const node = this.page.locator('.app-panel-selected-bg').first();
            expect(await node.textContent()).toBe(text);
            await expect(node).toBeVisible();
        });
    }

    async checkFilterOutlineIsVisible(): Promise<void> {
        await test.step(`Check \`Filter Outline\` input field is \`visible\` in the ${this.context}`, async () => {
            await expect(this.page.locator('.filter-outline')).toBeVisible();
        });
    }

    async checkFilterIsInViewPort(): Promise<void> {
        await test.step(`Check \`Filter Outline\` input field is in \`viewport\` in the ${this.context}`, async () => {
            await expect(this.page.locator('.filter-outline')).toBeInViewport();
        });
    }

    getFilterOptionFunnel(): Locator {
        return this.page
            .locator('#control-property-editor-funnel-callout-target-id')
            .describe(`\`Funnel\` icon for Manage Filter in the ${this.context}`);
    }

    async checkFilterOptionsTitle(title: string): Promise<void> {
        await test.step(`\`Hover\` on the filter options icon and check the title is \`${title}\` in the ${this.context}`, async () => {
            expect(await this.getFilterOptionFunnel().getAttribute('title')).toBe(title);
        });
    }

    async getEnabledOptionsInFilterOutline(): Promise<(string | null | undefined)[]> {
        //return Promise.resolve([]);

        const checkedLabels =
            (await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                    .map((input) => {
                        const label = document.querySelector(`label[for="${input.id}"]`);
                        return label ? label.querySelector('.ms-Checkbox-text')?.textContent?.trim() : null;
                    })
                    .filter(Boolean);
            })) ?? [];
        return checkedLabels;
    }

    async getOutlineNodes<T>(
        selection: 'show_common_only' | 'focus_editable' | 'all',
        selector: '[id=list-outline] [class=tree-row]' | 'span.tree-cell'
    ): Promise<T> {
        await this.page.waitForSelector(selector);
        return this.page.evaluate(
            ({ selection, selector, Selection }) => {
                if (selection === Selection.focus_editable) {
                    const result: any[] = [];
                    document.querySelectorAll(selector).forEach((entry) => {
                        const focusEditable = entry.parentElement?.getAttribute('class')?.includes('focusEditable');
                        result.push({ focusEditable: focusEditable });
                    });
                    return result;
                } else if (selection === Selection.show_common_only || Selection.All) {
                    const length = document.querySelectorAll(selector).length;
                    return length;
                }
            },
            { selection, selector, Selection }
        ) as T;
    }

    /**
     * Constructor for QuickActionPanel.
     *
     * @param page - Page object.
     */
    constructor(page: Page) {
        this.page = page;
    }
}

/**
 *
 */
class PropertiesPanel {
    private readonly page: Page;
    private readonly context: string = `Properties Panel`;
    private title: string = 'Properties';

    /**
     * Returns a locator for a property field in the properties panel based on the provided label.
     *
     * @param label - The label of the property field to locate.
     * @returns Locator for the property field with the specified label.
     */
    locatorForPropertyField(label: string): Locator {
        return this.page
            .getByTestId('properties-panel')
            .getByLabel(label)
            .describe(`\`${label}\` field in the ${this.context}`);
    }

    /**
     * Sets a boolean property in the properties panel.
     *
     * @param propertyName - name of the property.
     * @param value - boolean value to set.
     */
    async setBooleanProperty(propertyName: string, value: boolean): Promise<void> {
        const testId = value
            ? `${propertyName}--InputTypeToggle--booleanTrue`
            : `${propertyName}--InputTypeToggle--booleanFalse`;
        const label = value ? 'True' : 'False';
        await test.step(`Set \`${capitalizeWords(propertyName)}\` property to \`${label}\` in the ${
            this.context
        }`, async () => {
            const locator = this.page.getByTestId(testId);
            await expect(locator).toBeVisible();
            await locator.click();
        });
    }

    async scrollToProperty(propertySelector: string): Promise<void> {
        await this.page.evaluate(
            ({ querySelector }: { querySelector: string }) => {
                const el = Array.from(document.querySelectorAll(`[data-testid="${querySelector}"]`)).filter(
                    (el) => el
                )[0];
                if (el) {
                    // Get the scroll container
                    const scrollContainer = document.querySelector('.property-content.app-panel-scroller');
                    if (scrollContainer) {
                        el.scrollIntoView({ behavior: 'instant', block: 'center' });

                        // Fine-tune scroll position to ensure visibility
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const nodeRect = el.getBoundingClientRect();

                        // Adjust scroll if needed to center the element
                        if (nodeRect.top < containerRect.top || nodeRect.bottom > containerRect.bottom) {
                            scrollContainer.scrollTop +=
                                nodeRect.top - containerRect.top - (containerRect.height - nodeRect.height) / 2;
                        }

                        return true;
                    }
                }
                return false;
            },
            { querySelector: propertySelector }
        );
    }

    /**
     * Returns a locator for a string editor in the properties panel based on the provided property name.
     *
     * @param propertyName - name of the property.
     * @param value - value to fill in.
     */
    async fillStringEditor(propertyName: string, value: string): Promise<void> {
        await test.step(`Fill \`${capitalizeWords(propertyName)}\` property with  \`${value}\` in the ${
            this.context
        }`, async () => {
            const locator = this.page.getByTestId(`${propertyName}--StringEditor`);
            await this.scrollToProperty(`${propertyName}--StringEditor`);
            await expect(locator).toBeVisible();
            await locator.fill(value);
        });
    }

    getValueHelpInput(propertyName: string, title = 'Select Icon'): Locator {
        this.title = title;
        return this.page
            .getByTestId(`${propertyName}--InputTypeWrapper`)
            .getByTitle(title)
            .describe(`\`Value Help\` icon for \`${capitalizeWords(propertyName)}\` property in the ${this.context}`);
    }

    async fillValueHelpFilter(value: string): Promise<void> {
        await test.step(`Fill \`Filter Icons\` input field with \`${value}\` in the \`${this.title}\` dialog`, async () => {
            const filterInput = this.page.getByPlaceholder('Filter Icons');
            await expect(filterInput).toBeVisible();
            await filterInput.fill(value);
        });
    }

    getValueHelpTableCell(cellContent: string): Locator {
        return this.page
            .getByRole('gridcell', { name: cellContent })
            .describe(`\`cell\` with \`${cellContent}\` in the \`${this.title}\` dialog`);
    }

    async checkStringEditorPropertyValue(propertyName: string, expectedValue: string): Promise<void> {
        await test.step(`Check \`${capitalizeWords(propertyName)}\` property value is \`${expectedValue}\` in the ${
            this.context
        }`, async () => {
            const locator = this.page.getByTestId(`${propertyName}--StringEditor`);
            await expect(locator).toBeVisible();
            const value = await locator.inputValue();
            expect(value).toBe(expectedValue);
        });
    }

    get valueHelpOkButton(): Locator {
        return this.page.getByRole('button', { name: 'OK' }).describe(`\`OK\` button in the \`${this.title}\` dialog`);
    }

    /**
     * Constructor for PropertiesPanel.
     *
     * @param page - Page object.
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
    readonly outlinePanel: OutlinePanel;
    readonly propertiesPanel: PropertiesPanel;
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
        this.outlinePanel = new OutlinePanel(page);
        this.propertiesPanel = new PropertiesPanel(page);
        this.toolbar = new Toolbar(page);
        this.changesPanel = new ChangesPanel(page);
    }

    /**
     * Get the current selected theme.
     *
     * @returns string | null
     */
    async getTheme(): Promise<string | null> {
        return await this.page.getAttribute('html', 'data-theme');
    }

    async checkTheme(expectedTheme: string): Promise<void> {
        return await test.step(`Check current theme is \`${expectedTheme}\``, async () => {
            const currentTheme = await this.getTheme();
            expect(currentTheme).toBe(expectedTheme);
        });
    }

    async getCssTransform(selector: string): Promise<string | undefined> {
        return this.page.evaluate((selector: string) => {
            const element = document.querySelector(selector);
            if (!element) {
                return;
            }
            const styles = window.getComputedStyle(element);
            return styles.transform;
        }, selector);
    }
}

/**
 * Class representing a dialog in the Adaptation Editor.
 */
export class AdpDialog {
    private readonly frame: FrameLocator;
    private readonly ui5Version: string;
    private readonly dialogName?: string;
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
     * Gets the name (title) of the dialog.
     *
     * @returns Promise resolving to the dialog title as a string.
     */
    async getName(): Promise<string> {
        let heading = this.frame.getByRole('dialog').getByRole('heading');
        if (typeof heading.first === 'function') {
            heading = heading.first();
        }
        const title = (await heading.textContent()) ?? '';
        return title;
    }

    /**
     * Fill input field with the given value.
     *
     * @param fieldName - name of input field
     * @param value - value to fill in.
     */
    async fillField(fieldName: string, value: string): Promise<void> {
        const title = await this.getName();
        await test.step(`Fill \`${fieldName}\` field with \`${value}\` in the dialog \`${title}\``, async () => {
            const field = this.frame.getByRole('textbox', { name: fieldName });
            await field.fill(value);
        });
    }

    async clickCreateButton(): Promise<void> {
        const title = await this.getName();
        await test.step(`Click on \`Create\` button in the dialog \`${title}\``, async () => {
            await this.createButton.click();
        });
    }

    async clickOnOk(): Promise<void> {
        const okBtn = this.frame.getByRole('button', { name: 'OK' });
        await test.step(`Click on \`Create\` button in the dialog \`${this.dialogName}\``, async () => {
            await okBtn.click();
        });
    }

    /**
     * Checks if the "Open in VS Code" button is visible.
     *
     * @returns Promise that resolves when the button is visible.
     */
    async openInVSCodeVisible(): Promise<void> {
        return expect(
            this.frame.getByRole('button', { name: 'Open in VS Code' }),
            'Check `Open in VS Code` button is visible'
        ).toBeVisible();
    }

    /**
     * @param frame - FrameLocator for the dialog.
     * @param ui5Version - UI5 version.
     * @param dialogName - Name of the dialog.
     */
    constructor(frame: FrameLocator, ui5Version: string, dialogName?: string) {
        this.frame = frame;
        this.ui5Version = ui5Version;
        this.dialogName = dialogName;
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
                    let index = 0;
                    for (const child of children) {
                        if (child.isFile()) {
                            const fileName = file.name === 'annotations' ? `file${index}` : child.name; // annotation file name contains timestamp
                            index++;
                            result[file.name][fileName] = await readFile(
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

/**
 * Recursively convert an object to expect matchers.
 *
 * @param obj Object to convert to expect matchers
 * @returns Converted object with expect matchers
 */
function convertToExpectMatchers(obj: any): unknown {
    // Base case: null or undefined
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return expect.arrayContaining(obj.map((item) => convertToExpectMatchers(item)));
    }

    // Handle objects
    if (typeof obj === 'object') {
        const result: Record<string, any> = {};

        for (const [key, value] of Object.entries(obj)) {
            // Recursively convert nested objects/arrays
            if (value !== null && typeof value === 'object') {
                result[key] = convertToExpectMatchers(value) as any;
            }
            // Keep other primitive types as is
            else {
                result[key] = value;
            }
        }

        return expect.objectContaining(result);
    }

    return obj;
}

/**
 * Verify changes against expected changes.
 *
 * @param projectCopy Project copy to check for changes
 * @param expected Expected changes to verify
 */
export async function verifyChanges(projectCopy: any, expected: Partial<Changes>): Promise<void> {
    // Build detailed description for changes being verified in markdown format
    let description = 'Verify changes:\n\n';
    // Add formatted sections to description
    description += formatFragmentsForMarkdown(expected.fragments ?? {});
    description += formatAnnotationsForMarkdown(expected.annotations);
    description += formatCodingForMarkdown(expected.coding);
    description += formatChangesForMarkdown(expected.changes);
    const matcher: Record<string, any> = {};

    // Process file-based properties (fragments, annotations, coding) in a single pattern
    const fileBasedProperties: (keyof Changes)[] = ['fragments', 'annotations', 'coding'];

    for (const prop of fileBasedProperties) {
        if (expected[prop]) {
            const matchers: Record<string, any> = {};
            for (const [filename, content] of Object.entries(expected[prop])) {
                matchers[filename] = expect.stringMatching(new RegExp(content));
            }
            matcher[prop] = expect.objectContaining(matchers);
        }
    }

    // Handle changes array with deep conversion
    if (expected.changes) {
        const changeMatchers = expected.changes.map((change) => convertToExpectMatchers(change));
        matcher.changes = expect.arrayContaining(changeMatchers);
    }

    await test.step(description, async () => {
        await expect
            .poll(async () => readChanges(projectCopy), {
                message: ''
            })
            .toEqual(expect.objectContaining(matcher));
    });
}

/**
 * Replace literal occurrences like "[a-z0-9]+" in content with a readable placeholder.
 *
 * @param input - string to sanitize
 * @returns sanitized string
 */
function sanitizeIds(input: string): string {
    return input
        .replace(/\[a-z0-9\]\+/g, '<UNIQUE_ID>')
        .replace(/\[0-9\]\+/g, '<UNIQUE_ID>')
        .replace(/\\\[a-z0-9\\\]\+/g, '<UNIQUE_ID>')
        .replace(/\\\[0-9\\\]\+/g, '<UNIQUE_ID>');
}

/**
 * Format fragments for markdown output.
 *
 * @param fragments Fragment files to format
 * @returns Markdown formatted string
 */
function formatFragmentsForMarkdown(fragments: Record<string, string>): string {
    if (!fragments || Object.keys(fragments).length === 0) {
        return '';
    }

    let result = '**Fragment(s)**\n\n';
    for (const [filename, content] of Object.entries(fragments)) {
        const sanitized = sanitizeIds(content);
        result += `**${filename}**\n\`\`\`xml\n${sanitized}\n\`\`\`\n\n`;
    }
    return result;
}

/**
 * Format annotations for markdown output.
 *
 * @param annotations Annotation files to format
 * @returns Markdown formatted string
 */
function formatAnnotationsForMarkdown(annotations: Record<string, string> | undefined): string {
    if (!annotations) {
        return '';
    }

    let result = '**Annotations**\n';
    if (Object.keys(annotations).length > 0) {
        for (const [_filename, content] of Object.entries(annotations)) {
            result += `\`\`\`xml\n${sanitizeIds(content)}\n\`\`\`\n\n`;
        }
    }
    return result;
}

/**
 * Format coding files for markdown output.
 *
 * @param coding Coding files to format
 * @returns Markdown formatted string
 */
function formatCodingForMarkdown(coding: Record<string, string | RegExp> | undefined): string {
    if (!coding) {
        return '';
    }

    let result = '**Coding**\n\n';
    if (Object.keys(coding).length > 0) {
        for (const [filename, content] of Object.entries(coding)) {
            const text = typeof content === 'string' ? content : String(content);
            result += `**${filename}**\n\`\`\`js\n${sanitizeIds(text)}\n\`\`\`\n\n`;
        }
    }
    return result;
}

/**
 * Format changes for markdown output.
 *
 * @param changes Changes to format
 * @returns Markdown formatted string
 */
function formatChangesForMarkdown(changes: object[] | undefined): string {
    if (!changes) {
        return '';
    }

    let result = '**Change(s)**\n\n';
    if (changes.length > 0) {
        changes.forEach((change, index) => {
            if (changes.length > 1) {
                result += `**Change** ${index + 1}\n`;
            }
            result += `\`\`\`json\n${JSON.stringify(change, null, 2)}\n\`\`\`\n\n`;
        });
    }
    return result;
}

//write a function to capitalize the first letter of each word in a string
export function capitalizeWords(input: string): string {
    return input.replace(/\b\w/g, (char) => char.toUpperCase());
}

export const delay = async (ms = 5000): Promise<void> => {
    await new Promise((r) => setTimeout(r, ms));
};

export async function waitUntilFileIsDeleted(filePath: string): Promise<string[]> {
    let retryCount = 0;
    let file: string[] = [];
    while (retryCount < 5) {
        try {
            file = await readdirSync(filePath);
            if (file?.length === 0) {
                break;
            }
        } catch (error) {
            console.log(`Error reading directory: ${error}`);
        }

        retryCount++;
        await delay(1000); // 1 sec
    }
    return file;
}

export async function exposeFunction(page: Page, message: any[]) {
    await page.exposeFunction('onPostMessage', (e: any) => {
        if (e.action?.type && !['[ext] outline-changed', '[ext] property-changed'].includes(e.action.type)) {
            message.push(e);
        }
    });
    await page.evaluate(() => {
        window.parent.addEventListener('message', (e: any) => {
            (window as any).onPostMessage(e.data);
        });
    });
}
