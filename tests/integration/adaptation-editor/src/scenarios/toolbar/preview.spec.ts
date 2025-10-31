import { expect } from '@sap-ux-private/playwright';
import { test } from '../../fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../project';
import { AdaptationEditorShell, ListReport } from '../test-utils';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`@toolbar @preview-scale @cpe @adp`, () => {
    // test.setTimeout(5 * 60 * 10000);
    test(
        '1. Automatic zoom level adjustment',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version, previewFrame }) => {
            // wait for frame to be loaded
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const lr = new ListReport(previewFrame);
            await lr.checkAppLoaded();

            // get transform property of `iframe` element
            expect(
                await editor.getCssTransform('iframe'),
                'Check that zoom level is automatically adjusted so the preview fits in the content'
            ).toStrictEqual('matrix(0.898333, 0, 0, 0.898333, 0, 0)');
        }
    );

    test(
        '2. Increase and decrease zoom level',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version, previewFrame }) => {
            // wait for frame to be loaded
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const lr = new ListReport(previewFrame);
            await lr.checkAppLoaded();

            let currentScaleValue = await editor.toolbar.getCurrentPreviewScale();
            await editor.toolbar.zoomInButton.click();
            const updatedValue = await editor.toolbar.getCurrentPreviewScale();
            const diff = subtractPercent(updatedValue, currentScaleValue);
            expect(diff, `Check that zoom level has been increased by \`${diff}%\``).toEqual(10);
            currentScaleValue = await editor.toolbar.getCurrentPreviewScale();
            await editor.toolbar.zoomOutButton.click();
            const updatedValueZoomOut = await editor.toolbar.getCurrentPreviewScale();
            const diff2 = subtractPercent(currentScaleValue, updatedValueZoomOut);
            expect(diff2, `Check that zoom level has been reduced by \`${diff2}%\``).toEqual(10);
            await editor.toolbar.changePreviewScale('50%');
            expect(
                await editor.toolbar.getCurrentPreviewScale(),
                'Check that zoom level has been changed to `50%`'
            ).toEqual('50%');
        }
    );

    test(
        '3. Fit mode',
        {
            annotation: {
                type: 'skipUI5Version',
                description: '<1.84.0'
            }
        },
        async ({ page, ui5Version, previewFrame }) => {
            // wait for frame to be loaded
            const editor = new AdaptationEditorShell(page, ui5Version);
            await editor.reloadCompleted();
            const lr = new ListReport(previewFrame);
            await lr.checkAppLoaded();

            await editor.toolbar.changePreviewScale('Fit');
            expect(
                await editor.toolbar.getCurrentPreviewScale(),
                'Check that zoom level has been changed to `Fit`'
            ).toEqual('Fit');
            await test.step('Check the preview is scaled when window is resized', async () => {
                await page.setViewportSize({ width: 1200, height: 800 });
            });
        }
    );
});

function subtractPercent(a: string, b: string): number {
    const numA = parseFloat(a.replace('%', ''));
    const numB = parseFloat(b.replace('%', ''));
    return numA - numB;
}
