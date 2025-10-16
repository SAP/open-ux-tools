import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { render } from 'ejs';
import type { App, Package } from '@sap-ux/ui5-application-writer';
import { generate as generateUi5Project } from '@sap-ux/ui5-application-writer';
import {
    generate as addOdataService,
    OdataVersion,
    ServiceType,
    type OdataService
} from '@sap-ux/odata-service-writer';
import { generateOPAFiles } from '@sap-ux/ui5-test-writer';
import cloneDeep from 'lodash/cloneDeep';
import type { FioriElementsApp } from './types';
import { TemplateType } from './types';
import { validateApp, validateRequiredProperties } from './validate';
import {
    setAppDefaults,
    setDefaultTemplateSettings,
    getTemplateOptions,
    setVirtualEndpointDefaults
} from './data/defaults';
import {
    TemplateTypeAttributes,
    minSupportedUI5Version,
    minSupportedUI5VersionV4,
    escapeFLPText
} from './data/templateAttributes';
import { extendManifestJson } from './data/manifestSettings';
import semVer from 'semver';
import { initI18n } from './i18n';
import { getBootstrapResourceUrls, getPackageScripts } from '@sap-ux/fiori-generator-shared';
import { generateFpmConfig } from './fpmConfig';
import { applyCAPUpdates, type CapProjectSettings } from '@sap-ux/cap-config-writer';
import type { Logger } from '@sap-ux/logger';
import { writeAnnotations } from './writeAnnotations';

export const V2_FE_TYPES_AVAILABLE = '1.108.0';
/**
 * Get TypeScript Ignore Glob Pattern.
 *
 * @param feApp  to generate the Fiori elements application
 * @param coercedUI5Version the coerced UI5 version
 * @returns ignore pattern
 */
function getTypeScriptIgnoreGlob<T extends {}>(feApp: FioriElementsApp<T>, coercedUI5Version: semVer.SemVer): string[] {
    let ignore = [];
    // isV2FETypesAvailable - Boolean to indicate if V2 Fiori Element types were available in the UI5 version
    const isV2FETypesAvailable = feApp.ui5?.version ? semVer.gte(coercedUI5Version, V2_FE_TYPES_AVAILABLE) : false;
    const tsIgnoreGlob = ['**/*.js'];
    ignore = tsIgnoreGlob;
    // Add local ui5.d.ts if types are missing in UI5 version for V2 Odata services
    // OR template is OVP
    if (feApp.service.version === OdataVersion.v2) {
        if (isV2FETypesAvailable) {
            ignore.push('**/ui5.d.ts');
        } else {
            // do nothing
        }
    } else if (feApp.template.type !== TemplateType.OverviewPage) {
        ignore.push('**/ui5.d.ts');
    }
    return ignore;
}

/**
 * Returns the OPA config.
 *
 * @param appOpts - relevant app options for retrieving the opa config
 * @param appOpts.useVirtualPreviewEndpoints - if virtual endpoints will be used for preview
 * @param flpAppId - the flp app id
 * @returns - the opa config { htmlTarget }
 */
function getOpaConfig(
    { useVirtualPreviewEndpoints }: { useVirtualPreviewEndpoints?: boolean },
    flpAppId?: string
): { htmlTarget: string } {
    const flpTarget = useVirtualPreviewEndpoints ? 'flp' : 'flpSandbox';
    const htmlTarget = `test/${flpTarget}.html#${flpAppId}`;
    return {
        htmlTarget
    };
}

/**
 * Determines if tests should be added.
 * For now, only if v4 and we have metadata (and therefore a mock server config) or has a cds service.
 *
 * @param service - the service data
 * @param addTests - app option to add tests
 * @returns - boolean indicating if tests are to be added
 */
function shouldAddTest(service: Partial<OdataService>, addTests?: boolean): boolean {
    return (
        !!addTests && service?.version === OdataVersion.v4 && (!!service?.metadata || service?.type === ServiceType.CDS)
    );
}

/**
 * Generate a UI5 application based on the specified Fiori Elements floorplan template.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param data - configuration to generate the Fiori elements application
 * @param fs - an optional reference to a mem-fs editor
 * @param log - optional logger instance
 * @returns Reference to a mem-fs-editor
 */
async function generate<T extends {}>(
    basePath: string,
    data: FioriElementsApp<T>,
    fs?: Editor,
    log?: Logger
): Promise<Editor> {
    // Load i18n translations asynchronously to ensure proper initialization.
    // This addresses occasional issues where i18n is not initialized in time, causing tests to fail.
    await initI18n();
    // Clone rather than modifying callers refs
    const feApp: FioriElementsApp<T> = cloneDeep(data);

    // Ensure input data contains at least the mandatory properties required for app generation
    validateRequiredProperties(feApp);

    setAppDefaults(feApp);

    fs = await generateUi5Project(basePath, feApp, fs);

    feApp.template.settings = setDefaultTemplateSettings(feApp.template, feApp.service.version);

    // This is done after `generateUi5Project` since defaults are set if values are not provided
    validateApp(feApp);

    await addOdataService(basePath, feApp.service, fs);

    const coercedUI5Version = semVer.coerce(feApp.ui5?.version)!;
    // Add new files from templates e.g.
    const rootTemplatesPath = join(__dirname, '..', 'templates');
    // Add templates common to all template types
    const isTypeScriptEnabled = feApp.appOptions?.typescript === true;

    const ignore = [
        ...(isTypeScriptEnabled ? getTypeScriptIgnoreGlob(feApp, coercedUI5Version) : ['**/*.ts']),
        // if using virtual endpoints for preview, ignore the files within webapp/test (flpSandbox.html, changes_loader (v2), changes_preview (v2))
        ...(feApp.appOptions?.useVirtualPreviewEndpoints ? ['**/webapp/test/**'] : [])
    ];

    if (feApp.appOptions?.useVirtualPreviewEndpoints) {
        setVirtualEndpointDefaults(feApp);
    }

    // Determine if the project type is 'EDMXBackend'.
    const isEdmxProjectType = feApp.app.projectType === 'EDMXBackend';
    // Get resource bootstrap URLs based on the project type
    const { uShellBootstrapResourceUrl, uiBootstrapResourceUrl } = getBootstrapResourceUrls(
        isEdmxProjectType,
        feApp.ui5?.frameworkUrl,
        feApp.ui5?.version
    );
    const ui5Libs = isEdmxProjectType ? feApp.ui5?.ui5Libs : undefined;
    // Define template options with changes preview and loader settings based on project type
    const templateOptions = getTemplateOptions(isEdmxProjectType, feApp.service.version, feApp.ui5?.version);
    const appConfig = {
        ...feApp,
        templateOptions,
        uShellBootstrapResourceUrl,
        uiBootstrapResourceUrl,
        ui5Libs
    };

    // Copy templates with configuration
    fs.copyTpl(
        join(rootTemplatesPath, 'common', 'add', '**/*.*'),
        basePath,
        {
            ...appConfig,
            escapeFLPText
        },
        undefined,
        {
            globOptions: { ignore, dot: true }
        }
    );

    fs.copyTpl(
        join(rootTemplatesPath, 'common', 'add', '**/*.*'),
        basePath,
        {
            ...appConfig,
            templateOptions,
            escapeFLPText
        },
        undefined,
        {
            globOptions: { ignore, dot: true }
        }
    );

    // Extend common files
    const packagePath = join(basePath, 'package.json');

    // Extend package.json
    fs.extendJSON(
        packagePath,
        JSON.parse(render(fs.read(join(rootTemplatesPath, 'common', 'extend', 'package.json')), feApp, {}))
    );

    // Special handling for FPM because it is not based on template files but used the fpm writer
    if (feApp.template.type === TemplateType.FlexibleProgrammingModel) {
        await generateFpmConfig(feApp, basePath, fs);
    } else {
        // Copy odata version specific common templates and version specific, floorplan specific templates
        const templateVersionPath = join(rootTemplatesPath, `v${feApp.service?.version}`);
        [join(templateVersionPath, 'common', 'add'), join(templateVersionPath, feApp.template.type, 'add')].forEach(
            (templatePath) => {
                fs!.copyTpl(
                    join(templatePath, '**/*.*'),
                    basePath,
                    feApp,
                    {},
                    { ignoreNoMatch: true, globOptions: { ignore, dot: true } }
                );
            }
        );
    }

    // Update manifest.json with template specific settings
    extendManifestJson(fs, basePath, rootTemplatesPath, feApp);

    const packageJson: Package = JSON.parse(fs.read(packagePath));
    const addTest = shouldAddTest(feApp.service, feApp.appOptions?.addTests);

    if (isEdmxProjectType) {
        // Add scripts to package.json only for non-CAP projects
        packageJson.scripts = Object.assign(packageJson.scripts ?? {}, {
            ...getPackageScripts({
                localOnly: !feApp.service?.url,
                addMock: !!feApp.service?.metadata,
                addTest,
                flpAppId: feApp.app.flpAppId,
                startFile: feApp.app?.startFile,
                localStartFile: feApp.app?.localStartFile,
                generateIndex: feApp.appOptions?.generateIndex,
                supportVirtualEndpoints: feApp.appOptions?.useVirtualPreviewEndpoints // no need for search params if virtual endpoints are used
            })
        });
    } else {
        // Add deploy-config script for CAP projects
        packageJson.scripts = {
            'deploy-config': 'npx -p @sap/ux-ui5-tooling fiori add deploy-config cf'
        };
    }
    fs.writeJSON(packagePath, packageJson);

    if (addTest) {
        const opaConfig = getOpaConfig(
            {
                useVirtualPreviewEndpoints: feApp.appOptions?.useVirtualPreviewEndpoints
            },
            feApp.app.flpAppId
        );
        generateOPAFiles(basePath, opaConfig, fs);
    }

    if (feApp.service.capService) {
        const settings: CapProjectSettings = {
            appRoot: basePath,
            packageName: feApp.package.name ?? '',
            appId: feApp.app.id,
            sapux: feApp.appOptions?.sapux,
            enableCdsUi5Plugin: feApp.appOptions?.addCdsUi5Plugin,
            enableTypescript: feApp.appOptions?.typescript
        };
        // apply cap updates when service is cap
        await applyCAPUpdates(fs, feApp.service.capService, settings);
    }

    if (feApp.appOptions?.addAnnotations) {
        await writeAnnotations(basePath, feApp, fs, log);
    }
    return fs;
}

export { generate, FioriElementsApp, App, TemplateTypeAttributes, minSupportedUI5Version, minSupportedUI5VersionV4 };
export * from './types';
