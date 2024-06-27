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
    XSAppJson,
    MTABuildScript,
    AppDeployMTAScript,
    UndeployMTAScript,
    UI5DeployBuildScript,
    RootDeployMTAScript,
    MTAPackage,
    Rimraf,
    RimrafVersion,
    MTAVersion,
    MTAFileExtension,
    WelcomeFile
} from '../constants';
import {
    type Manifest,
    getMtaPath,
    findCapProjectRoot,
    readUi5Yaml,
    FileName,
    updatePackageScript,
    addPackageDevDependency
} from '@sap-ux/project-access';
import { readManifest, getTemplatePath, toPosixPath, findRoute, getDestinationProperties } from '../utils';
import { MtaConfig, getMtaConfig, getMtaId, toMtaModuleName } from '../mta-config';
import { type Logger } from '@sap-ux/logger';
import { UI5Config as UI5ConfigInstance } from '@sap-ux/ui5-config';
import { type UI5Config, type FioriToolsProxyConfig } from '@sap-ux/ui5-config';
import { type CFConfig, type CFWriterConfig, type XSAppDocument, ApiHubType } from '../types';
import { Authentication } from '@sap-ux/btp-utils';
import { t } from '../i18n';
import { spawnSync } from 'child_process';
import { render } from 'ejs';
import type { mta } from '@sap/mta-lib';

/**
 * Adds a standalone | managed approuter configuration to an application.
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
    const cfConfig = await getCFConfig(fs, appPath, cfWriterConfig, logger);
    logger?.debug(`CF Config initialised: ${JSON.stringify(cfConfig, null, 2)}`);
    await generateDeployConfig(cfConfig, fs, logger);
    logger?.debug(`CF Config completed: ${JSON.stringify(cfConfig, null, 2)}`);
    return fs;
}

async function getCFConfig(fs: Editor, appPath: string, cfWriterConfig: CFWriterConfig): Promise<CFConfig> {
    let isCap = false;
    let mtaPath;
    let mtaId;
    let rootPath;

    // We use mta-lib, which in turn relies on the mta executable being installed and available in the path
    if (!hasbin.sync(MTAExecutable)) {
        throw new Error(MTABinNotFound);
    }

    const foundMtaPath = await getMtaPath(appPath);
    if (foundMtaPath) {
        mtaPath = dirname(foundMtaPath.mtaPath);
        mtaId = await getMtaId(mtaPath);
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
        addManagedApprouter: cfWriterConfig.addManagedApprouter ?? false,
        lcapMode: !isCap ? false : true,
        isMtaRoot: foundMtaPath?.hasRoot ?? false,
        useAbapDirectSrvBinding: mtaPath ? await useAbapDirectServiceBinding(mtaPath) : false,
        addMTADestination: cfWriterConfig.addMTADestination ?? true,
        mtaId,
        destinationAuthType,
        isCap,
        serviceBase,
        servicePath,
        firstServicePathSegment,
        appId,
        rootPath,
        capRoot,
        isFullUrlDest
    } as CFConfig;
    // Cleanup trailing slashes
    cfConfig.rootPath = cfConfig.rootPath.replace(/\/$/, '');
    cfConfig.appPath = cfConfig.appPath.replace(/\/$/, '');
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
        const toolsConfig = ui5YamlConfig.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');

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
        const appId = toMtaModuleName(manifest?.['sap.app']?.id);
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

async function generateDeployConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    // Generate MTA Config, LCAP will generate the mta.yaml on the fly so we dont care about it!
    if (!cfConfig.lcapMode) {
        await createMTAConfig(cfConfig, fs, logger);
        await generateRootConfig(cfConfig, fs, logger);
        await updateMtaConfig(cfConfig, logger);
    }
    // Generate HTML5 config
    await generateAppConfig(cfConfig, fs, logger);

    // Update configurations
    if (cfConfig.mtaId && !cfConfig.addManagedApprouter) {
        await cleanupStandaloneMtaConfig(cfConfig, fs, logger);
    }
    await updateManifest(cfConfig, fs, logger);
    await updateHTML5AppPackage(cfConfig, fs, logger);
    await updateRootPackage(cfConfig, fs, logger);
}

async function createMTAConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    if (!cfConfig.mtaId) {
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
                const mtaId = cfConfig.appId;
                const mtaContents = render(mtaTemplate, {
                    id: mtaId,
                    mtaDescription: t('DEFAULT_MTA_DESCRIPTION'),
                    mtaVersion: '0.0.1'
                });
                fileSystem.writeFileSync(join(cfConfig.rootPath, MTAYamlFile), mtaContents);
                cfConfig.mtaId = mtaId;
            }
            logger?.debug(`MTA Created at ${join(cfConfig.rootPath, MTAYamlFile)}`);
        } catch (error) {
            logger?.debug(t('debug.logError', { error, method: 'createMTAConfig' }));
            throw error;
        }
    }
}

async function generateRootConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        const mtaId: string | undefined = cfConfig.mtaId ?? (await getMtaId(cfConfig.rootPath));
        // If no package.json exists in the mta.yaml directory, then generate one so the user can deploy/undeploy
        if (mtaId && !fs.exists(join(cfConfig.rootPath, 'package.json'))) {
            fs.copyTpl(getTemplatePath('package-server.json'), join(cfConfig.rootPath, 'package.json'), { mtaId });
        }
        if (!fs.exists(join(cfConfig.rootPath, '.gitignore'))) {
            fs.copyTpl(getTemplatePath('gitignore.tmpl'), join(cfConfig.rootPath, '.gitignore'), {});
        }
        if (cfConfig.addManagedApprouter && !fs.exists(join(cfConfig.rootPath, 'xs-security.json'))) {
            fs.copyTpl(getTemplatePath(`app/xs-security.json`), join(cfConfig.rootPath, 'xs-security.json'), {
                appName: cfConfig.appId
            });
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'generateRootConfig' }));
        throw error;
    }
}

async function updateMtaConfig(cfConfig: CFConfig, logger?: Logger): Promise<void> {
    try {
        const mtaConfig = await getMtaConfig(cfConfig.rootPath);
        if (mtaConfig) {
            await mtaConfig.addRoutingModules(cfConfig.addManagedApprouter);
            const appModule = cfConfig.appId;
            const appRelativePath = toPosixPath(relative(cfConfig.rootPath, cfConfig.appPath));
            await mtaConfig.addApp(appModule, appRelativePath ? appRelativePath : '.');
            const parameters = await mtaConfig.getParameters();
            if (!parameters || !parameters[deployMode]) {
                const params = { ...parameters, ...{} } as mta.Parameters;
                params[deployMode] = 'html5-repo';
                await mtaConfig.updateParameters(params);
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
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'saveMta' }));
    }
}

async function generateAppConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        // When data source is none in app generator, it is not required to provide destination
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
        await generateUI5DeployConfig(cfConfig, fs);
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

async function updateHTML5AppPackage(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        let deployArgs: string[] = [];
        if (fs.exists(join(cfConfig.appPath, MTAFileExtension))) {
            deployArgs = ['-e', MTAFileExtension];
        }
        await updatePackageScript(cfConfig.appPath, 'build:cf', UI5DeployBuildScript, fs);
        await updatePackageScript(cfConfig.appPath, 'build:mta', MTABuildScript, fs);
        await updatePackageScript(cfConfig.appPath, 'deploy', AppDeployMTAScript(deployArgs), fs);
        await updatePackageScript(
            cfConfig.appPath,
            'undeploy',
            UndeployMTAScript(cfConfig.mtaId ?? cfConfig.appId),
            fs
        );
        addCommonDependencies(cfConfig.appPath, fs);
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'updateHTML5AppPackage' }));
        throw error;
    }
}

async function updateRootPackage(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        const packageExists = fs.exists(join(cfConfig.rootPath, 'package.json'));
        // Append mta scripts only if mta.yaml is a different level to the HTML5 app
        if (cfConfig.isMtaRoot && packageExists) {
            let deployArgs: string[] = [];
            if (fs.exists(join(cfConfig.rootPath, MTAFileExtension))) {
                deployArgs = ['-e', MTAFileExtension];
            }
            [
                { name: 'undeploy', run: UndeployMTAScript(cfConfig.mtaId ?? cfConfig.appId) },
                { name: 'build', run: `${MTABuildScript} --mtar archive` },
                { name: 'deploy', run: RootDeployMTAScript(deployArgs) }
            ].forEach((script) => {
                updatePackageScript(cfConfig.rootPath, script.name, script.run, fs);
            });
            addCommonDependencies(cfConfig.rootPath, fs);
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'updateRootPackage' }));
        throw error;
    }
}

function addCommonDependencies(packagePath: string, fs: Editor): void {
    addPackageDevDependency(packagePath, Rimraf, RimrafVersion, fs);
    addPackageDevDependency(packagePath, MTAPackage, MTAVersion, fs);
}

async function cleanupStandaloneMtaConfig(cfConfig: CFConfig, fs: Editor, logger?: Logger): Promise<void> {
    try {
        const mtaConfig = await getMtaConfig(cfConfig.rootPath);
        if (mtaConfig?.standaloneRouterPath) {
            // Step1. Do some cleanup!
            const mtaRouterXsAppPath = join(mtaConfig.standaloneRouterPath, XSAppJson);
            const routerXSAppDoc = fs.readJSON(mtaRouterXsAppPath) as unknown as XSAppDocument;
            try {
                if (routerXSAppDoc?.[WelcomeFile] === '/') {
                    routerXSAppDoc[WelcomeFile] = `/${cfConfig.mtaId}`;
                    fs.writeJSON(mtaRouterXsAppPath, routerXSAppDoc);
                }
            } catch (error) {
                logger?.debug(
                    t('debug.logError', { error, method: 'cleanupStandaloneMtaConfigs->editing xs-app.json' })
                );
            }
            // Step2. Read direct service binding config from app router xs-app.json, and set them in HTML5 xs-app.json
            if (routerXSAppDoc && cfConfig.useAbapDirectSrvBinding) {
                const mtaRouterRoute = findRoute(routerXSAppDoc, ['service', 'endpoint']);
                const routerService = mtaRouterRoute?.['service'];
                const routerEndpoint = mtaRouterRoute?.['endpoint'];
                const appXsAppPath = join(cfConfig.appPath, XSAppJson);
                const appXsAppObj = fs.readJSON(appXsAppPath) as unknown as XSAppDocument;
                let destinationRoute = findRoute(appXsAppObj, ['destination'], ['DIRECT_SERVICE_BINDING']);
                if (!destinationRoute) {
                    destinationRoute = findRoute(appXsAppObj, ['service', 'endpoint']);
                }
                if (destinationRoute && routerService && routerEndpoint) {
                    delete destinationRoute['destination'];
                    destinationRoute['service'] = routerService;
                    destinationRoute['endpoint'] = routerEndpoint;
                    fs.writeJSON(appXsAppPath, appXsAppObj);
                }
            }
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'cleanupStandaloneMtaConfigs' }));
        throw error;
    }
}

/**
 * Generate UI5 deploy config.
 *
 * @param cfConfig - the deploy config
 * @param fs - the Editor instance
 * @returns the deploy config
 */
export async function generateUI5DeployConfig(cfConfig: CFConfig, fs: Editor): Promise<void> {
    const ui5BaseConfig = await readUi5Yaml(cfConfig.appPath, FileName.Ui5Yaml, fs);
    const addTranspileTask = !ui5BaseConfig.findCustomMiddleware('ui5-tooling-transpile-task');
    const addModulesTask = !ui5BaseConfig.findCustomMiddleware('ui5-tooling-modules-task');
    const baseUi5Doc = ui5BaseConfig.removeConfig('server');
    const ui5DeployConfig = await UI5ConfigInstance.newInstance(baseUi5Doc.toString());
    ui5DeployConfig.addComment({
        comment: ' yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json',
        location: 'beginning'
    });
    ui5DeployConfig.addCloudFoundryDeployTask(cfConfig.appId, addModulesTask, addTranspileTask);
    fs.write(join(cfConfig.appPath, FileName.UI5DeployYaml), ui5DeployConfig.toString());
}
