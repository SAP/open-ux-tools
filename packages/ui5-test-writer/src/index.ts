import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { ManifestNamespace } from '@sap-ux/ui5-config';
import type { FEV4OPAConfig, FEV4OPAPageConfig, FEV4ManifestTarget } from './types';
import { SupportedPageTypes } from './types';

type Manifest = ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile;

function getAppFromManifest(manifest: Manifest): { appID: string; appPath: string } {
    const appID = manifest['sap.app'].id;
    const appPath = appID.split('.').join('/');

    return { appID, appPath };
}

/**
 * Create the page configuration object from the app descriptor and the target key.
 * @param manifest - the app descriptor of the app
 * @param targetKey - the key of the target in the manifest
 * @returns Page configuration object, or undefined if the target type is not supported
 */
function createPageConfig(manifest: Manifest, targetKey: string): FEV4OPAPageConfig | undefined {
    const appTargets = manifest['sap.ui5']?.routing?.targets;
    const target = appTargets && (appTargets[targetKey] as FEV4ManifestTarget);
    const { appID, appPath } = getAppFromManifest(manifest);

    if (
        target?.type === 'Component' &&
        target?.name &&
        target.name in SupportedPageTypes &&
        target?.id &&
        target?.options?.settings?.entitySet
    ) {
        return {
            appPath,
            appID,
            targetKey,
            componentID: target.id,
            entitySet: target.options.settings.entitySet,
            template: SupportedPageTypes[target.name],
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
 * @param opaConfig - parameters for the generation
 * @param opaConfig.scriptName - the name of the OPA journey file. If not specified, 'FirstJourney' will be used
 * @returns OPA test configuration object
 */
function createConfig(manifest: Manifest, opaConfig: { scriptName?: string }): FEV4OPAConfig {
    // General application info
    const { appID, appPath } = getAppFromManifest(manifest);

    const config: FEV4OPAConfig = {
        appID,
        appPath,
        pages: [],
        opaJourneyFileName: opaConfig.scriptName || 'FirstJourney'
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
 * @param opaConfig - parameters for the generation
 * @param opaConfig.scriptName - the name of the OPA journey file. If not specified, 'FirstJourney' will be used
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
export function generateOPAFiles(basePath: string, opaConfig: { scriptName?: string }, fs?: Editor): Editor {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifest = fs.readJSON(join(basePath, 'webapp/manifest.json')) as any as Manifest;
    const config = createConfig(manifest, opaConfig);

    const rootCommonTemplateDirPath = join(__dirname, '../templates/common');
    const rootV4TemplateDirPath = join(__dirname, '../templates/v4'); // Only v4 is supported for the time being
    const testOutDirPath = join(basePath, 'webapp/test');

    // Test files
    fs.copy(join(rootCommonTemplateDirPath, 'testsuite.qunit.html'), join(testOutDirPath, 'testsuite.qunit.html'));
    fs.copy(join(rootCommonTemplateDirPath, 'testsuite.qunit.js'), join(testOutDirPath, 'testsuite.qunit.js'));

    // Integration (OPA) test files
    fs.copyTpl(
        join(rootV4TemplateDirPath, 'integration', 'opaTests.*.*'),
        join(testOutDirPath, 'integration'),
        config,
        undefined,
        {
            globOptions: { dot: true }
        }
    );

    // Pages files (one for each page in the app)
    config.pages.forEach((page) => {
        writePageObject(page, rootV4TemplateDirPath, testOutDirPath, fs!);
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
        join(rootV4TemplateDirPath, 'integration/FirstJourney.js'),
        join(testOutDirPath, `integration/${config.opaJourneyFileName}.js`),
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
 * @param pageObjectParameters - parameters for the page
 * @param pageObjectParameters.targetKey - the key of the target in the manifest file corresponding to the page
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
export function generatePageObjectFile(
    basePath: string,
    pageObjectParameters: { targetKey: string },
    fs?: Editor
): Editor {
    if (!fs) {
        fs = create(createStorage());
    }

    const manifest = fs.readJSON(join(basePath, 'webapp/manifest.json')) as any as Manifest;
    const pageConfig = createPageConfig(manifest, pageObjectParameters.targetKey);
    if (pageConfig) {
        const rootTemplateDirPath = join(__dirname, '../templates/v4'); // Only v4 is supported for the time being
        const testOutDirPath = join(basePath, 'webapp/test');
        writePageObject(pageConfig, rootTemplateDirPath, testOutDirPath, fs);
    }

    return fs;
}
