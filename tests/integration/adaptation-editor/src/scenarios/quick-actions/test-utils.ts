import { readdir, readFile } from 'fs/promises';
import { join } from 'node:path';
import { expect, test, type FrameLocator, type Page, type Locator } from '@sap-ux-private/playwright';
import { gte, lte } from 'semver';

interface Changes {
    annotations: Record<string, string>;
    coding: Record<string, string | RegExp>;
    fragments: Record<string, string | RegExp>;
    changes: object[];
}

const escapedId = (id: string) => id.replace(/\\/g, '\\\\').replace(/([ #;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');

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
    private readonly ui5Version: string;
    private readonly context: string = 'Running Application Preview';
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
        return this.frame.getByRole('button', { name: 'Clear' }).describe('Clear button in the List Report filter bar');
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
     */
    async clickOnGoButton(): Promise<void> {
        await test.step(`Click on \`Go\` button.`, async () => {
            await this.goButton.click();
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
        await expect(button, `Check \`${buttonName}\` quick action is disabled ${tooltip}`).toBeDisabled({
            timeout: 10000
        });
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
        await expect(button).toHaveAttribute('title', expectedTitle, { timeout: 10000 });
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
     * Checks if the "Save" button is disabled.
     *
     * @returns Promise that resolves when the "Save" button is verified to be disabled.
     */
    async isDisabled(): Promise<void> {
        return await expect(this.saveButton, `Check \`Save\` button in the toolbar is disabled`).toBeDisabled();
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
                if (content instanceof RegExp) {
                    matchers[filename] = expect.stringMatching(content);
                } else {
                    matchers[filename] = expect.stringMatching(new RegExp(content));
                }
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
    return String(input)
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
