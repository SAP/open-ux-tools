import { getUI5Versions } from '@sap-ux/ui5-info';

/**
 * Global setup.
 *
 * It fetches maintained UI5 versions and add them to `process.env` variable.
 */
async function globalSetup(): Promise<void> {
    const maintainedVersions = await getUI5Versions({
        minSupportedUI5Version: '1.71',
        includeMaintained: true,
        onlyLatestPatchVersion: true
    });
    process.env.UI5Versions = JSON.stringify(maintainedVersions);
}

export default globalSetup;
