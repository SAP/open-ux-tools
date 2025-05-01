import { expect, type FrameLocator, type Page } from '@sap-ux-private/playwright';

import { test } from '../../../adp-fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../../../project';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { gte, lt, satisfies } from 'semver';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

class QuickActionPanel {
    private readonly page: Page;
    get addControllerToPage() {
        return this.page.getByRole('button', { name: 'Add Controller to Page' });
    }
    get showPageController() {
        return this.page.getByRole('button', { name: 'Show Page Controller' });
    }
    get enableClearButton() {
        return this.page.getByRole('button', { name: 'Enable "Clear" Button in Filter Bar' });
    }
    get disableClearButton() {
        return this.page.getByRole('button', { name: 'Disable "Clear" Button in Filter Bar' });
    }
    get changeTableColumns() {
        return this.page.getByRole('button', { name: 'Change Table Columns' });
    }
    get addCustomTableAction() {
        return this.page.getByRole('button', { name: 'Add Custom Table Action' });
    }
    constructor(page: Page) {
        this.page = page;
    }
}

class Toolbar {
    private readonly page: Page;
    get saveButton() {
        return this.page.getByRole('button', { name: 'Save' });
    }
    get saveAndReloadButton() {
        return this.page.getByRole('button', { name: 'Save and Reload' });
    }
    get uiAdaptationButton() {
        return this.page.getByRole('button', { name: 'UI Adaptation' });
    }
    constructor(page: Page) {
        this.page = page;
    }
}
class ChangesPanel {
    private readonly page: Page;
    get reloadButton() {
        return this.page.getByRole('link', { name: 'Reload' });
    }
    constructor(page: Page) {
        this.page = page;
    }
}

class AdaptationEditorShell {
    private readonly page: Page;
    readonly quickActions: QuickActionPanel;
    readonly toolbar: Toolbar;
    readonly changesPanel: ChangesPanel;

    get reloadCompleted(): Promise<void> {
        return expect(this.toolbar.uiAdaptationButton).toBeEnabled();
    }
    constructor(page: Page) {
        this.page = page;
        this.quickActions = new QuickActionPanel(page);
        this.toolbar = new Toolbar(page);
        this.changesPanel = new ChangesPanel(page);
    }
}

class ListReport {
    private readonly frame: FrameLocator;
    get goButton() {
        return this.frame.getByRole('button', { name: 'Go' });
    }

    get clearButton() {
        return this.frame.getByRole('button', { name: 'Clear' });
    }
    constructor(frame: FrameLocator) {
        this.frame = frame;
    }
}

class TableSettings {
    private readonly frame: FrameLocator;
    get dialog() {
        return this.frame.getByLabel('View Settings');
    }
    get tableSettingsDialog() {
        return this.dialog;
    }
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

test.describe(`@quick-actions @fe-v2`, () => {
    test.describe(`@list-report`, () => {
        // test.afterEach(async ({ project }) => {
        // TODO: it looks like changes are not removed after each test
        // });
        test('Enable/Disable clear filter bar button', async ({ page, previewFrame, projectCopy }) => {
            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page);

            await expect(lr.clearButton).toBeHidden();

            await editor.quickActions.enableClearButton.click();

            await expect(lr.clearButton).toBeVisible();

            await editor.toolbar.saveButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect
                .poll(
                    async () => {
                        const changesDirectory = join(projectCopy, 'webapp', 'changes');
                        const changes = await readdir(changesDirectory);
                        if (changes.length) {
                            const text = await readFile(join(changesDirectory, changes[0]), { encoding: 'utf-8' });
                            return JSON.parse(text);
                        }
                        return {};
                    },
                    {
                        message: 'make sure change file is created'
                    }
                )
                .toEqual(
                    expect.objectContaining({
                        fileType: 'change',
                        changeType: 'propertyChange',
                        content: expect.objectContaining({ property: 'showClearOnFB', newValue: true })
                    })
                );

            await editor.quickActions.disableClearButton.click();

            await expect(lr.clearButton).toBeHidden();

            await editor.toolbar.saveButton.click();

            await expect(editor.toolbar.saveButton).toBeDisabled();

            await expect
                .poll(
                    async () => {
                        const changesDirectory = join(projectCopy, 'webapp', 'changes');
                        try {
                            const changes = await readdir(changesDirectory);
                            if (changes.length) {
                                const text = await readFile(join(changesDirectory, changes[0]), { encoding: 'utf-8' });
                                return JSON.parse(text);
                            }
                        } catch (e) {
                            // ignore error
                        }
                        return {};
                    },
                    {
                        message: 'make sure change file is updated'
                    }
                )
                .toEqual(
                    expect.objectContaining({
                        fileType: 'change',
                        changeType: 'propertyChange',
                        content: expect.objectContaining({ property: 'showClearOnFB', newValue: false })
                    })
                );
        });

        test('Add controller to page ', async ({ page, previewFrame, projectCopy, ui5Version }) => {
            test.skip(satisfies(ui5Version, '^1.135.0'), 'UI5 has bug with controller creation in this version');

            const lr = new ListReport(previewFrame);
            const editor = new AdaptationEditorShell(page);

            await editor.quickActions.addControllerToPage.click();

            await previewFrame.getByRole('textbox', { name: 'Controller Name' }).fill('TestController');
            await previewFrame.getByLabel('Footer actions').getByRole('button', { name: 'Create' }).click();

            if (lt(ui5Version, '1.136.0')) {
                await expect(page.getByText('Changes detected!')).toBeVisible();
            }

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

            await expect(editor.changesPanel.reloadButton).toBeHidden();

            await expect(lr.goButton).toBeVisible();

            await editor.reloadCompleted;

            await editor.quickActions.showPageController.click();

            await expect(
                previewFrame.getByText('adp.fiori.elements.v2/changes/coding/TestController.js')
            ).toBeVisible();

            await expect(previewFrame.getByRole('button', { name: 'Open in VS Code' })).toBeVisible();
        });

        test('Change table columns', async ({ page, previewFrame, projectCopy, ui5Version }) => {
            test.skip(
                gte(ui5Version, '1.96.0', { loose: true }) && !satisfies(ui5Version, '^1.108.0'),
                'Change table columns is not supported in this version'
            );

            const tableSettings = new TableSettings(previewFrame);
            const editor = new AdaptationEditorShell(page);

            await editor.quickActions.changeTableColumns.click();

            await expect(tableSettings.tableSettingsDialog.getByText('String Property')).toBeVisible();
            await expect(tableSettings.tableSettingsDialog.getByText('Boolean Property')).toBeVisible();
            await expect(tableSettings.tableSettingsDialog.getByText('Currency')).toBeVisible();
        });

        test('Add Custom Table Action', async ({ page, previewFrame, projectCopy, ui5Version }) => {
            test.skip(
                lt(ui5Version, '1.96.0', { loose: true }),
                'Change table columns is not supported in this version'
            );

            const lr = new ListReport(previewFrame);
            const tableSettings = new TableSettings(previewFrame);
            const editor = new AdaptationEditorShell(page);

            await editor.quickActions.addCustomTableAction.click();

            await previewFrame.getByRole('textbox', { name: 'Fragment Name' }).fill('table-action');
            await previewFrame.getByLabel('Footer actions').getByRole('button', { name: 'Create' }).click();

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
        });
    });
});
