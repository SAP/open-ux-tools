import * as fileSystem from 'fs';
import { dirname, join, relative } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import hasbin = require('hasbin');
import {
    MTAExecutable,
    CDSExecutable,
    CDSBinNotFound,
    MTABinNotFound,
    NoAuthType,
    CDSAddMtaParams,
    MTAYamlFile,
    deployMode,
    DefaultMTADestination,
    EmptyDestination,
    XSAppJson
} from '../constants';
import { getMtaPath, findCapProjectRoot, readUi5Yaml, FileName, Manifest } from '@sap-ux/project-access';
import { readManifest, getTemplatePath, toMtaModuleName, toPosixPath } from '../utils';
import { MtaConfig } from '../cf-config';
import { type Logger } from '@sap-ux/logger';
import { type UI5Config, type FioriToolsProxyConfig, fioriToolsProxy } from '@sap-ux/ui5-config';
import { type CFConfig, type CFWriterConfig, ApiHubType } from '../types';
import type { Destinations } from '@sap-ux/btp-utils';
import { isAppStudio, listDestinations, isFullUrlDestination, Authentication } from '@sap-ux/btp-utils';
import { t } from '../i18n';
import { spawnSync } from 'child_process';
import { render } from 'ejs';
import type { mta } from '@sap/mta-lib';
import { mtaFileExtension } from '../../../deploy-config-writer/src/constants';

let cachedMtaConfig: MtaConfig | undefined;
let cachedDestinationsList: Destinations = {};

/**
 * Adds a managed approuter configuration to the application.
 *
 * @param appPath application path
 * @param cfWriterConfig writer configuration
 * @param fs file system reference
 * @param logger logger
 * @returns file system reference
 */
export async function generate(
    appPath: string,
    cfWriterConfig: CFWriterConfig,
    fs?: Editor,
    logger?: Logger
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (!cfWriterConfig.destination) {
        throw new Error(`No destination provided in the configuration.`);
    }
    const cfConfig = await getCFConfig(fs, appPath, cfWriterConfig, logger);
    await generateDeployConfig(cfConfig, fs, logger);
    return fs;
}

async function getCFConfig(
    fs: Editor,
    appPath: string,
    cfWriterConfig: CFWriterConfig,
    logger?: Logger
): Promise<CFConfig> {
    let isCap = false;
    let mtaPath;
    let rootPath;

    // We use mta-lib, which in turn relies on the mta executable being installed and available in the path
    if (!hasbin.sync(MTAExecutable)) {
        throw new Error(MTABinNotFound);
    }

    const foundMtaPath = await getMtaPath(appPath);
    if (foundMtaPath) {
        mtaPath = dirname(foundMtaPath.mtaPath);
    }
    const capRoot = await findCapProjectRoot(appPath);
    if (capRoot) {
        if (!hasbin.sync(CDSExecutable)) {
            throw new Error(CDSBinNotFound);
        }
        isCap = true;
        rootPath = capRoot;
    } else {
        rootPath = mtaPath ? dirname(mtaPath) : appPath;
    }

    const { serviceBase, destination } = await processUI5Config(fs, appPath);
    const { servicePath, firstServicePathSegment, appId } = await processManifest(fs, appPath);
    const { isFullUrlDest, destinationAuthType } = await getDestinationProperties(
        cfWriterConfig.destination ?? destination
    );
    const cfConfig = {
        appPath,
        destination: cfWriterConfig.destination ?? destination,
        overwrite: cfWriterConfig.overwrite ?? false,
        addManagedApprouter: cfWriterConfig.addManagedApprouter ?? false,
        lcapMode: !isCap ? false : true,
        useAbapDirectSrvBinding: mtaPath ? await useAbapDirectServiceBinding(mtaPath) : false,
        addMTADestination: cfWriterConfig.addMTADestination ?? true,
        destinationAuthType,
        isCap,
        serviceBase,
        servicePath,
        firstServicePathSegment,
        mtaPath,
        appId,
        rootPath,
        capRoot,
        isFullUrlDest
    } as CFConfig;
    logger?.debug(`CF Config: ${JSON.stringify(cfConfig)}`);
    return cfConfig;
}

async function processUI5Config(
    fs: Editor,
    appPath: string
): Promise<{
    serviceBase: string | undefined;
    destination: string | undefined;
    firstServicePathSegment: string | undefined;
}> {
    try {
        let configDestination;
        let serviceBase;
        let firstServicePathSegment;
        const ui5YamlConfig: UI5Config = await readUi5Yaml(appPath, FileName.Ui5Yaml);
        const toolsConfig = ui5YamlConfig.findCustomMiddleware<FioriToolsProxyConfig>(fioriToolsProxy);

        if (toolsConfig?.configuration?.backend?.length === 1) {
            configDestination = toolsConfig?.configuration?.backend[0].destination;
            serviceBase = toolsConfig?.configuration?.backend[0].url;
            firstServicePathSegment = toolsConfig?.configuration?.backend[0].path;
        }
        return { destination: configDestination, serviceBase, firstServicePathSegment };
    } catch (error) {
        throw error;
    }
}

async function processManifest(
    fs: Editor,
    appPath: string
): Promise<{
    servicePath: string | undefined;
    firstServicePathSegment: string | undefined;
    appId: string | undefined;
}> {
    try {
        const manifest = await readManifest(join(appPath, 'webapp/manifest.json'), fs);
        const appId = manifest?.['sap.app']?.id;
        const servicePath = manifest?.['sap.app']?.dataSources?.mainService?.uri;
        const firstServicePathSegment = servicePath?.substring(0, servicePath?.indexOf('/', 1));
        return { servicePath, firstServicePathSegment, appId };
    } catch (error) {
        throw error;
    }
}

async function useAbapDirectServiceBinding(mtaPath: string): Promise<boolean> {
    try {
        const mtaConfig = await getMtaConfig(mtaPath);
        return mtaConfig?.isAbapDirectServiceBinding ?? false;
    } catch (error) {
        return false;
    }
}

async function getMtaConfig(mtaPath: string | undefined): Promise<MtaConfig | undefined> {
    if (mtaPath && !cachedMtaConfig) {
        cachedMtaConfig = await MtaConfig.newInstance(mtaPath);
    }
    return cachedMtaConfig;
}

async function getDestinationProperties(
    destination: string | undefined
): Promise<{ isFullUrlDest: boolean; destinationAuthType: Authentication }> {
    const destinationProperties = {
        isFullUrlDest: false,
        destinationAuthType: Authentication.NO_AUTHENTICATION
    };
    if (destination && isAppStudio()) {
        const destinations = await getDestinations();
        destinationProperties.isFullUrlDest = isFullUrlDestination(destinations[destination]);
        destinationProperties.destinationAuthType = destinations[destination].Authentication as Authentication;
    }
    return destinationProperties;
}

async function getDestinations(): Promise<Destinations> {
    if (Object.keys(cachedDestinationsList).length === 0) {
        cachedDestinationsList = await listDestinations();
    }
    return cachedDestinationsList;
}

async function generateDeployConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    // Generate MTA Config, LCAP will generate the mta.yaml on the fly so we dont care about it!
    if (!cfConfig.lcapMode) {
        await createMTAConfig(cfConfig, fs, logger);
        await generateRootConfig(cfConfig, fs, logger);
        // Update all the missing parts
        await updateMtaConfig(cfConfig, logger);
    }
    cfConfig.mtaId = getMtaConfig(cfConfig.mtaPath)?.prefix;
    // Generate HTML5 config
    await generateAppConfig(cfConfig, fs, logger);

    // if (cfConfig.mtaPath && !cfConfig.addManagedApprouter) {
    //     await this._cleanupStandaloneMtaConfigs();
    // }
    // Update properties
    await updateManifest(cfConfig, fs, logger);
    await updateUI5Package(cfConfig, fs, logger);
}

async function createMTAConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    if (!cfConfig.mtaPath) {
        try {
            if (cfConfig.isCap) {
                const result = spawnSync(CDSExecutable, CDSAddMtaParams, {
                    cwd: cfConfig.rootPath
                });
                if (result.error) {
                    throw new Error(CDSBinNotFound);
                }
            } else {
                const mtaTemplate = fs.read(getTemplatePath(`app/${MTAYamlFile}`));
                const mtaContents = render(mtaTemplate, {
                    id: toMtaModuleName(cfConfig.appId),
                    mtaDescription: t('DEFAULT_MTA_DESCRIPTION'),
                    mtaVersion: '0.0.1'
                });
                // Mta should be written to the parent folder, standalone is written to the project folder
                fileSystem.writeFileSync(join(cfConfig.rootPath, MTAYamlFile), mtaContents);
            }
        } catch (error) {
            logger?.debug(t('debug.logError', { error, method: 'createMTAConfig' }));
            throw error;
        }
    }
}

async function generateRootConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        const mtaId = (await getMtaConfig(cfConfig.mtaPath))?.prefix;
        // If no package.json exists in the mta.yaml directory, then generate one so the user can deploy/undeploy
        if (mtaId && !fs.exists(join(cfConfig.rootPath, 'package.json'))) {
            fs.copyTpl(getTemplatePath('package-server.json'), join(cfConfig.rootPath, 'package.json'), { mtaId });
        }
        if (!fs.exists(join(cfConfig.rootPath, '.gitignore'))) {
            fs.copyTpl(getTemplatePath('gitignore.tmpl'), join(cfConfig.rootPath, '.gitignore'), {});
        }
        if (cfConfig.addManagedApprouter && !fs.exists(join(cfConfig.rootPath, 'xs-security.json'))) {
            fs.copyTpl(getTemplatePath(`app/xs-security.json`), join(cfConfig.rootPath, 'xs-security.json'), {
                appName: toMtaModuleName(cfConfig.appId)
            });
        }
        logger?.debug(t('DEBUG_ROOT_UPDATED'));
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'generateRootConfig' }));
        throw error;
    }
}

async function updateMtaConfig(cfConfig: CFConfig, logger?: Logger): Promise<void> {
    try {
        const mtaConfig = await getMtaConfig(cfConfig.mtaPath);
        if (mtaConfig) {
            await mtaConfig.addRoutingModules(cfConfig.addManagedApprouter);
            const appModule = toMtaModuleName(cfConfig.appId);
            const appRelativePath = toPosixPath(relative(cfConfig.rootPath, cfConfig.appPath));
            await mtaConfig.addApp(appModule, appRelativePath ? appRelativePath : '.');
            const parameters = await mtaConfig.getParameters();
            if (!parameters || !parameters[deployMode]) {
                const params = { ...parameters, ...{} } as mta.Parameters;
                params[deployMode] = 'html5-repo';
                await mtaConfig.updateParameters(params);
                logger?.info(t('LOG_ADDING_PARAMS_TO_MTA'));
            }
            if ((cfConfig.addMTADestination && cfConfig.isCap) || cfConfig.destination === DefaultMTADestination) {
                const tmpDestination =
                    cfConfig.destination === DefaultMTADestination
                        ? mtaConfig.getFormattedPrefix(DefaultMTADestination)
                        : cfConfig.destination;
                await mtaConfig.appendInstanceBasedDestination(tmpDestination);
                // This is required where a managed or standalone router hasnt been added yet to mta.yaml
                if (!mtaConfig.hasManagedXsuaaResource()) {
                    cfConfig.destinationAuthType = Authentication.NO_AUTHENTICATION;
                }
            }
            await saveMta(mtaConfig, cfConfig, logger);
            cfConfig.cloudServiceName = mtaConfig.cloudServiceName;
            logger?.debug(`cfConfig >>>> updated ${JSON.stringify(cfConfig)} `);
        } else {
            logger?.debug(`nothing todo with mtaconfig`);
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'updateMtaConfig' }));
        throw error;
    }
}

async function saveMta(mtaConfig: MtaConfig, cfConfig: CFConfig, logger?: Logger): Promise<void> {
    try {
        if (await mtaConfig.save()) {
            // Add mtaext if required for API Hub Enterprise connectivity
            if (cfConfig.apiHubConfig && cfConfig.apiHubConfig.apiHubType === ApiHubType.apiHubEnterprise) {
                try {
                    await mtaConfig.addMtaExtensionConfig(cfConfig.destination, cfConfig.serviceBase, {
                        key: 'ApiKey',
                        value: cfConfig.apiHubConfig.apiHubKey
                    });
                } catch (error) {
                    logger?.error(t('ERROR_MTA_EXTENSION_FOR_ABHE_FAILED', { error }));
                }
            }
            logger?.info(
                t('LOG_UPDATED_MTA', { targetFile: join(cfConfig.mtaPath ?? cfConfig.rootPath, MTAYamlFile) })
            );
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'saveMta' }));
    }
}

async function generateAppConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        // #11508: When data source is none in app generator, it is not required to provide destination
        if (cfConfig.destination && cfConfig.destination !== EmptyDestination) {
            fs.copyTpl(getTemplatePath('app/xs-app-destination.json'), join(cfConfig.appPath, XSAppJson), {
                destination: cfConfig.destination,
                servicePathSegment: `${cfConfig.firstServicePathSegment}${cfConfig.isFullUrlDest ? '/.*' : ''}`, // For service URL's, pull out everything after the last slash
                targetPath: `${cfConfig.isFullUrlDest ? '' : cfConfig.firstServicePathSegment}/$1`, // Pull group 1 from the regex
                authentication: cfConfig.destinationAuthType === NoAuthType ? 'none' : 'xsuaa'
            });
        } else {
            fs.copyTpl(getTemplatePath('app/xs-app-no-destination.json'), join(cfConfig.appPath, XSAppJson));
        }
        let addTranspileTask = false;
        let addModulesTask = false;
        try {
            const ui5Yaml = fs.read(join(cfConfig.appPath, 'ui5.yaml'));
            if (ui5Yaml.includes('ui5-tooling-transpile-task')) {
                addTranspileTask = true;
            }
            if (ui5Yaml.includes('ui5-tooling-modules-task')) {
                addModulesTask = true;
            }
        } catch {
            addTranspileTask = false;
            addModulesTask = false;
        }
        fs.copyTpl(getTemplatePath('app/ui5-deploy.yaml'), join(cfConfig.appPath, 'ui5-deploy.yaml'), {
            appName: cfConfig.appId,
            mtaAppName: toMtaModuleName(cfConfig.appId),
            addTranspileTask,
            addModulesTask
        });
        logger?.debug(t('DEBUG_MTA_UPDATED'));
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'generateAppConfig' }));
        throw error;
    }
}

async function updateManifest(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        const manifest = await readManifest(join(cfConfig.appPath, 'webapp/manifest.json'), fs);
        if (manifest && cfConfig.cloudServiceName) {
            const sapCloud = {
                ...(manifest['sap.cloud'] || {}),
                public: true,
                service: cfConfig.cloudServiceName
            } as Manifest['sap.cloud'];
            fs.extendJSON(join(cfConfig.appPath, 'webapp/manifest.json'), {
                'sap.cloud': sapCloud
            });
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'updateManifest' }));
        throw error;
    }
}

async function updateUI5Package(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        // Add build:cf which has both ui5 and devDep requirements, however, ui5/cli should not be added to the ui5 dependency list
        updatePackageScript(
            fs,
            cfConfig.appPath,
            'build:cf',
            BUILD_SCRIPT,
            {
                '@sap/ui5-builder-webide-extension': '^1.1.9',
                'ui5-task-zipper': '^3.1.3',
                mbt: MbtVersion
            },
            true
        );
        addPackageDevDependency(fs, cfConfig.appPath, '@ui5/cli', '^3.9.2');
        // mta extension and mta.yaml should both exist at the destination path
        let deployArgs = [];
        if (fs.exists(join(cfConfig.appPath, mtaFileExtension))) {
            deployArgs = ['-e', mtaFileExtension];
        }
        updateManagedAppRouterMtaScripts(cfConfig, fs, deployArgs);
    } catch (error) {
        logger?.error(t('LOG_ERROR', { error, method: 'updateUI5PackageJson' }));
        throw error;
    }
}

async function updateManagedAppRouterMtaScripts(cfConfig: CFConfig, fs: Editor, deployArgs: string[]) {
    updatePackageScript(fs, cfConfig.rootPath, 'build:mta', BUILD_MTA_SCRIPT);
    updatePackageScript(fs, cfConfig.rootPath, 'deploy', DEPLOY_MTA_SCRIPT(deployArgs));
    updatePackageScript(fs, cfConfig.rootPath, 'undeploy', UNDEPLOY_MTA_SCRIPT_TEMP(cfConfig.mtaId));
}
