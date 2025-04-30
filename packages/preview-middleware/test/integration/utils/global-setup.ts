import { join } from 'path';
import { install } from '@sap-ux-private/playwright';

/**
 * Global setup.
 *
 * It fetches maintained UI5 versions and add them to `process.env` variable.
 */
async function globalSetup(): Promise<void> {
    await install(join(__dirname, '..', '..', 'fixtures', 'mock'));
}

export default globalSetup;
