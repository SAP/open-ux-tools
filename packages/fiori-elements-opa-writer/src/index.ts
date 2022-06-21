import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { ManifestNamespace } from '@sap-ux/ui5-config';
import type { FEV4OPAConfig } from './types';

type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile & { [key: string]: any };

/**
 * Create the configuration object from the app descriptor and the FLP app name.
 *
 * @param manifest - the app descriptor of the target app
 * @returns OPA test configuration object
 */
function createConfig(manifest: Manifest): FEV4OPAConfig {
    // General application info
    const appID = manifest['sap.app'].id;
    const appPath = appID.split('.').join('/');

    const config: FEV4OPAConfig = {
        appID,
        appPath,
        pages: []
    };

    // Identify startup targets from the routes
    const appRoutes = (manifest['sap.ui5']?.routing?.routes ?? []) as any[];
    // Find the route with an empty pattern (except for the trailing query part)
    const startupRoute = appRoutes.find((route: { pattern: string }) => {
        return route.pattern.replace(':?query:', '') === '';
    });
    let startupTargets = startupRoute?.target ?? [];
    if (!Array.isArray(startupTargets)) {
        startupTargets = [startupTargets];
    }

    // Find all targets corresponding to a ListReport or ObjectPage
    const appTargets = manifest['sap.ui5']?.routing?.targets;
    for (const targetName in appTargets) {
        const target = appTargets[targetName];
        if (
            target.type === 'Component' &&
            (target.name === 'sap.fe.templates.ListReport' || target.name === 'sap.fe.templates.ObjectPage') &&
            target.id &&
            (target.options as any)?.settings?.entitySet
        ) {
            config.pages.push({
                appPath,
                appID,
                name: targetName,
                componentID: target.id as string,
                entitySet: (target.options as any).settings.entitySet as string,
                template: target.name.replace('sap.fe.templates.', ''),
                isStartup: startupTargets.includes(targetName)
            });
        }
    }

    return config;
}

/**
 * Generate OPA test files for a Fiori elements for OData V4 application.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
export async function generateOPA(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifest = fs.readJSON(join(basePath, 'webapp/manifest.json')) as Manifest;
    const config = createConfig(manifest);

    const rootTemplateDirPath = join(__dirname, '../templates/v4'); // Only v4 is supported for the time being
    const testOutDirPath = join(basePath, 'webapp/test');

    // Test files
    fs?.copy(join(rootTemplateDirPath, 'testsuite.qunit.html'), join(testOutDirPath, 'testsuite.qunit.html'));
    fs?.copy(join(rootTemplateDirPath, 'testsuite.qunit.js'), join(testOutDirPath, 'testsuite.qunit.js'));

    // Integration (OPA) test files
    fs?.copyTpl(
        join(rootTemplateDirPath, 'integration/opaTests.qunit.html'),
        join(testOutDirPath, 'integration/opaTests.qunit.html'),
        config,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
    fs?.copyTpl(
        join(rootTemplateDirPath, 'integration/opaTests.qunit.js'),
        join(testOutDirPath, 'integration/opaTests.qunit.js'),
        config,
        undefined,
        {
            globOptions: { dot: true }
        }
    );

    // Pages files (one for each page in the app)
    config.pages.forEach((page) => {
        fs?.copyTpl(
            join(rootTemplateDirPath, 'integration/TestPage.js'),
            join(testOutDirPath, `integration/pages/${page.name}.js`),
            page,
            undefined,
            {
                globOptions: { dot: true }
            }
        );
    });

    // OPA Journey file
    const startPages = config.pages.filter((page) => page.isStartup).map((page) => page.name);
    const startListReportPage = config.pages.find((page) => {
        return page.isStartup && page.template === 'ListReport';
    });
    const journeyParams = {
        startPages,
        startLR: startListReportPage?.name
    };
    fs?.copyTpl(
        join(rootTemplateDirPath, 'integration/FirstJourney.js'),
        join(testOutDirPath, 'integration/FirstJourney.js'),
        journeyParams,
        undefined,
        {
            globOptions: { dot: true }
        }
    );

    return fs;
}
