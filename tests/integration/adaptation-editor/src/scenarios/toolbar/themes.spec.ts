import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@toolbar @themes @cpe @adp`, () => {
    // test.setTimeout(5 * 60 * 10000);
    test('1. Change Theme', {}, async ({ page, ui5Version }) => {
        const editor = new AdaptationEditorShell(page, ui5Version);
        await editor.reloadCompleted();
        await editor.checkTheme('dark modern');

        await editor.toolbar.selectTheme('light');
        await editor.checkTheme('light modern');

        await editor.toolbar.selectTheme('dark');
        await editor.checkTheme('dark modern');
        await editor.toolbar.selectTheme('High contrast');
        await editor.checkTheme('high contrast black');

        await test.step('Reload the editor and verify last selected theme is persisted', async () => {
            await page.reload();
            await editor.reloadCompleted();
        });
        await editor.checkTheme('high contrast black');
    });
});
