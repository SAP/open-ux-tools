import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { ManifestNamespace } from '@sap-ux/ui5-config';
import type { FEV4OPAConfig, FEV4OPAPageConfig } from './types';
import { SupportedPageTypes } from './types';

type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile & { [key: string]: any };

/**
 * Create the page configuration object from the app descriptor and the target key.
 * @param manifest - the app descriptor of the app
 * @param targetKey - the key of the target in the manifest
 * @returns Page configuration object, or undefined if the target type is not supported
 */
function createPageConfig(manifest: Manifest, targetKey: string): FEV4OPAPageConfig | undefined {
    const appTargets = manifest['sap.ui5']?.routing?.targets;
    const target = appTargets && appTargets[targetKey];
    const appID = manifest['sap.app'].id;
    const appPath = appID.split('.').join('/');

    if (
        target &&
        target.type === 'Component' &&
        (target.name as string) in SupportedPageTypes &&
        target.id &&
        (target.options as any)?.settings?.entitySet
    ) {
        return {
            appPath,
            appID,
            targetKey,
            componentID: target.id as string,
            entitySet: (target.options as any).settings.entitySet as string,
            template: SupportedPageTypes[target.name as string],
            isStartup: false
        };
    } else {
        return undefined;
    }
}
/**
 * Create the configuration object from the app descriptor.
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

    // Create page configurations in supported cases
    const appTargets = manifest['sap.ui5']?.routing?.targets;
    for (const targetKey in appTargets) {
        const pageConfig = createPageConfig(manifest, targetKey);
        if (pageConfig) {
            pageConfig.isStartup = startupTargets.includes(targetKey);
            config.pages.push(pageConfig);
        }
    }

    return config;
}

/**
 * Writes a page object in a mem-fs-editor.
 *
 * @param pageConfig - the page configuration object
 * @param rootTemplateDirPath - template root directory
 * @param testOutDirPath - output test directory (.../webapp/test)
 * @param fs - a reference to a mem-fs editor
 */
function writePageObject(
    pageConfig: FEV4OPAPageConfig,
    rootTemplateDirPath: string,
    testOutDirPath: string,
    fs: Editor
) {
    fs.copyTpl(
        join(rootTemplateDirPath, `integration/pages/${pageConfig.template}.js`),
        join(testOutDirPath, `integration/pages/${pageConfig.targetKey}.js`),
        pageConfig,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
}

/**
 * Generate OPA test files for a Fiori elements for OData V4 application.
 * Note: this can potentially overwrite existing files in the webapp/test folder.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
export function generateOPAFiles(basePath: string, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifest = fs.readJSON(join(basePath, 'webapp/manifest.json')) as Manifest;
    const config = createConfig(manifest);

    const rootTemplateDirPath = join(__dirname, '../templates/v4'); // Only v4 is supported for the time being
    const testOutDirPath = join(basePath, 'webapp/test');

    // Test files
    fs.copy(join(rootTemplateDirPath, 'testsuite.qunit.html'), join(testOutDirPath, 'testsuite.qunit.html'));
    fs.copy(join(rootTemplateDirPath, 'testsuite.qunit.js'), join(testOutDirPath, 'testsuite.qunit.js'));

    // Integration (OPA) test files
    fs.copyTpl(
        join(rootTemplateDirPath, 'integration/opaTests.qunit.html'),
        join(testOutDirPath, 'integration/opaTests.qunit.html'),
        config,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
    fs.copyTpl(
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
        writePageObject(page, rootTemplateDirPath, testOutDirPath, fs!);
    });

    // OPA Journey file
    const startPages = config.pages.filter((page) => page.isStartup).map((page) => page.targetKey);
    const startListReportPage = config.pages.find((page) => {
        return page.isStartup && page.template === 'ListReport';
    });
    const journeyParams = {
        startPages,
        startLR: startListReportPage?.targetKey
    };
    fs.copyTpl(
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

/**
 * Generate a page object file for a Fiori elements for OData V4 application.
 * Note: this doesn't modify other existing files in the webapp/test folder.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param targetKey - the key of the target in the manifest file corresponding to the page
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
export function generatePageObjectFile(basePath: string, targetKey: string, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifest = fs.readJSON(join(basePath, 'webapp/manifest.json')) as Manifest;
    const pageConfig = createPageConfig(manifest, targetKey);
    if (pageConfig) {
        const rootTemplateDirPath = join(__dirname, '../templates/v4'); // Only v4 is supported for the time being
        const testOutDirPath = join(basePath, 'webapp/test');
        writePageObject(pageConfig, rootTemplateDirPath, testOutDirPath, fs);
    }

    return fs;
}
