import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    WriteContext,
    OPAGenerationOptions
} from './types.js';
import { SupportedPageTypes, ValidationError, DotFileExtension } from './types.js';
import { t } from './i18n.js';
import { FileName, DirName, getWebappPath, updatePackageScript } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
import { getAppFeatures } from './utils/modelUtils.js';
import { addPathsToQUnitJs, readHtmlTargetFromQUnitJs } from './utils/opaQUnitUtils.js';
import { type OpaPageWriteInfo, addPagesToJourneyRunner } from './utils/journeyRunnerUtils.js';
import { hasVirtualOPA5, addVirtualTestConfig } from './utils/virtualOpaUtils.js';
import { addJourneysToOpaJourneyTypes } from './utils/opaJourneyTypesUtils.js';
import { getPackageScripts } from '@sap-ux/fiori-generator-shared';
import { readHashFromFlpSandbox } from './utils/flpSandboxUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Generate OPA test files for a Fiori elements for OData V4 application.
 * Note: this can potentially overwrite existing files in the webapp/test folder.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param options - OPA generation options
 * @param metadata - optional metadata for the OPA test generation
 * @param fs - an optional reference to a mem-fs editor
 * @param log - optional logger instance
 * @param standalone - opa test generation run standalone, not during app generation
 * @returns Reference to a mem-fs-editor
 */
export async function generateOPAFiles(
    basePath: string,
    options: OPAGenerationOptions,
    metadata?: string,
    fs?: Editor,
    log?: Logger,
    standalone = false
): Promise<Editor> {
    const editor = fs ?? create(createStorage());

    const manifest = readManifest(editor, basePath);
    const { applicationType, hideFilterBar } = getAppTypeAndHideFilterBarFromManifest(manifest);

    const config = createConfig(manifest, options, hideFilterBar);

    // When any page in the app uses the FPM template, all generated files must be JS.
    // FPM has no TypeScript templates, so a mixed FPM + LR/OP app cannot use TS test files.
    const hasFPMPage = config.pages.some((page) => page.template === 'FPM');
    // In standalone mode, auto-detect TS vs JS from the project (presence of `tsconfig.json`)
    // when the caller has not made an explicit choice. This enforces "TS app → TS tests, JS app → JS tests".
    const enableTypeScript =
        !hasFPMPage && (options.enableTypeScript ?? (standalone && existsSync(join(basePath, FileName.Tsconfig))));
    const dotFileExtension: DotFileExtension = enableTypeScript ? DotFileExtension.TS : DotFileExtension.JS;
    const rootCommonTemplateDirPath = join(__dirname, '../templates/common');
    const rootV4TemplateDirPath = join(__dirname, `../templates/${applicationType}`); // Only v4 is supported for the time being
    const testOutDirPath = join(await getWebappPath(basePath), 'test');

    // Access ux-specification to get feature data for OPA test generation
    const appFeatures = await getAppFeatures(basePath, editor, log, metadata, manifest);
    // OPA Journey file
    const startPages = config.pages.filter((page) => page.isStartup).map((page) => page.targetKey);
    const LROP = findLROP(config.pages, manifest);
    const journeyParams: JourneyParams = {
        startPages,
        startLR: LROP.pageLR?.targetKey,
        navigatedOP: LROP.pageOP?.targetKey,
        hideFilterBar: config.hideFilterBar
    };

    const writeContext: WriteContext = {
        config,
        basePath,
        rootCommonTemplateDirPath,
        rootV4TemplateDirPath,
        testOutDirPath,
        editor,
        log,
        journeyParams,
        dotFileExtension,
        modifiedFiles: []
    };

    if (standalone) {
        await generateOPAFilesForExistingApp(writeContext, appFeatures);
    } else {
        await generateOPAFilesForNewApp(writeContext, appFeatures);
    }

    return editor;
}

/**
 * Generate OPA test files for an existing Fiori elements for OData V4 application.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param appFeatures - object containing feature data for list report, object pages, and FPM, used for generating the journey files
 */
async function generateOPAFilesForExistingApp(writeContext: WriteContext, appFeatures: AppFeatures): Promise<void> {
    const virtualOPA5Configured = await hasVirtualOPA5(writeContext.basePath);
    const standaloneWriteContext = await resolveStandaloneWriteContext(writeContext);

    const generatedPages = writePageFiles(standaloneWriteContext);
    const generatedJourneys = writeJourneyFiles(appFeatures, standaloneWriteContext);
    handleJourneyRunner(standaloneWriteContext, generatedPages);
    if (virtualOPA5Configured) {
        await addVirtualOpa5Config(standaloneWriteContext);
    } else {
        handleOpaTestsStartupFiles(standaloneWriteContext, generatedJourneys);
    }
    if (standaloneWriteContext.dotFileExtension === DotFileExtension.TS) {
        handleOPAJourneyTypes(standaloneWriteContext, generatedPages);
    }
    logGeneratedAndModifiedFiles(standaloneWriteContext, generatedJourneys, generatedPages);
}

/**
 * Generate OPA test files for a newly generated Fiori elements for OData V4 application.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param appFeatures - object containing feature data for list report, object pages, and FPM, used for generating the journey files
 */
async function generateOPAFilesForNewApp(writeContext: WriteContext, appFeatures: AppFeatures): Promise<void> {
    const generatedPages = writePageFiles(writeContext);
    writeJourneyRunner(writeContext);
    const generatedJourneys = writeJourneyFiles(appFeatures, writeContext);
    if (writeContext.config.useVirtualPreviewEndpoints) {
        await addVirtualOpa5Config(writeContext);
    } else {
        handleOpaTestsStartupFiles(writeContext, generatedJourneys);
    }

    if (writeContext.dotFileExtension === DotFileExtension.TS) {
        writeOpaJourneyTypes(writeContext);
    }
    logGeneratedAndModifiedFiles(writeContext, generatedJourneys, generatedPages);
}

/**
 * Log a summary of all files the generator produced or updated, grouped into journeys, pages,
 * and other modified files (JourneyRunner, qunit harness, type definitions, etc.).
 *
 * @param writeContext - shared write context (provides logger, file extension, and modifiedFiles accumulator)
 * @param generatedJourneys - feature names for which a `<name>Journey.gen.<ext>` file was written
 * @param generatedPages - page objects written under `pages/`
 */
function logGeneratedAndModifiedFiles(
    writeContext: WriteContext,
    generatedJourneys: string[],
    generatedPages: OpaPageWriteInfo[]
): void {
    const { log, dotFileExtension, modifiedFiles } = writeContext;
    if (!log?.info) {
        return;
    }
    logGeneratedJourneyFiles(log, generatedJourneys, dotFileExtension);
    logGeneratedPageFiles(log, generatedPages, dotFileExtension);
    logModifiedFiles(log, modifiedFiles ?? []);
}

/**
 * Log the generated journey files (one per line) under a "Generated Journeys:" heading.
 *
 * @param log - logger instance to use for logging
 * @param generatedJourneys - feature names for which a `<name>Journey.gen.<ext>` file was written
 * @param dotFileExtension - the journey file extension (`.js` or `.ts`)
 */
function logGeneratedJourneyFiles(log: Logger, generatedJourneys: string[], dotFileExtension: DotFileExtension): void {
    if (generatedJourneys.length === 0) {
        return;
    }
    const lines = generatedJourneys.map((journey) => `  ${journey}Journey.gen${dotFileExtension}`);
    log.info?.(['Generated Journeys:', ...lines].join('\n'));
}

/**
 * Log the generated page files (one per line) under a "Generated Pages:" heading.
 *
 * @param log - logger instance to use for logging
 * @param generatedPages - page objects written under `pages/`
 * @param dotFileExtension - the page file extension (`.js` or `.ts`)
 */
function logGeneratedPageFiles(
    log: Logger,
    generatedPages: OpaPageWriteInfo[],
    dotFileExtension: DotFileExtension
): void {
    if (generatedPages.length === 0) {
        return;
    }
    const lines = generatedPages.map((page) => `  pages/${page.fileName}${dotFileExtension}`);
    log.info?.(['Generated Pages:', ...lines].join('\n'));
}

/**
 * Log the additional files updated during generation (one per line) under a "Modified files:" heading.
 *
 * @param log - logger instance to use for logging
 * @param modifiedFiles - paths (relative to the test output dir) of files that were written or spliced
 */
function logModifiedFiles(log: Logger, modifiedFiles: string[]): void {
    if (modifiedFiles.length === 0) {
        return;
    }
    const lines = modifiedFiles.map((file) => `  ${file}`);
    log.info?.(['Modified files:', ...lines].join('\n'));
}

/**
 * Resolve the standalone-mode write context: detect preexisting integration tests and an
 * incompatible legacy setup, and resolve the htmlTarget from flpSandbox.html if present.
 *
 * @param writeContext - shared write context to base the resolved context on
 * @returns a new WriteContext with the resolved values for the standalone generation
 */
async function resolveStandaloneWriteContext(writeContext: WriteContext): Promise<WriteContext> {
    const hasPreexistingTests = existsSync(join(writeContext.testOutDirPath, 'integration'));

    if (hasPreexistingTests) {
        return {
            ...writeContext,
            hasPreexistingTests: true,
            incompatibleTestSetup: await hasIncompatibleTestSetup(writeContext.testOutDirPath),
            config: {
                ...writeContext.config,
                htmlTarget:
                    readHtmlTargetFromQUnitJs(writeContext.testOutDirPath, writeContext.editor) ??
                    writeContext.config.htmlTarget
            }
        };
    }
    // app has no integration tests yet
    return await resolveWriteContextForMissingIntegrationFolder(writeContext);
}

/**
 * Resolve the standalone-mode write context for the case where the integration folder is
 * missing entirely: there are no OPA tests yet, the int-test package script may need to be
 * added, and the htmlTarget is resolved from flpSandbox.html if present.
 *
 * @param writeContext - shared write context to base the resolved context on
 * @returns a new WriteContext with the resolved values for the standalone generation
 */
async function resolveWriteContextForMissingIntegrationFolder(writeContext: WriteContext): Promise<WriteContext> {
    const hasIntTestScript = checkScriptInPackageJson(writeContext.editor, writeContext.basePath, 'int-test');
    if (!hasIntTestScript) {
        const script = getPackageScripts({ localOnly: false, addTest: true })['int-test'];
        if (script) {
            await updatePackageScript(writeContext.basePath, 'int-test', script, writeContext.editor);
            writeContext.modifiedFiles?.push('package.json');
        }
    }
    let htmlTarget = writeContext.config.htmlTarget;
    if (existsSync(join(writeContext.testOutDirPath, 'flpSandbox.html'))) {
        const hashFromFlpSandbox = readHashFromFlpSandbox(
            join('test', 'flpSandbox.html'),
            await getWebappPath(writeContext.basePath),
            writeContext.editor
        );
        if (hashFromFlpSandbox) {
            htmlTarget = `test/flpSandbox.html#${hashFromFlpSandbox}`;
        }
    }
    return {
        ...writeContext,
        hasPreexistingTests: false,
        config: { ...writeContext.config, htmlTarget }
    };
}

/**
 * Checks for incompatible test setup — the integration folder exists but no own JourneyRunner.js / .ts file is present.
 *
 * @param testOutDirPath - path to the test output directory (`.../webapp/test`)
 * @returns true if the test setup is incompatible, false otherwise
 */
async function hasIncompatibleTestSetup(testOutDirPath: string): Promise<boolean> {
    return !(await hasJourneyRunnerFile(testOutDirPath));
}

/**
 * Checks whether the existing test setup contains its own JourneyRunner.js or JourneyRunner.ts file.
 *
 * @param testOutDirPath - path to the test output directory (`.../webapp/test`)
 * @returns true if the JourneyRunner.js or JourneyRunner.ts file exists, false otherwise
 */
async function hasJourneyRunnerFile(testOutDirPath: string): Promise<boolean> {
    const pagesDir = join(testOutDirPath, 'integration', 'pages');
    return existsSync(join(pagesDir, 'JourneyRunner.js')) || existsSync(join(pagesDir, 'JourneyRunner.ts'));
}

/**
 * Checks whether a script with the given name exists in the package.json.
 *
 * @param editor - a reference to a mem-fs editor
 * @param basePath - the root folder of the app
 * @param scriptName - the name of the script to check for
 * @returns true if the script exists, false otherwise
 */
function checkScriptInPackageJson(editor: Editor, basePath: string, scriptName: string): boolean {
    const packageJsonPath = join(basePath, FileName.Package);
    if (!editor.exists(packageJsonPath)) {
        return false;
    }
    const packageJson = editor.readJSON(packageJsonPath) as { scripts?: Record<string, string> };
    return !!packageJson.scripts?.[scriptName];
}

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
            isStartup: false,
            fileName: targetKey + '.gen'
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
 * @param options - OPA generation options
 * @param hideFilterBar - whether the filter bar should be hidden in the generated tests
 * @returns OPA test configuration object
 */
function createConfig(manifest: Manifest, options: OPAGenerationOptions, hideFilterBar: boolean): FEV4OPAConfig {
    // General application info
    const { appID, appPath } = getAppFromManifest(manifest, options.appID);

    const config: FEV4OPAConfig = {
        appID,
        appPath,
        pages: [],
        opaJourneyFileName: options.scriptName ?? 'FirstJourney',
        htmlTarget: options.htmlTarget ?? 'index.html',
        hideFilterBar,
        useVirtualPreviewEndpoints: options.useVirtualPreviewEndpoints ?? false
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
        const pageConfig = createPageConfig(manifest, targetKey, options.appID);
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
 * Writes the common test files for the Fiori elements app.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 */
function writeTestsuiteFiles(writeContext: WriteContext): void {
    // Common test files (testsuite served virtually when useVirtualPreviewEndpoints is enabled)
    writeContext.editor.copyTpl(
        join(writeContext.rootCommonTemplateDirPath),
        writeContext.testOutDirPath,
        // unit tests are not added for Fiori elements app
        { appId: writeContext.config.appID },
        undefined,
        {
            globOptions: { dot: true }
        }
    );
}

/**
 * Writes common test files, page objects, and the first journey file.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @returns an array of the written page objects with their targetKey and appPath
 */
function writePageFiles(writeContext: WriteContext): OpaPageWriteInfo[] {
    const { config, rootV4TemplateDirPath, testOutDirPath, editor } = writeContext;
    const writtenPages: OpaPageWriteInfo[] = [];

    config.pages.forEach((page) => {
        writtenPages.push(
            writePageObject(page, rootV4TemplateDirPath, testOutDirPath, editor, writeContext.dotFileExtension)
        );
    });

    return writtenPages;
}

/**
 * Writes the JourneyRunner file.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 */
function writeJourneyRunner(writeContext: WriteContext): void {
    const { config, rootV4TemplateDirPath, testOutDirPath, editor, dotFileExtension, modifiedFiles } = writeContext;
    editor.copyTpl(
        join(rootV4TemplateDirPath, 'integration', 'pages', `JourneyRunner${dotFileExtension}`),
        join(testOutDirPath, 'integration', 'pages', `JourneyRunner${dotFileExtension}`),
        config,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
    modifiedFiles?.push(`integration/pages/JourneyRunner${dotFileExtension}`);
}

/**
 * Writes the OpaJourneyTypes.d.ts type definition file used by generated TypeScript OPA tests.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 */
function writeOpaJourneyTypes(writeContext: WriteContext): void {
    const { config, rootV4TemplateDirPath, testOutDirPath, editor, modifiedFiles } = writeContext;
    editor.copyTpl(
        join(rootV4TemplateDirPath, 'integration', 'types', 'OpaJourneyTypes.d.ts'),
        join(testOutDirPath, 'integration', 'types', 'OpaJourneyTypes.d.ts'),
        config,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
    modifiedFiles?.push('integration/types/OpaJourneyTypes.d.ts');
}

/**
 * Writes journey files for list report, object pages and FPM pages.
 *
 * @param appFeatures - object containing feature data for list report, object pages, and FPM
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @returns an array of feature names for which journey files were generated
 */
function writeJourneyFiles(appFeatures: AppFeatures, writeContext: WriteContext): string[] {
    const { config, rootV4TemplateDirPath, testOutDirPath, editor, journeyParams, dotFileExtension } = writeContext;
    const generatedJourneys: string[] = [];

    if (appFeatures.listReport?.name) {
        editor.copyTpl(
            join(rootV4TemplateDirPath, 'integration', `ListReportJourney${dotFileExtension}`),
            join(testOutDirPath, 'integration', `${appFeatures.listReport.name}Journey.gen${dotFileExtension}`),
            {
                ...journeyParams,
                ...appFeatures.listReport,
                appPath: config.appPath
            },
            undefined,
            {
                globOptions: { dot: true }
            }
        );
        generatedJourneys.push(appFeatures.listReport.name);
    }

    if (appFeatures.objectPages && appFeatures.objectPages.length > 0) {
        appFeatures.objectPages.forEach((objectPage) => {
            if (objectPage.name) {
                editor.copyTpl(
                    join(rootV4TemplateDirPath, 'integration', `ObjectPageJourney${dotFileExtension}`),
                    join(testOutDirPath, 'integration', `${objectPage.name}Journey.gen${dotFileExtension}`),
                    {
                        ...journeyParams,
                        ...objectPage,
                        appPath: config.appPath
                    },
                    undefined,
                    {
                        globOptions: { dot: true }
                    }
                );
                generatedJourneys.push(objectPage.name);
            }
        });
    }

    if (appFeatures.fpm?.name) {
        // FPM TypeScript support is out of scope for the initial TS OPA5 work
        // (LROP only). The FPM journey path below is hardcoded `.js` and there is
        // no `FPM.ts` template, so we force `DotFileExtension.JS` for the FPM
        // page-object regardless of the configured `dotFileExtension`. Otherwise
        // an LR-OP-FPM mix with `enableTypeScript` would crash in `writePageObject`
        // when trying to load the missing `FPM.ts` template.
        // Future work: add FPM.ts/FPMJourney.ts templates and switch to `dotFileExtension`.
        editor.copyTpl(
            join(rootV4TemplateDirPath, 'integration', 'FPMJourney.js'),
            join(testOutDirPath, 'integration', `${appFeatures.fpm.name}Journey.gen.js`),
            {
                ...journeyParams,
                ...appFeatures.fpm
            },
            undefined,
            {
                globOptions: { dot: true }
            }
        );
        generatedJourneys.push(appFeatures.fpm.name);
    }

    if (generatedJourneys.length === 0 && !writeContext.hasPreexistingTests) {
        writeFallbackJourney(writeContext);
    }

    return generatedJourneys;
}

/**
 * Writes the fallback `FirstJourney.js` starter file when no dynamically generated journeys
 * were produced.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 */
function writeFallbackJourney(writeContext: WriteContext): void {
    const { config, rootV4TemplateDirPath, testOutDirPath, editor, journeyParams, dotFileExtension } = writeContext;
    editor.copyTpl(
        join(rootV4TemplateDirPath, 'integration', `FirstJourney${dotFileExtension}`),
        join(testOutDirPath, 'integration', `${config.opaJourneyFileName}${dotFileExtension}`),
        journeyParams,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
}

/**
 * Update the `OpaJourneyTypes.d.ts` type-definition file used by generated TypeScript OPA tests.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param generatedPages - pages whose journeys should be reflected in the type definitions
 */
function handleOPAJourneyTypes(writeContext: WriteContext, generatedPages: OpaPageWriteInfo[]): void {
    if (writeContext.incompatibleTestSetup) {
        writeContext.log?.info(t('info.opaJourneyTypesNotUpdated'));
        return;
    }
    if (writeContext.hasPreexistingTests) {
        const written = addJourneysToOpaJourneyTypes(
            generatedPages,
            writeContext.testOutDirPath,
            writeContext.editor,
            writeContext.log
        );
        if (written) {
            writeContext.modifiedFiles?.push('integration/types/OpaJourneyTypes.d.ts');
        }
    } else {
        writeOpaJourneyTypes(writeContext);
    }
}

/**
 * Handles JourneyRunner File.
 * If there is already a JourneyRunner file, it is updated with the generated pages, otherwise a new JourneyRunner file is written.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param generatedPages - an array of page objects that were generated, each containing a targetKey and appPath
 */
function handleJourneyRunner(writeContext: WriteContext, generatedPages: OpaPageWriteInfo[]): void {
    if (writeContext.incompatibleTestSetup) {
        return;
    } else if (writeContext.hasPreexistingTests) {
        updatePagesInJourneyRunner(writeContext, generatedPages);
    } else {
        writeJourneyRunner(writeContext);
    }
}

/**
 * Ensures that there is a page object file for each generated journey and adds the pages to the JourneyRunner.js file if they were newly created.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param generatedPages - an array of page objects that were generated, each containing a targetKey and appPath
 */
function updatePagesInJourneyRunner(writeContext: WriteContext, generatedPages: OpaPageWriteInfo[]): void {
    const { testOutDirPath, editor, log, dotFileExtension, modifiedFiles } = writeContext;
    if (generatedPages.length > 0) {
        addPagesToJourneyRunner(generatedPages, testOutDirPath, editor, dotFileExtension, log);
        modifiedFiles?.push(`integration/pages/JourneyRunner${dotFileExtension}`);
    }
}

/**
 * Configures `ui5-mock.yaml` to serve the OPA harness virtually so the qunit/testsuite files
 * do not need to be written to disk. Used when virtual OPA5 is configured for the app.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 */
async function addVirtualOpa5Config(writeContext: WriteContext): Promise<void> {
    await addVirtualTestConfig(
        writeContext.basePath,
        [{ framework: 'OPA5', path: '/test/integration/opaTests.qunit.html' }, { framework: 'Testsuite' }],
        writeContext.editor
    );
    writeContext.modifiedFiles?.push('ui5-mock.yaml');
}

/**
 * Handles the opaTests.qunit.html, opaTests.qunit.js, and testsuite.qunit.* files for non-virtual setups.
 * For virtual OPA5 setups, call `addVirtualOpa5Config` instead.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param generatedJourneys - an array of feature names for which journey files were generated
 */
function handleOpaTestsStartupFiles(writeContext: WriteContext, generatedJourneys: string[] = []): void {
    if (writeContext.incompatibleTestSetup) {
        writeContext.log?.info(t('info.incompatibleTestSetupSkipped'));
    } else if (writeContext.hasPreexistingTests) {
        // update existing opaTests.qunit.js only in a compatible setup, as long as virtual OPA5 is not used
        updateReferencesInOpaTestsStartupFiles(writeContext, generatedJourneys);
        writeContext.modifiedFiles?.push('integration/opaTests.qunit.js');
    } else {
        // new app or missing integration folder: write all files
        writeOpaTestsStartupFiles(writeContext, generatedJourneys);
        writeTestsuiteFiles(writeContext);
        writeContext.modifiedFiles?.push(
            'integration/opaTests.qunit.html',
            'integration/opaTests.qunit.js',
            'testsuite.qunit.html',
            'testsuite.qunit.js'
        );
    }
}

/**
 * Writes the opaTests.qunit.html and opaTests.qunit.js files to the test folder. The files are copied from the common templates, which are used for both new app generation and standalone generation in case of an incompatible existing test setup or when virtual OPA5 is used.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param generatedJourneys - an array of feature names for which journey files were generated, used for conditionally adding the test configuration for the virtual OPA5 setup
 */
function writeOpaTestsStartupFiles(writeContext: WriteContext, generatedJourneys: string[] = []): void {
    writeContext.editor.copyTpl(
        join(writeContext.rootV4TemplateDirPath, 'integration', 'opaTests.*.*'),
        join(writeContext.testOutDirPath, 'integration'),
        { ...writeContext.config, generatedJourneys },
        undefined,
        {
            globOptions: { dot: true }
        }
    );
}

/**
 * Updates the references in the opaTests.qunit.js file to the generated journey files and adds the test configuration for virtual OPA5 in case it's used.
 *
 * @param writeContext - shared write context (config, paths, editor, journey params)
 * @param generatedJourneys - an array of feature names for which journey files were generated, used for conditionally adding the test configuration for the virtual OPA5 setup
 */
function updateReferencesInOpaTestsStartupFiles(writeContext: WriteContext, generatedJourneys: string[] = []): void {
    addPathsToQUnitJs(
        generatedJourneys.map((page) => {
            return `${writeContext.config.appPath}/test/integration/${page}Journey.gen`;
        }),
        writeContext.testOutDirPath,
        writeContext.editor,
        writeContext.log
    );
}

/**
 * Writes a page object in a mem-fs-editor.
 *
 * @param pageConfig - the page configuration object
 * @param rootTemplateDirPath - template root directory
 * @param testOutDirPath - output test directory (.../webapp/test)
 * @param fs - a reference to a mem-fs editor
 * @param dotFileExtension - file extension ('.ts' or '.js')
 * @returns path to the written page object
 */
function writePageObject(
    pageConfig: FEV4OPAPageConfig,
    rootTemplateDirPath: string,
    testOutDirPath: string,
    fs: Editor,
    dotFileExtension: DotFileExtension
): OpaPageWriteInfo {
    // FPM has no .ts template; force .js regardless of the configured extension
    const ext = pageConfig.template === 'FPM' ? DotFileExtension.JS : dotFileExtension;
    fs.copyTpl(
        join(rootTemplateDirPath, 'integration', 'pages', `${pageConfig.template}${ext}`),
        join(testOutDirPath, 'integration', 'pages', `${pageConfig.targetKey}.gen${ext}`),
        pageConfig,
        undefined,
        {
            globOptions: { dot: true }
        }
    );
    return {
        targetKey: pageConfig.targetKey,
        appPath: pageConfig.appPath,
        fileName: `${pageConfig.targetKey}.gen`,
        dotFileExtension: ext,
        template: pageConfig.template,
        appID: pageConfig.appID,
        componentID: pageConfig.componentID,
        entitySet: pageConfig.entitySet,
        contextPath: pageConfig.contextPath
    };
}
