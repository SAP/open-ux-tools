import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import type { Manifest } from '@sap-ux/project-access';
import type {
    FEV4OPAConfig,
    FEV4OPAPageConfig,
    FEV4ManifestTarget,
    JourneyParams,
    AppFeatures,
    WriteContext
} from './types';
import { SupportedPageTypes, ValidationError } from './types';
import { t } from './i18n';
import { FileName, DirName, getWebappPath } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
import { getAppFeatures } from './utils/modelUtils';
import {
    addIntegrationOldToGitignore,
    addPathsToQUnitJs,
    hasVirtualOPA5,
    readHtmlTargetFromQUnitJs
} from './utils/opaQUnitUtils';

/**
 * Reads the manifest for an app.
 *
 * @param fs - a reference to a mem-fs editor
 * @param basePath - the root folder of the app
 * @returns the manifest object. An exception is thrown if the manifest cannot be read.
 */
export function readManifest(fs: Editor, basePath: string): Manifest {
    const manifest = fs.readJSON(join(basePath, DirName.Webapp, FileName.Manifest)) as any as Manifest;
    if (!manifest) {
        throw new ValidationError(
            t('error.cannotReadManifest', {
                filePath: join(basePath, DirName.Webapp, FileName.Manifest)
            })
        );
    }
    return manifest;
}

/**
 * Retrieves the application type of the main datasource (FreeStyle, FE V2 or FE V4).
 *
 * @param manifest - the app descriptor of the app
 * @returns {{ applicationType: string, hideFilterBar: boolean }} An object containing the application type and hideFilterBar flag. An exception is thrown if it can't be found or if it's not supported
 */
function getAppTypeAndHideFilterBarFromManifest(manifest: Manifest): {
    applicationType: string;
    hideFilterBar: boolean;
} {
    const appTargets = manifest['sap.ui5']?.routing?.targets;
    let hideFilterBar: boolean = false;
    let isFEV4 = false;
    for (const targetKey in appTargets) {
        const target = appTargets[targetKey] as FEV4ManifestTarget;
        if (target.type === 'Component' && target.name && target.name in SupportedPageTypes) {
            isFEV4 = true;
            if (SupportedPageTypes[target.name] === 'ListReport') {
                hideFilterBar = target.options?.settings?.hideFilterBar ?? false;
            }
        }
    }

    if (!isFEV4) {
        throw new ValidationError(t('error.badApplicationType'));
    }

    return { applicationType: 'v4', hideFilterBar }; // For the time being, only FE V4 is supported
}

/**
 * Retrieves appID and appPath from the manifest.
 *
 * @param manifest - the app descriptor of the app
 * @param forcedAppID - the appID in case we don't want to read it from the manifest
 * @returns appID and appPath
 */
function getAppFromManifest(manifest: Manifest, forcedAppID?: string): { appID: string; appPath: string } {
    const appID = forcedAppID ?? manifest['sap.app']?.id;
    const appPath = appID?.split('.').join('/');

    if (!appID || !appPath) {
        throw new ValidationError(t('error.cannotReadAppID'));
    }

    return { appID, appPath };
}

/**
 * Create the page configuration object from the app descriptor and the target key.
 *
 * @param manifest - the app descriptor of the app
 * @param targetKey - the key of the target in the manifest
 * @param forcedAppID - the appID in case we don't want to read it from the manifest
 * @returns Page configuration object, or undefined if the target type is not supported
 */
function createPageConfig(manifest: Manifest, targetKey: string, forcedAppID?: string): FEV4OPAPageConfig | undefined {
    const appTargets = manifest['sap.ui5']?.routing?.targets;
    const target = appTargets && (appTargets[targetKey] as FEV4ManifestTarget);
    const { appID, appPath } = getAppFromManifest(manifest, forcedAppID);

    if (
        target?.type === 'Component' &&
        target?.name &&
        target.name in SupportedPageTypes &&
        target?.id &&
        (target?.options?.settings?.entitySet || target?.options?.settings?.contextPath)
    ) {
        const pageConfig: FEV4OPAPageConfig = {
            appPath,
            appID,
            targetKey,
            componentID: target.id,
            template: SupportedPageTypes[target.name],
            isStartup: false
        };

        if (target.options.settings.contextPath) {
            pageConfig.contextPath = target.options.settings.contextPath;
        } else if (target.options.settings.entitySet) {
            pageConfig.entitySet = target.options.settings.entitySet;
        }
        return pageConfig;
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
 * @param opaConfig.htmlTarget - the name of the html file that will be used in the OPA journey file. If not specified, 'index.html' will be used
 * @param opaConfig.appID - the appID. If not specified, will be read from the manifest in sap.app/id
 * @param hideFilterBar - whether the filter bar should be hidden in the generated tests
 * @returns OPA test configuration object
 */
function createConfig(
    manifest: Manifest,
    opaConfig: { scriptName?: string; appID?: string; htmlTarget?: string },
    hideFilterBar: boolean
): FEV4OPAConfig {
    // General application info
    const { appID, appPath } = getAppFromManifest(manifest, opaConfig.appID);

    const config: FEV4OPAConfig = {
        appID,
        appPath,
        pages: [],
        opaJourneyFileName: opaConfig.scriptName ?? 'FirstJourney',
        htmlTarget: opaConfig.htmlTarget ?? 'index.html',
        hideFilterBar
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
        const pageConfig = createPageConfig(manifest, targetKey, opaConfig.appID);
        if (pageConfig) {
            pageConfig.isStartup = startupTargets.includes(targetKey);
            config.pages.push(pageConfig);
        }
    }

    return config;
}

/**
 * Finds the initial ListReport page and the first Object page from the app.
 *
 * @param pages - the page configs of the app
 * @param manifest - the app descriptor of the target app
 * @returns the page fonfigs for the LR and the OP if they're found
 */
function findLROP(
    pages: FEV4OPAPageConfig[],
    manifest: Manifest
): { pageLR?: FEV4OPAPageConfig; pageOP?: FEV4OPAPageConfig } {
    const pageLR = pages.find((page) => {
        return page.isStartup && page.template === 'ListReport';
    });

    if (!pageLR) {
        return {};
    }

    const appTargets = manifest['sap.ui5']?.routing?.targets;
    const appRoutes = (manifest['sap.ui5']?.routing?.routes ?? []) as any[];
    const target = appTargets?.[pageLR.targetKey] as FEV4ManifestTarget;

    if (!target?.options?.settings?.navigation) {
        return { pageLR }; // No navigation from LR
    }

    // Find all targets that can be navigated from the LR page
    const navigatedTargetKeys: string[] = [];
    for (const navKey in target.options.settings.navigation) {
        const navObject = target.options.settings.navigation[navKey];
        const navigatedRoute =
            navObject.detail?.route &&
            appRoutes.find((route) => {
                return route.name === navObject.detail?.route;
            });

        if (Array.isArray(navigatedRoute?.target)) {
            navigatedTargetKeys.push(...navigatedRoute.target);
        } else if (navigatedRoute?.target) {
            navigatedTargetKeys.push(navigatedRoute.target);
        }
    }

    // Find the first navigated page that is valid and not the starting LR
    let pageOP: FEV4OPAPageConfig | undefined;
    for (let i = 0; i < navigatedTargetKeys.length && !pageOP; i++) {
        if (navigatedTargetKeys[i] === pageLR.targetKey) {
            continue; // This can happen in the FCL case where the LR is also part of the route's targets to the OP
        }

        pageOP = pages.find((page) => {
            return page.targetKey === navigatedTargetKeys[i];
        });
    }

    return { pageLR, pageOP };
}

/**
 * Writes common test files, page objects, and the first journey file.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param rootCommonTemplateDirPath - template root directory for common files
 */
function writeCommonAndPageFiles(writeContext: WriteContext, rootCommonTemplateDirPath: string): void {
    const { config, rootV4TemplateDirPath, testOutDirPath, editor, journeyParams } = writeContext;

    // Common test files
    editor.copyTpl(
        join(rootCommonTemplateDirPath),
        testOutDirPath,
        // unit tests are not added for Fiori elements app
        { appId: config.appID },
        undefined,
        {
            globOptions: { dot: true }
        }
    );

    // Pages files (one for each page in the app)
    config.pages.forEach((page) => {
        writePageObject(page, rootV4TemplateDirPath, testOutDirPath, editor);
    });

    editor.copyTpl(
        join(rootV4TemplateDirPath, 'integration', 'FirstJourney.js'),
        join(testOutDirPath, 'integration', `${config.opaJourneyFileName}.js`),
        journeyParams,
        undefined,
        {
            globOptions: { dot: true }
        }
    );

    // Journey Runner
    editor.copyTpl(
        join(rootV4TemplateDirPath, 'integration', 'pages', 'JourneyRunner.js'),
        join(testOutDirPath, 'integration', 'pages', 'JourneyRunner.js'),
        config,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
}

/**
 * Writes journey files for list report, object pages and FPM pages.
 *
 * @param appFeatures - object containing feature data for list report, object pages, and FPM
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param isStandalone - whether the generation is run in standalone mode (not during app generation)
 * @param hasJourneyRunner - whether a JourneyRunner.js already exists (standalone upgrade path)
 * @param virtualOPA5Configured - whether virtual OPA5 is configured
 */
function writeJourneyFiles(
    appFeatures: AppFeatures,
    writeContext: WriteContext,
    isStandalone: boolean,
    hasJourneyRunner = false,
    virtualOPA5Configured = false
): void {
    const { config, rootV4TemplateDirPath, testOutDirPath, editor, journeyParams } = writeContext;
    const generatedJourneyPages: string[] = [];

    if (appFeatures.listReport?.name) {
        editor.copyTpl(
            join(rootV4TemplateDirPath, 'integration', 'ListReportJourney.js'),
            join(testOutDirPath, 'integration', `${appFeatures.listReport.name}Journey.js`),
            {
                ...journeyParams,
                ...appFeatures.listReport
            },
            undefined,
            {
                globOptions: { dot: true }
            }
        );
        generatedJourneyPages.push(appFeatures.listReport.name);
    }

    if (appFeatures.objectPages && appFeatures.objectPages.length > 0) {
        appFeatures.objectPages.forEach((objectPage) => {
            if (objectPage.name) {
                editor.copyTpl(
                    join(rootV4TemplateDirPath, 'integration', 'ObjectPageJourney.js'),
                    join(testOutDirPath, 'integration', `${objectPage.name}Journey.js`),
                    {
                        ...journeyParams,
                        ...objectPage,
                        isStandalone
                    },
                    undefined,
                    {
                        globOptions: { dot: true }
                    }
                );
                generatedJourneyPages.push(objectPage.name);
            }
        });
    }

    if (appFeatures.fpm?.name) {
        editor.copyTpl(
            join(rootV4TemplateDirPath, 'integration', 'FPMJourney.js'),
            join(testOutDirPath, 'integration', `${appFeatures.fpm.name}Journey.js`),
            {
                ...journeyParams,
                ...appFeatures.fpm
            },
            undefined,
            {
                globOptions: { dot: true }
            }
        );
        generatedJourneyPages.push(appFeatures.fpm.name);
    }

    if (!virtualOPA5Configured) {
        if (hasJourneyRunner) {
            addPathsToQUnitJs(
                generatedJourneyPages.map((page) => {
                    return `${config.appPath}/test/integration/${page}Journey`;
                }),
                testOutDirPath,
                editor
            );
        } else {
            editor.copyTpl(
                join(rootV4TemplateDirPath, 'integration', 'opaTests.*.*'),
                join(testOutDirPath, 'integration'),
                { ...config, generatedJourneyPages },
                undefined,
                {
                    globOptions: { dot: true }
                }
            );
        }
    }
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
): void {
    fs.copyTpl(
        join(rootTemplateDirPath, 'integration', 'pages', `${pageConfig.template}.js`),
        join(testOutDirPath, 'integration', 'pages', `${pageConfig.targetKey}.js`),
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
 * @param opaConfig.htmlTarget - the name of the html that will be used in OPA journey file. If not specified, 'index.html' will be used
 * @param opaConfig.appID - the appID. If not specified, will be read from the manifest in sap.app/id
 * @param metadata - optional metadata for the OPA test generation
 * @param fs - an optional reference to a mem-fs editor
 * @param log - optional logger instance
 * @param standalone - opa test generation run standalone, not during app generation
 * @returns Reference to a mem-fs-editor
 */
export async function generateOPAFiles(
    basePath: string,
    opaConfig: { scriptName?: string; appID?: string; htmlTarget?: string },
    metadata?: string,
    fs?: Editor,
    log?: Logger,
    standalone = false
): Promise<Editor> {
    const editor = fs ?? create(createStorage());

    const manifest = readManifest(editor, basePath);
    const { applicationType, hideFilterBar } = getAppTypeAndHideFilterBarFromManifest(manifest);

    const config = createConfig(manifest, opaConfig, hideFilterBar);

    const rootCommonTemplateDirPath = join(__dirname, '../templates/common');
    const rootV4TemplateDirPath = join(__dirname, `../templates/${applicationType}`); // Only v4 is supported for the time being
    const testOutDirPath = join(await getWebappPath(basePath), 'test');

    // Access ux-specification to get feature data for OPA test generation
    const appFeatures = await getAppFeatures(basePath, editor, log, metadata);
    // OPA Journey file
    const startPages = config.pages.filter((page) => page.isStartup).map((page) => page.targetKey);
    const LROP = findLROP(config.pages, manifest);
    const journeyParams: JourneyParams = {
        startPages,
        startLR: LROP.pageLR?.targetKey,
        navigatedOP: LROP.pageOP?.targetKey,
        hideFilterBar: config.hideFilterBar
    };

    const writeContext: WriteContext = { config, rootV4TemplateDirPath, testOutDirPath, editor, journeyParams };

    if (standalone) {
        const hasJourneyRunner = existsSync(join(testOutDirPath, 'integration', 'pages', 'JourneyRunner.js'));
        const virtualOPA5Configured = await hasVirtualOPA5(basePath);
        if (hasJourneyRunner) {
            writeJourneyFiles(appFeatures, writeContext, true, true, virtualOPA5Configured);
        } else {
            editor.move(join(testOutDirPath, 'integration', '**'), join(testOutDirPath, 'integration_old'));

            await addIntegrationOldToGitignore(basePath, editor);
            const htmlTarget = readHtmlTargetFromQUnitJs(testOutDirPath, editor) ?? config.htmlTarget;
            const standaloneConfig = { ...config, htmlTarget };
            const standaloneWriteContext: WriteContext = { ...writeContext, config: standaloneConfig };
            if (!virtualOPA5Configured) {
                writeCommonAndPageFiles(standaloneWriteContext, rootCommonTemplateDirPath);
            }
            writeJourneyFiles(appFeatures, standaloneWriteContext, true, true, virtualOPA5Configured);
        }
    } else {
        writeCommonAndPageFiles(writeContext, rootCommonTemplateDirPath);
        writeJourneyFiles(appFeatures, writeContext, false);
    }

    return editor;
}

/**
 * Generate a page object file for a Fiori elements for OData V4 application.
 * Note: this doesn't modify other existing files in the webapp/test folder.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param pageObjectParameters - parameters for the page
 * @param pageObjectParameters.targetKey - the key of the target in the manifest file corresponding to the page
 * @param pageObjectParameters.appID - the appID. If not specified, will be read from the manifest in sap.app/id
 * @param fs - an optional reference to a mem-fs editor
 * @returns Reference to a mem-fs-editor
 */
export async function generatePageObjectFile(
    basePath: string,
    pageObjectParameters: { targetKey: string; appID?: string },
    fs?: Editor
): Promise<Editor> {
    const editor = fs || create(createStorage());

    const manifest = readManifest(editor, basePath);
    const { applicationType } = getAppTypeAndHideFilterBarFromManifest(manifest);

    const pageConfig = createPageConfig(manifest, pageObjectParameters.targetKey, pageObjectParameters.appID);
    if (pageConfig) {
        const rootTemplateDirPath = join(__dirname, `../templates/${applicationType}`); // Only v4 is supported for the time being
        const testOutDirPath = join(await getWebappPath(basePath), 'test');
        writePageObject(pageConfig, rootTemplateDirPath, testOutDirPath, editor);
    } else {
        throw new ValidationError(
            t('error.cannotGeneratePageFile', {
                targetKey: pageObjectParameters.targetKey
            })
        );
    }

    return editor;
}
