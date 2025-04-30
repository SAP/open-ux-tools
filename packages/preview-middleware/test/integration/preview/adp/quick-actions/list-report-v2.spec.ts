import { expect } from '@sap-ux-private/playwright';

import { test } from '../../../adp-fixture';
import { ADP_FIORI_ELEMENTS_V2 } from '../../../../project';

test.use({ projectConfig: ADP_FIORI_ELEMENTS_V2 });

test.describe(`Quick Actions @quick-actions @fe-v2 @list-report`, () => {
    test.describe(`List Report`, () => {
        test('Click on Go button and check an element ', async ({ page, previewFrame }) => {
            await page.getByRole('button', { name: 'Navigation' }).click();
            await previewFrame.getByRole('button', { name: 'Go' }).click();
            await expect(previewFrame.getByRole('gridcell', { name: 'Hello' })).toBeVisible();
        });
    });
});
