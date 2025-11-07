import { readdir, readFile } from 'fs/promises';
import { join } from 'node:path';
import { expect, test, type FrameLocator, type Page, type Locator } from '@sap-ux-private/playwright';
import { gte, lte } from 'semver';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

interface Changes {
    annotations: Record<string, string>;
    coding: Record<string, string | RegExp>;
    fragments: Record<string, string>;
    changes: object[];
}

const escapedId = (id: string) => id.replace(/\\/g, '\\\\').replace(/([ #;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
const CHANGE_INDICATOR = {
    UnSaved: 'empty circle',
    Saved: 'filled circle',
    SavedAndUnSaved: 'half-filled circle'
};

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
 * @param exact - Whether to match the button name exactly (default is false)
 * @returns Locator for the button with added description
 */
export function getButtonLocator(page: Page | FrameLocator, name: string, context: string, exact = false): Locator {
    return page.getByRole('button', { name, exact }).describe(`\`${name}\` button in the ${context}`);
}

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param ms - Number of milliseconds to delay (default is 5000)
 */
export const delay = async (ms = 5000): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Exposes a function in the page context to listen for post messages and store them in the provided array.
 *
 * @param page - The Playwright Page object
 * @param message - The array to store received messages
 * @returns Promise that resolves when the function is exposed
 */
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
/**
 * Waits for a scene to be validated within a specified timeout.
 *
 * @param sceneValidator - A function that returns a Promise resolving to a boolean indicating if the scene is valid
 * @param timeout - Maximum time to wait for the scene to be valid (default is 5000 ms)
 * @param tick - Interval time between checks (default is 200 ms)
 * @returns Promise that resolves to true if the scene is valid within the timeout, otherwise false
 */
const waitForScene = async (sceneValidator: () => Promise<boolean>, timeout = 5000, tick = 200) => {
    let ticks = Math.ceil(timeout / tick);
    while (ticks > 0) {
        await delay(tick);
        if (await sceneValidator()) {
            return true;
        }
        ticks--;
    }
    return false;
};

/**
 * Class representing a List Report in the Adaptation Editor.
 */
export class ListReport {
    private readonly frame: FrameLocator;
    private readonly feVersion: 'fev2' | 'fev4';
    private readonly ui5Version: string;
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
        const locator = await getButtonLocator(this.frame, buttonText, this.context);
        await locator.click();
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
     * @param label - control label to check.
     */
    async checkControlLabel(label: string): Promise<void> {
        await test.step(`Check control's label is \`${label}\` in the \`${this.context}\``, async () => {
            const value = await getButtonLocator(this.frame, label, this.context, true).innerText();
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
            const controlLocator = getButtonLocator(this.frame, text, this.context);
            const controlId = await controlLocator.getAttribute('id');
            const escaped = escapedId(controlId!);
            const overlayLocator = this.frame.locator(`[data-sap-ui-dt-for="${escaped}"]`);
            await overlayLocator.click({
                button: button
            });
        });
    }

    /**
     * Gets the control ID by its label.
     *
     * @param text - The label of the control.
     * @returns Promise resolving to the control ID.
     */
    async getControlIdByLabel(text: string): Promise<string> {
        const controlLocator = getButtonLocator(this.frame, text, this.context);
        const controlId = await controlLocator.getAttribute('id');
        return controlId!;
    }

    /**
     * Helper method to get control ID by its label text.
     *
     * @param text - The label text of the control.
     * @returns Promise resolving to the control ID.
     */
    async checkControlVisible(text: string): Promise<void> {
        await test.step(`Check control with label \`${text}\` is visible in the \`${this.context}\``, async () => {
            const selector = await this.getControlIdByLabel(text);
            await expect(this.frame.locator(`[id="${selector}"]`)).toBeVisible();
        });
    }

    /*
     * Clicks on the value help button of the `Date Property` filter.
     * @param dialog - Whether to check the dialog after clicking the value help button.
     */
    clickOnDatePropertyValueHelper = async (dialog = false): Promise<void> => {
        await test.step('Click on value help button of `Date Property` filter', async () => {
            const labelId =
                this.feVersion === 'fev4'
                    ? 'fiori.elements.v4.0::RootEntityList--fe::FilterBar::RootEntity::FilterField::DateProperty-label'
                    : 'fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--listReportFilter-filterItem-___INTERNAL_-DateProperty';
            // Select the parent div of the label, then its sibling div, then the descendant with the required attribute
            const valueHelpSelector =
                this.feVersion === 'fev4' || (this.feVersion === 'fev2' && lte(this.ui5Version, '1.130.0'))
                    ? `div:has(> [id="${escapedId(labelId)}"]) ~ div [title="Open Picker"],
                    div:has(> [id="${escapedId(labelId)}"]) ~ div [aria-label="Show Value Help"],
                    div:has(> [id="${escapedId(labelId)}"]) ~ div [aria-label="Open Picker"],
                    div:has(> [id="${escapedId(
                        labelId
                    )}"]) ~ div [id="fiori\\.elements\\.v4\\.0\\:\\:RootEntityList--fe\\:\\:FilterBar\\:\\:RootEntity\\:\\:FilterField\\:\\:DateProperty-inner-input-vhi"]
                  `
                    : `div:has(> [id="${escapedId(labelId)}"]) div [title="Open Picker"], div:has(> [id="${escapedId(
                          labelId
                      )}"]) div [aria-label="Show Value Help"]`;
            const locator = this.frame.locator(valueHelpSelector);
            await expect(locator.first()).toBeAttached();
            await locator.first().click();
        });
        if (dialog) {
            await test.step('Check `Define Conditions: Date Property` Dialog is open and click on value help button', async () => {
                const dialog = this.frame.getByRole('dialog');
                await expect(dialog.getByText('Define Conditions: Date Property')).toBeVisible();
                await dialog.getByTitle('Open Picker').click();
                await this.checkCalendarDisplayed();
                await this.frame
                    .getByRole('button', { name: 'Cancel' })
                    .describe(`button \`Cancel\` in the  \`Define Conditions: Date Property\` dialog`)
                    .click();
            });
        }
    };

    /**
     * Checks that the calendar popover is displayed.
     */
    checkCalendarDisplayed = async (): Promise<void> => {
        await test.step('Check that the calendar popover is displayed', async () => {
            await expect(this.frame.getByRole('button', { name: new Date().getFullYear().toString() })).toBeVisible();
        });
    };

    /**
     * Returns locators for all semantic date range options for a given property name.
     *
     * @param frame - FrameLocator for the preview frame.
     * @param propertyName - Property name, e.g. "Date Property".
     * @returns Locator for the "li" elements in the popover.
     */
    async getSemanticDateOptions(frame: FrameLocator, propertyName: string): Promise<string[]> {
        const popoverId =
            this.feVersion === 'fev2'
                ? escapedId(
                      `fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--listReportFilter-filterItemControl_BASIC-${propertyName}-RP-popover-cont`
                  )
                : escapedId(
                      `fiori.elements.v4.0::RootEntityList--fe::FilterBar::RootEntity::FilterField::${propertyName}-inner-RP-popover-cont`
                  );
        const optionList = frame.locator(`#${popoverId} ul > li`);
        const count = await optionList.count();
        const options: string[] = [];
        for (let i = 0; i < count; i++) {
            options.push(await optionList.nth(i).innerText());
        }
        return options;
    }

    /**
     * Check that semantic date range options exist for a given property name.
     *
     * @param propertyName - Property name, e.g. "Date Property".
     * @param expectedOptions - Expected semantic date range options.
     */
    async checkSemanticDateOptionsExist(propertyName: string, expectedOptions: string[]): Promise<void> {
        await test.step(`Check semantic date range options have \`${expectedOptions}\` for \`${propertyName}\` filter`, async () => {
            const options = await this.getSemanticDateOptions(this.frame, propertyName);
            for (const expectedOption of expectedOptions) {
                expect(options).toContain(expectedOption);
            }
        });
    }

    /**
     * Clicks on an item in the context menu.
     *
     * @param itemText - The text of the context menu item to click.
     * @returns Locator for the context menu item.
     */
    getContextMenuItem(itemText: string): Locator {
        return this.frame.getByText(itemText).first().describe(`\`${itemText}\` item in the context menu`);
    }

    /**
     * @param label - control label to check.
     */
    async checkControlHasOverlay(label: string): Promise<void> {
        await test.step(`Check control with label \`${label}\` has \`Overlay\` in the \`${this.context}\``, async () => {
            const overlayLocator = this.frame.locator('[class*="sapUiDtOverlaySelected"]');
            await expect(overlayLocator).toBeVisible();
            const overlayFor = await overlayLocator.getAttribute('data-sap-ui-dt-for');
            const escape = escapedId(overlayFor!);
            const controlLocator = this.frame.locator(`#${escape}`);
            await expect(controlLocator).toBeVisible();
            const controlText = await controlLocator.innerText();
            expect(controlText).toContain(label);
        });
    }

    /**
     * Checks if the List Report app is loaded in the preview iframe.
     *
     *  @returns Promise that resolves when the app is loaded.
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
     * @param text - control label to check.
     * @param expectedState - expected enabled state.
     */
    async checkControlState(text: string, expectedState: boolean): Promise<void> {
        const state = expectedState ? 'enabled' : 'disabled';
        await test.step(`Check control with label \`${text}\` is \`${state}\` in the \`${this.context}\``, async () => {
            const selector = await this.getControlIdByLabel(text);
            const controlState = await (await this.frame.locator(`[id="${selector}"]`)).isEnabled();
            expect(controlState).toBe(expectedState);
        });
    }

    /**
     * @param frame - FrameLocator for the List Report.
     * @param feVersion - The Fiori Elements version, either 'fev2' or 'fev4'. Defaults to 'fev2'.
     * @param ui5Version - UI5 version.
     */
    constructor(frame: FrameLocator, feVersion: 'fev2' | 'fev4' = 'fev2', ui5Version: string = '') {
        this.frame = frame;
        this.feVersion = feVersion;
        this.ui5Version = ui5Version;
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
     * Get tab names in the dialog.
     *
     * @returns An array of tab names.
     */
    async getTabNames(): Promise<string[]> {
        // Find all elements with role="tab"
        const tabLocators = this.dialog.locator('[role="tab"]');
        const tabCount = await tabLocators.count();
        const tabNames: string[] = [];
        for (let i = 0; i < tabCount; i++) {
            // Try aria-labelledby first
            const tab = tabLocators.nth(i);
            const labelledBy = await tab.getAttribute('aria-labelledby');
            if (labelledBy) {
                const labelSpan = this.dialog.locator(`#${labelledBy}`);
                const labelText = await labelSpan.textContent();
                if (labelText && labelText.trim()) {
                    tabNames.push(labelText.trim());
                    continue;
                }
            }
            // Fallback: get visible text from tab itself
            const tabText = await tab.textContent();
            if (tabText && tabText.trim()) {
                tabNames.push(tabText.trim());
            }
        }
        return tabNames;
    }

    /**
     * Checks that the specified tabs exist in the dialog.
     *
     * @param expectedTabs - An array of expected tab names.
     * @returns Locator for the button to enable the "Clear" button in the filter bar.
     */
    checkTabsExist = async (expectedTabs: string[]): Promise<void> => {
        await test.step(`Check tab(s) \`${expectedTabs.join(', ')}\` exist in the \`${
            this.dialogName
        }\` dialog`, async () => {
            const tabNames = await this.getTabNames();
            expect(tabNames).toEqual(expect.arrayContaining(expectedTabs));
        });
    };

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
     * Waits for the Object Page Quick Action panel to be loaded.
     */
    async waitForObjectPageQuickActionLoaded(): Promise<void> {
        await this.page.getByText('OBJECT PAGE QUICK ACTIONS', { exact: true }).waitFor({ state: 'visible' });
    }

    /**
     * @returns Locator for the button to Add Custom Page Action.
     */
    get addCustomPageAction(): Locator {
        return this.getButtonLocator('Add Custom Page Action');
    }

    /**
     * @returns Locator for the button to enable the "Clear" button in the filter bar.
     */
    get enableTableFilterForPageVariants(): Locator {
        return this.getButtonLocator('Enable Table Filtering for Page Variants');
    }

    /**
     * Checks if a quick action button is disabled.
     *
     * @param buttonName - Name of the button to check.
     * @param title - Optional title to check for the disabled button.
     * @returns Promise that resolves when the assertion passes.
     */
    async checkQADisabled(buttonName: string, title?: string): Promise<void> {
        const button = this.getButtonLocator(buttonName);
        if (title) {
            await this.checkDisabledButtonTitle(buttonName, title);
        }
        const tooltip = title ? `and tooltip is \`${title}\`` : '';
        await expect(button, `Check \`${buttonName}\` quick action is disabled ${tooltip}`).toBeDisabled();
    }

    /**
     * Checks the title of a disabled button.
     *
     * @param buttonName - Name of the button to check.
     * @param expectedTitle - Expected title of the disabled button.
     * @returns Promise that resolves when the assertion passes.
     */
    private async checkDisabledButtonTitle(buttonName: string, expectedTitle: string): Promise<void> {
        const button = this.getButtonLocator(buttonName);
        await expect(button).toHaveAttribute('title', expectedTitle);
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

    async checkText(text: string): Promise<void> {
        await test.step(`Check \`${text}\` text is visible in the ${this.context}`, async () => {
            const textLocator = this.page.getByText(text);
            await textLocator.waitFor({ state: 'visible' });
            await expect(textLocator).toBeVisible();
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
                await textLocator.waitFor({ state: 'visible' });
            } else if (stack === 'saved') {
                textLocator = this.getGenericItemLocatorInSavedStack(text);
                await textLocator.waitFor({ state: 'attached' });
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

    /**
     * Gets the locator for a generic item in the saved changes stack based on the provided text.
     *
     * @param text - The text to search for within the saved changes stack.
     * @returns Locator for the generic item in the saved changes stack.
     */
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

    /**
     * Delete button in the dialog to confirm change deletion.
     *
     * @returns Locator for the delete button in the dialog to confirm change deletion.
     */
    get deleteOnDilog(): Locator {
        return this.page
            .getByLabel('Confirm change deletion')
            .getByRole('button', { name: 'Delete' })
            .describe(`\`Delete\` button in the dialog to confirm change deletion in the ${this.context}`);
    }

    /**
     * Checks if the filter bar in the Changes Panel is sticky.
     */
    async checkFilterBarIsSticky(): Promise<void> {
        await test.step(`Check \`Changes Panel\` filter bar is sticky in the ${this.context}`, async () => {
            const scroller = await this.page
                .getByPlaceholder('Filter Changes')
                .locator(
                    'xpath=ancestor::div/following-sibling::div[contains(@class,"app-panel-scroller") and contains(@class,"auto-element-scroller")]'
                );

            await expect(scroller).toBeVisible();
            const lastItem = scroller.locator(':scope > *').last();
            await lastItem.scrollIntoViewIfNeeded();
            await expect(this.page.getByPlaceholder('Filter Changes')).toBeInViewport();
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
                await this.page.locator(selector).waitFor({ state: 'attached' });
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

    async checkOutlineNodeIndicator(text: string, expected: 'UnSaved' | 'Saved' | 'SavedAndUnSaved'): Promise<void> {
        await this.clickOnNode(text);
        await test.step(`Check \`${text}\` node has \`${CHANGE_INDICATOR[expected]} (${expected})\` indicator in the ${this.context}`, async () => {
            await expect
                .poll(async () => await this.getChangeIndicator(text), {
                    timeout: test.info().timeout
                })
                .toBe(expected);
        });
    }

    /**
     * Returns the type of change indicator rendered for a node in the outline panel.
     * Possible return values: 'unsavedChange', 'saved', 'savedAndUnsavedChange', or null.
     *
     * @param text - The text of the node to check for change indicator.
     * @returns The type of change indicator: 'unsavedChange', 'saved', 'savedAndUnsavedChange', or null.
     */
    async getChangeIndicator(text: string): Promise<'UnSaved' | 'Saved' | 'SavedAndUnSaved' | null> {
        return await this.page.evaluate((nodeText) => {
            // Find the node with the given text
            const node = Array.from(document.querySelectorAll('.tree-cell div')).find(
                (el) => el.textContent?.trim() === nodeText
            );
            if (!node) {
                return null;
            }

            // Go to its parent with .tree-cell
            const treeCell = node.closest('.tree-cell');
            if (!treeCell || !treeCell.parentElement) {
                return null;
            }

            // Check siblings for change indicator SVGs
            for (const sibling of Array.from(treeCell.parentElement.children)) {
                if (sibling === treeCell) {
                    continue;
                }
                const svg = sibling.querySelector('svg');
                if (!svg) {
                    continue;
                }

                const circle = svg.querySelector('circle');
                const path = svg.querySelector('path');
                if (circle && circle.hasAttribute('stroke') && !circle.hasAttribute('fill') && !path) {
                    return 'UnSaved';
                }
                if (circle && circle.hasAttribute('fill') && !circle.hasAttribute('stroke') && !path) {
                    return 'Saved';
                }

                if (circle && circle.hasAttribute('stroke') && path && path.hasAttribute('fill')) {
                    return 'SavedAndUnSaved';
                }
            }
            return null;
        }, text);
    }

    /**
     * Clicks on a menu item in the context menu of the outline panel.
     *
     * @param menuName - The name of the menu item to click.
     * @returns Promise that resolves when the click action is completed.
     */
    async clickOnContextMenu(menuName: string): Promise<void> {
        const menuItem = this.page.getByRole('menu').getByRole('menuitem', { name: menuName });
        await expect(menuItem).toBeVisible();
        await menuItem.describe(`\`${menuName}\` item in the context menu of the Outline Panel`).click();
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
            await expect
                .poll(async () => await node.textContent(), {
                    timeout: 5000
                })
                .toBe(text);
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
     * Checks if the properties panel is visible.
     */
    async checkPropertiesPanelIsVisible(): Promise<void> {
        await test.step(`Check \`${this.context}\` is visible`, async () => {
            const properties = await this.page
                .locator('div.property-content.app-panel-scroller')
                .getByLabel('PROPERTIES', { exact: true });
            await properties.waitFor({ state: 'visible' });
            await expect(properties).toBeVisible();
        });
    }

    /**
     * Clicks elsewhere on the page to loose focus from the input field in the properties panel.
     */
    async clickElseWhereToLooseFocus(): Promise<void> {
        await test.step(`Click elsewhere to loose focus from the input in ${this.context}`, async () => {
            await this.page.click('body', { position: { x: 0, y: 0 } });
        });
    }
    /**
     * Checks if the control ID is visible in the properties panel.
     *
     * @param id - control id to check.
     */
    async checkControlId(id: string): Promise<void> {
        const label = this.page.getByTestId('CONTROL ID--Label');
        await label.waitFor({ state: 'visible' });
        await expect(label).toBeVisible();
        const controlIdValue = this.page.getByTestId('CONTROL ID');
        await expect(await controlIdValue.inputValue()).toEqual(id);
    }

    /**
     * Checks if the "Copy to Clipboard" button is visible in the properties panel.
     *
     * @param selector - The selector for the button ('CONTROLID' or 'CONTROLTYPE').
     */
    async checkCopyToClipboardButton(selector: 'CONTROLID' | 'CONTROLTYPE'): Promise<void> {
        await test.step(`Check \`Copy\` button and its tooltip \`Copy\` is visible in the ${this.context}`, async () => {
            const button = this.page.locator(`#${selector}--copy`);
            await expect(button).toBeVisible();
            await expect(button).toHaveAttribute('title', 'Copy');
        });
    }

    /**
     * Checks if the control ID and control type are visible in the properties panel.
     *
     * @param id - control id to check.
     * @param type - control type to check.
     */
    async checkControlIdAndControlType(id: string, type?: string): Promise<void> {
        const text = type ? `\`Control Id: ${id}\` and \`Control Type: ${type}\`` : `\`Control Id: ${id}\``;
        await test.step(`Check ${text} are visible in the ${this.context}`, async () => {
            await this.checkControlId(id);

            if (type) {
                const typeLabel = this.page.getByTestId('CONTROL TYPE--Label');
                await typeLabel.waitFor({ state: 'visible' });
                await expect(typeLabel).toBeVisible();
                const controlTypeValue = this.page.getByTestId('CONTROL TYPE');
                await expect(await controlTypeValue.inputValue()).toEqual(type);
            }
        });
    }

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

    /**
     * Scrolls to a property in the properties panel based on the provided selector.
     *
     * @param propertySelector - The selector of the property to scroll to.
     */
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

    getExpressionValueButton(propertyName: string): Locator {
        return this.page
            .getByTestId(`${propertyName}--InputTypeToggle--expression`)
            .describe(`\`Expression\` value for \`${capitalizeWords(propertyName)}\` property in the ${this.context}`);
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

    checkValue(propertyName: string, expectedValue: string): Promise<void> {
        return test.step(`Check \`${capitalizeWords(propertyName)}\` property value is \`${expectedValue}\` in the ${
            this.context
        }`, async () => {
            const value = (await this.getAllPropertiesEditorTypes()).find(
                (item) => item.originalProperty === propertyName
            )!.value;
            expect(value).toBe(expectedValue);
        });
    }

    checkError(propertyName: string, errorMessage: string): Promise<void> {
        const newMessage = errorMessage ? `has error and error message is\`${errorMessage}\`` : 'has no error';
        return test.step(`Check \`${capitalizeWords(propertyName)}\` property value ${newMessage} in the ${
            this.context
        }`, async () => {
            const value = (await this.getAllPropertiesEditorTypes()).find(
                (item) => item.originalProperty === propertyName
            )!.errorMessage;
            expect(value).toBe(errorMessage);
        });
    }

    /**
     * Returns a locator for the Value Help input icon in the properties panel based on the provided property name.
     *
     * @param propertyName - name of the property.
     * @param title - title attribute of the icon.
     * @returns Locator for the Value Help input icon.
     */
    getValueHelpInput(propertyName: string, title = 'Select Icon'): Locator {
        this.title = title;
        return this.page
            .getByTestId(`${propertyName}--InputTypeWrapper`)
            .getByTitle(title)
            .describe(`\`Value Help\` icon for \`${capitalizeWords(propertyName)}\` property in the ${this.context}`);
    }

    /**
     * Fills the Filter Icons input field in the Value Help dialog.
     *
     * @param value - value to fill in.
     */
    async fillValueHelpFilter(value: string): Promise<void> {
        await test.step(`Fill \`Filter Icons\` input field with \`${value}\` in the \`${this.title}\` dialog`, async () => {
            const filterInput = this.page.getByPlaceholder('Filter Icons');
            await expect(filterInput).toBeVisible();
            await filterInput.fill(value);
        });
    }

    /**
     * Returns a locator for a table cell in the Value Help dialog based on the provided cell content.
     *
     * @param cellContent - content of the cell.
     * @returns Locator for the table cell with the specified content.
     */
    getValueHelpTableCell(cellContent: string): Locator {
        return this.page
            .getByRole('gridcell', { name: cellContent })
            .describe(`\`cell\` with \`${cellContent}\` in the \`${this.title}\` dialog`);
    }

    /**
     * Checks the value of a string editor property in the properties panel.
     *
     * @param propertyName - name of the property.
     * @param expectedValue - expected value of the property.
     */
    async checkStringEditorPropertyValue(propertyName: string, expectedValue: string): Promise<void> {
        await test.step(`Check \`${capitalizeWords(propertyName)}\` property value is \`${expectedValue}\` in the ${
            this.context
        }`, async () => {
            const locator = this.page.getByTestId(`${propertyName}--StringEditor`);
            await expect(locator).toBeVisible();
            await expect
                .poll(async () => await locator.inputValue(), {
                    timeout: 5000 // optional: set max wait time in ms
                })
                .toBe(expectedValue);
        });
    }

    /**
     * Returns a locator for the OK button in the Value Help dialog.
     *
     * @param btn - button name, default is 'OK'.
     * @param title - title or context of the button.
     * @returns Locator for the OK button.
     */
    getButton(btn = 'OK', title: string): Locator {
        return this.page.getByRole('button', { name: btn }).describe(`\`${btn}\` button in the \`${title}\``);
    }

    /**
     * Returns a locator for the filter option button in the Manage Filters callout.
     *
     * @param text - The text of the filter option to locate.
     * @returns Locator for the filter option button with the specified text.
     */
    getFilterOptionButton(text: string = 'Show only editable properties'): Locator {
        return this.page
            .locator('label')
            .filter({ hasText: `${text}` })
            .locator('i')
            .describe(`\`${text}\` option to uncheck in the Manage Filters callout in ${this.context}`);
    }

    /*
     * @returns Locator for the Filter Options button in the Manage Filters callout.
     */
    get mangeFiltersButton(): Locator {
        return this.page
            .locator('#control-property-editor-property-search-funnel-callout-target-id')
            .describe(`\`Filter Options\` button in the Manage Filters callout in the ${this.context}`);
    }

    /**
     * Opens the tooltip for a given property in the properties panel.
     *
     * @param property
     */
    async openTooltip(property: string): Promise<void> {
        await test.step(`Hover property \`${capitalizeWords(property)}\` to open tooltip in the ${
            this.context
        }`, async () => {
            const labelLocator = this.page.getByTestId(`${property}--Label`);
            const tooltipId = `${property}--PropertyTooltip--tooltip`;
            const tooltipLocator = this.page.locator(`#${tooltipId}`);

            for (let attempt = 1; attempt <= 3; attempt++) {
                await labelLocator.hover({ force: true });
                try {
                    await tooltipLocator.waitFor({ state: 'visible', timeout: 1000 });
                    return;
                } catch (e) {
                    if (attempt === 3) {
                        throw new Error(
                            `Tooltip for property "${property}" did not become visible after ${3} attempts.`
                        );
                    }
                    await this.page.waitForTimeout(200);
                }
            }
        });
    }

    /**
     * Extracts the content of a tooltip for a given property in the properties panel.
     *
     * @param property
     * @returns An object containing the extracted tooltip content.
     */
    async extractTooltipContent(property: string): Promise<any> {
        const tooltipId = `${property}--PropertyTooltip--tooltip`;
        const tooltip = this.page.locator(`#${tooltipId}`);

        // Title (usually in header)
        const title = await tooltip.locator(`div[id="${property}--PropertyTooltip-Header"] span`).first().textContent();

        // Section containing key-value pairs
        const section = tooltip.locator('section');
        const spans = await section.locator('span').elementHandles();

        // Extract key-value pairs (alternating span order)
        const pairs: Record<string, string> = {};
        for (let i = 0; i < spans.length - 1; i++) {
            const key = await spans[i].textContent();
            const value = await spans[i + 1].textContent();
            // Heuristic: key is not empty, value is not empty, and key !== value
            if (key && value && key !== value) {
                pairs[key.trim()] = value.trim();
                i++; // skip next, as it's already used as value
            }
        }

        // Info icon description (aria-label or title attribute)
        let infoIconDesc = '';
        const infoIcon = await section.locator('i[data-icon-name="Info"]').elementHandle();
        if (infoIcon) {
            infoIconDesc = (await infoIcon.getAttribute('aria-label')) || (await infoIcon.getAttribute('title')) || '';
        }

        // Footer description (by ID)
        const descriptionId = `${property}--PropertyTooltip-Footer`;
        const description = await tooltip.locator(`#${descriptionId}`).textContent();

        return {
            title: title?.trim() ?? '',
            ...pairs,
            infoIconDesc: infoIconDesc.trim(),
            description: description?.trim() ?? ''
        };
    }
    /**
     * Finds all property names in the properties panel.
     *
     * @returns An array of property names.
     */
    async findAllPropertiesPanel(): Promise<string[]> {
        const propertyNames =
            (await this.page.evaluate(() => {
                return Array.from(document.querySelectorAll('[data-testid$="--InputTypeWrapper"]'))
                    .map((wrapper) => {
                        const label = wrapper.querySelector('label[data-testid$="--Label"]');
                        return label ? label.textContent.trim() : '';
                    })
                    .filter(Boolean);
            })) ?? [];
        return propertyNames;
    }

    /**
     * Filters properties in the properties panel based on the provided text.
     *
     * @param text
     */
    async filterProperties(text: string): Promise<void> {
        const filterInput = this.page.getByPlaceholder('Filter Properties');
        await test.step(`Fill \`Filter Properties\` input field with \`${text}\``, async () => {
            await filterInput.fill(text);
        });
    }

    /**
     * Retrieves all properties along with their editor types and values from the properties panel.
     *
     * @returns An array of objects containing property names, editor types, checked types, and values.
     */
    async getAllPropertiesEditorTypes(): Promise<
        {
            property: string | null;
            editorType: string | null;
            checkedType: string | null;
            value: string;
            originalProperty: string;
            errorMessage?: string;
        }[]
    > {
        await this.page.waitForSelector('[data-testid$="--InputTypeWrapper"]');
        return await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('[data-testid$="--InputTypeWrapper"]')).map((wrapper) => {
                // Get property name from label
                const label = wrapper.querySelector('label[data-testid$="--Label"]');
                const propertyName = label ? label.textContent.trim() : null;

                const checkedButton = wrapper.querySelector('button.is-checked');
                let editorType = null;
                let checkedType = null;
                let value: string = '';
                let errorMessage: string = '';

                if (checkedButton) {
                    // Determine type by data-testid or title
                    const testid = checkedButton.getAttribute('data-testid') || '';
                    const title = checkedButton.getAttribute('title') || '';
                    if (testid.includes('StringEditor')) {
                        editorType = 'input';
                    } else if (testid.includes('enumMember') || testid.includes('DropdownEditor')) {
                        editorType = 'dropdown';
                    } else if (testid.includes('booleanTrue') || testid.includes('booleanFalse')) {
                        editorType = 'checkbox';
                    } else if (testid.includes('expression')) {
                        editorType = 'expression';
                    } else {
                        editorType = 'input';
                    }

                    checkedType = testid || title;
                }

                // Get value for string editor
                const stringInput = wrapper.querySelector('input[data-testid$="--StringEditor"]');
                if (stringInput) {
                    value = (stringInput as HTMLInputElement).value ?? '';
                }

                // Get value for dropdown editor
                const dropdownInput = wrapper.querySelector('[data-testid$="--DropdownEditor"] input');
                if (dropdownInput) {
                    value = (dropdownInput as HTMLInputElement).value ?? '';
                }

                // Get value for checkbox (true/false)
                if (editorType === 'checkbox') {
                    value = checkedButton?.getAttribute('title') || checkedType || '';
                }

                // Get value for expression editor
                const expressionInput = wrapper.querySelector(
                    'button[data-testid$="--InputTypeToggle--expression"].is-checked'
                );
                if (expressionInput) {
                    value = (stringInput as HTMLInputElement).value ?? '';
                }

                // Get error message if present
                const errorSpan = wrapper.querySelector('span[data-automation-id="error-message"]');
                if (errorSpan) {
                    errorMessage = errorSpan.textContent?.trim();
                }

                return {
                    property: propertyName,
                    originalProperty: (propertyName || '')
                        .split(' ')
                        .map((word, idx) =>
                            idx === 0
                                ? word.charAt(0).toLowerCase() + word.slice(1)
                                : word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(''),
                    editorType,
                    checkedType,
                    value,
                    errorMessage
                };
            });
        });
    }

    async checkIfPropertiesFromApiAreRendered(
        propertiesFromApi: { name: string; readableName: string; isEnabled: boolean; type: string; value: string }[],
        propertiesRendered: {
            property: string | null;
            editorType: string | null;
            checkedType: string | null;
            value: string;
        }[]
    ): Promise<void> {
        const namesFromApi = propertiesFromApi
            .filter((p) => p.isEnabled)
            .map((p: any) => {
                return { name: p.readableName, value: String(p.value) };
            })
            .filter((p) => p)
            .sort();
        const namesRendered = propertiesRendered
            .map((p: any) => {
                return { name: p.property, value: p.value };
            })
            .sort();
        let output = `Check only following properties are rendered in the ${this.context}\n`;
        for (const item of namesRendered) {
            output += `     - Property name \`${item.name}\` and its value is \`${
                item.value === '' ? 'NO_VALUE_SET' : item.value
            }\`\n`;
        }
        expect(namesRendered, output).toEqual(namesFromApi);
    }

    /**
     * Retrieves the visible properties from the provided messages.
     *
     * @param messages - Array of messages containing property information.
     * @returns Promise that resolves to an array of visible properties.
     */
    async getAllPropertiesFromMessage(
        messages: any[]
    ): Promise<{ name: string; readableName: string; isEnabled: boolean; type: string; value: string }[]> {
        const result = await waitForScene(
            () => Promise.resolve(messages.filter((m) => !!m.action?.payload?.properties).length > 0),
            2000
        );
        expect(result).toBe(true);

        const relevant = messages.filter((m) => !!m.action?.payload?.properties);
        return relevant[relevant.length - 1].action.payload.properties.map((p: any) => {
            return { name: p.name, readableName: p.readableName, isEnabled: p.isEnabled, type: p.type, value: p.value };
        });
    }

    async checkPropertiesListIsFilteredByText(filterText: string): Promise<void> {
        await test.step(`Check properties list is filtered by \`${filterText}\` in the ${this.context}`, async () => {
            const propertyNames = await this.findAllPropertiesPanel();
            for (const name of propertyNames) {
                expect(name.toLowerCase().includes(filterText.toLowerCase())).toBe(true);
            }
        });
    }

    async checkPropertyIndicator(
        propertyName: string,
        expected: 'Saved' | 'UnSaved' | 'SavedAndUnSaved'
    ): Promise<void> {
        const indicator = await this.page.evaluate(
            ([propertyName]) => {
                const svg = document.querySelector(`[id="${propertyName}--ChangeIndicator"]`);
                const circle = svg!.querySelector('circle');
                const path = svg!.querySelector('path');
                if (circle && circle.hasAttribute('stroke') && !circle.hasAttribute('fill') && !path) {
                    return 'UnSaved';
                }
                if (circle && circle.hasAttribute('fill') && !circle.hasAttribute('stroke') && !path) {
                    return 'Saved';
                }

                if (circle && circle.hasAttribute('stroke') && path && path.hasAttribute('fill')) {
                    return 'SavedAndUnSaved';
                }
            },
            [propertyName]
        );
        return test.step(`Check \`${CHANGE_INDICATOR[expected]}\` (${expected}) indicator is visible for the property \`${propertyName}\` in the ${this.context}`, async () => {
            expect(indicator).toBe(expected);
        });
    }

    async checkTooltipContent(property: string, expectedContent: any): Promise<void> {
        await this.openTooltip(property);
        const tooltip = await this.extractTooltipContent(property);
        await test.step(`Verify tooltip content \n\`\`\`json\n${JSON.stringify(
            tooltip,
            null,
            2
        )}\n\`\`\`\n\n`, async () => {
            expect(tooltip).toMatchObject(expectedContent);
        });
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
        await expect(this.toolbar.uiAdaptationModeButton).toBeEnabled({ timeout: test.info().timeout });
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

/**
 * Check if given files count are present in the changes folder.
 *
 * @param changesFolderPath - absolute path to the changes folder.
 * @param filesCount - number of files to be checked in the changes folder.
 * @param retry - number of retries.
 * @returns boolean
 */
export async function waitForChangeFile(changesFolderPath: string, filesCount = 1, retry = 5): Promise<boolean> {
    const path = changesFolderPath;
    for (let index = 0; index < retry; index++) {
        try {
            const files = readdirSync(path);
            if (files.length >= filesCount) {
                const text = filesCount < 1 ? 'no files' : `${files.length} files`;
                expect(files.length, `Confirm there are ${text} in the workspace`).toBeGreaterThanOrEqual(filesCount);
                return true;
            }
        } catch (e) {
            await delay();
        }
        return false;
    }
    return false;
}

export async function createChangeFlexFile(webappPath: string, version: string | undefined) {
    const path = join(webappPath, 'changes');

    // check if `changes` directory exists
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }

    // get the file details
    const fileDetails = await getChangeFile(version);
    const filePath = join(path, fileDetails.name);

    // write the content to the file
    await test.step(`Create change flex file \`${fileDetails.name}\` in the changes folder with content \n\`\`\`json\n${fileDetails.content}\n\`\`\`\n\n`, async () => {
        writeFileSync(filePath, fileDetails.content, 'utf-8');
    });
}

/**
 * This method contains file content after updating text of `Create` button.
 *
 * @param version - ui5 version
 * @returns `name` and `content` for change flex file
 */
export async function getChangeFile(version: string | undefined) {
    return {
        name: 'id_create_propertyChange.change',
        content: `{
  "changeType": "propertyChange",
  "reference": "adp.fiori.elements.v2",
  "namespace": "apps/adp.fiori.elements.v2/changes/",
  "creation": "2025-11-04T07:53:54.822Z",
  "projectId": "adp.fiori.elements.v2",
  "packageName": "$TMP",
  "support": {
    "generator": "@sap-ux/control-property-editor",
    "sapui5Version": "${version}",
    "command": "property"
  },
  "originalLanguage": "EN",
  "layer": "CUSTOMER_BASE",
  "fileType": "change",
  "fileName": "id_create_propertyChange.change",
  "content": {
    "property": "text",
    "newValue": "Create New"
  },
  "texts": {},
  "selector": {
    "id": "fiori.elements.v2.0::sap.suite.ui.generic.template.ListReport.view.ListReport::RootEntity--addEntry",
    "type": "sap.m.Button",
    "idIsLocal": false
  },
  "dependentSelector": {},
  "jsOnly": false
}
          `
    };
}

export function deleteChanges(changesPath: string): void {
    try {
        if (existsSync(changesPath)) {
            rmSync(changesPath, { recursive: true });
        }
    } catch (e) {
        console.log(`Failed to delete changes folder from ${changesPath} \n ${e}`);
    }
}
