import { expect } from '@sap-ux-private/playwright';

import { test } from '../fixture';
import { SIMPLE_APP } from '../../project';

test.use({ projectConfig: SIMPLE_APP });

test.describe(`Preview rendering`, () => {
    test('Click on Go button and check an element ', async ({ page }) => {
        await page.getByRole('button', { name: 'Go', exact: true }).click();
        await expect(page.getByText('ProductForEdit_0', { exact: true })).toBeVisible();
    });
});
