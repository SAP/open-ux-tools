import { dirname, join, relative } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { type FioriToolsProxyConfig, type UI5Config, UI5Config as UI5ConfigInstance } from '@sap-ux/ui5-config';
import {
    addPackageDevDependency,
    FileName,
    findCapProjectRoot,
    getMtaPath,
    type Manifest,
    readUi5Yaml,
    updatePackageScript
} from '@sap-ux/project-access';
import { Authentication } from '@sap-ux/btp-utils';
import {
    appDeployMTAScript,
    DefaultMTADestination,
    EmptyDestination,
    MbtPackage,
    MbtPackageVersion,
    MTABuildScript,
    MTAFileExtension,
    ResourceMTADestination,
    Rimraf,
    RimrafVersion,
    rootDeployMTAScript,
    UI5DeployBuildScript,
    undeployMTAScript,
    WelcomeFile,
    XSAppFile
} from '../constants';
import {
    addCommonPackageDependencies,
    generateSupportingConfig,
    getDestinationProperties,
    getTemplatePath,
    readManifest,
    toPosixPath
} from '../utils';
import {
    addMtaDeployParameters,
    createCAPMTA,
    createMTA,
    doesCDSBinaryExist,
    doesMTABinaryExist,
    getMtaConfig,
    getMtaId,
    type MtaConfig,
    toMtaModuleName
} from '../mta-config';
import LoggerHelper from '../logger-helper';
import { t } from '../i18n';
import { type Logger } from '@sap-ux/logger';
import { type XSAppDocument, ApiHubType, type CFAppConfig, type CFConfig, type MTABaseConfig } from '../types';

/**
 * Add a managed approuter configuration to an existing HTML5 application.
 *
 * @param cfAppConfig writer configuration
 * @param fs an optional reference to a mem-fs editor
 * @param logger optional logger instance
 * @returns file system reference
 */
export async function generateAppConfig(cfAppConfig: CFAppConfig, fs?: Editor, logger?: Logger): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    if (logger) {
        LoggerHelper.logger = logger;
    }
    doesMTABinaryExist();
    await generateDeployConfig(cfAppConfig, fs);
    return fs;
}

/**
 * Returns the updated configuration for the given HTML5 app, after reading all the required files.
 *
 * @param cfAppConfig writer configuration
 * @param fs reference to a mem-fs editor
 * @returns updated writer configuration
 */
async function getUpdatedConfig(cfAppConfig: CFAppConfig, fs: Editor): Promise<CFConfig> {
    const isLCAP = cfAppConfig.lcapMode ?? false;
    const { rootPath, isCap, mtaId, mtaPath, hasRoot, capRoot } = await getProjectProperties(cfAppConfig);
    const { serviceHost, destination, firstServicePathSegmentUI5Config } = await processUI5Config(
        cfAppConfig.appPath,
        fs
    );
    const { servicePath, firstServicePathSegment, appId } = await processManifest(cfAppConfig.appPath, fs);

    if (!appId) {
        throw new Error('No SAP Fiori UI5 application found.');
    }

    const { destinationIsFullUrl, destinationAuthentication } = await getDestinationProperties(
        cfAppConfig.destinationName ?? destination
    );

    const config = {
        appPath: cfAppConfig.appPath.replace(/\/$/, ''),
        destinationName: cfAppConfig.destinationName || destination,
        addManagedAppRouter: cfAppConfig.addManagedAppRouter ?? true,
        addMtaDestination: cfAppConfig.addMtaDestination ?? false,
        cloudServiceName: cfAppConfig.cloudServiceName,
        lcapMode: !isCap ? false : isLCAP, // Restricting local changes is only applicable for CAP flows
        isMtaRoot: hasRoot ?? false,
        serviceHost: cfAppConfig.serviceHost || serviceHost,
        rootPath: rootPath.replace(/\/$/, ''),
        destinationAuthentication: cfAppConfig.destinationAuthentication || destinationAuthentication,
        isDestinationFullUrl: cfAppConfig.isDestinationFullUrl ?? destinationIsFullUrl,
        apiHubConfig: cfAppConfig.apiHubConfig,
        firstServicePathSegment: firstServicePathSegmentUI5Config || firstServicePathSegment,
        mtaId,
        mtaPath,
        isCap,
        servicePath,
        appId,
        capRoot
    } as CFConfig;
    return config;
}

/**
 * Get project properties.
 *
 * @param config writer configuration
 * @returns project properties
 */
async function getProjectProperties(config: CFAppConfig): Promise<{
    rootPath: string;
    isCap: boolean;
    hasRoot: boolean;
    mtaId: string | undefined;
    capRoot: string | undefined;
    mtaPath: string | undefined;
}> {
    let isCap = false;
    let rootPath: string;
    let mtaPath: string | undefined;
    let mtaId: string | undefined;
    const foundMtaPath = await getMtaPath(config.appPath);
    if (foundMtaPath) {
        mtaPath = dirname(foundMtaPath.mtaPath);
        mtaId = await getMtaId(mtaPath);
    }
    const hasRoot = foundMtaPath?.hasRoot ?? false;
    const capRoot = (await findCapProjectRoot(config.appPath)) ?? undefined;
    if (capRoot) {
        doesCDSBinaryExist();
        isCap = true;
        rootPath = capRoot;
    } else {
        rootPath = mtaPath ?? config.appPath;
    }
    return { rootPath, isCap, mtaId, mtaPath, hasRoot, capRoot };
}

/**
 * Reads the ui5.yaml file and returns the service base, firstServicePathSegment and destination if found.
 *
 * @param appPath path to the application
 * @param fs reference to a mem-fs editor
 * @returns serviceBase, firstServicePathSegment and destination properties
 */
async function processUI5Config(
    appPath: string,
    fs: Editor
): Promise<{
    serviceHost: string | undefined;
    destination: string | undefined;
    firstServicePathSegmentUI5Config: string | undefined;
}> {
    let destination;
    let serviceHost;
    let firstServicePathSegmentUI5Config;
    try {
        const ui5YamlConfig: UI5Config = await readUi5Yaml(appPath, FileName.Ui5Yaml, fs);
        const toolsConfig = ui5YamlConfig.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');
        if (toolsConfig?.configuration?.backend?.length === 1) {
            destination = toolsConfig?.configuration?.backend[0].destination;
            serviceHost = toolsConfig?.configuration?.backend[0].url;
            firstServicePathSegmentUI5Config = toolsConfig?.configuration?.backend[0].path;
        }
    } catch (error) {
        LoggerHelper.logger?.debug(t('debug.ui5YamlDoesNotExist'));
    }
    return { destination, serviceHost, firstServicePathSegmentUI5Config };
}

/**
 * Reads the manifest.json file and returns the service path, firstServicePathSegment and appId if found.
 *
 * @param appPath path to the application
 * @param fs reference to a mem-fs editor
 * @returns servicePath, firstServicePathSegment and appId properties
 */
async function processManifest(
    appPath: string,
    fs: Editor
): Promise<{
    servicePath: string | undefined;
    firstServicePathSegment: string | undefined;
    appId: string | undefined;
}> {
    const manifest = await readManifest(join(appPath, 'webapp/manifest.json'), fs);
    const appId = manifest?.['sap.app']?.id ? toMtaModuleName(manifest?.['sap.app']?.id) : undefined;
    const servicePath = manifest?.['sap.app']?.dataSources?.mainService?.uri;
    const firstServicePathSegment = servicePath?.substring(0, servicePath?.indexOf('/', 1));
    return { servicePath, firstServicePathSegment, appId };
}

/**
 *
 * @param cfAppConfig writer configuration
 * @param fs reference to a mem-fs editor
 */
async function generateDeployConfig(cfAppConfig: CFAppConfig, fs: Editor): Promise<void> {
    const config = await getUpdatedConfig(cfAppConfig, fs);

    LoggerHelper?.logger?.debug(`Generate app configuration using: \n ${JSON.stringify(config)}`);

    // Generate MTA Config, LCAP will generate the mta.yaml on the fly so we don't care about it!
    if (!config.lcapMode) {
        generateMTAFile(config);
        await generateSupportingConfig(config, fs);
        await updateMtaConfig(config, fs);
    }
    // Generate HTML5 config
    await appendCloudFoundryConfigurations(config, fs);
    await updateManifest(config, fs);
    await updateHTML5AppPackage(config, fs);
    await updateRootPackage(config, fs);
}

/**
 * Creates the MTA configuration file.
 *
 * @param cfConfig writer configuration
 */
export function generateMTAFile(cfConfig: CFConfig): void {
    if (!cfConfig.mtaId) {
        if (cfConfig.isCap) {
            createCAPMTA(cfConfig.rootPath);
        } else {
            createMTA({ mtaId: cfConfig.appId, mtaPath: cfConfig.mtaPath ?? cfConfig.rootPath } as MTABaseConfig);
        }
        cfConfig.mtaId = cfConfig.appId;
        cfConfig.mtaPath = cfConfig.rootPath;
    }
}

/**
 * Updates the MTA configuration file.
 *
 * @param cfConfig writer configuration
 * @param fs reference to a mem-fs editor
 */
async function updateMtaConfig(cfConfig: CFConfig, fs: Editor): Promise<void> {
    const mtaInstance = await getMtaConfig(cfConfig.rootPath);
    if (mtaInstance) {
        await mtaInstance.addRoutingModules({ isManagedApp: cfConfig.addManagedAppRouter });
        const appModule = cfConfig.appId;
        const appRelativePath = toPosixPath(relative(cfConfig.rootPath, cfConfig.appPath));
        await mtaInstance.addApp(appModule, appRelativePath ?? '.');
        await addMtaDeployParameters(mtaInstance);
        if ((cfConfig.addMtaDestination && cfConfig.isCap) || cfConfig.destinationName === DefaultMTADestination) {
            // If the destination instance identifier is passed, create a destination instance
            cfConfig.destinationName =
                cfConfig.destinationName === DefaultMTADestination
                    ? mtaInstance.getFormattedPrefix(ResourceMTADestination)
                    : cfConfig.destinationName;
            await mtaInstance.appendInstanceBasedDestination(cfConfig.destinationName);
            // This is required where a managed or standalone router hasn't been added yet to mta.yaml
            if (!mtaInstance.hasManagedXsuaaResource()) {
                cfConfig.destinationAuthentication = Authentication.NO_AUTHENTICATION;
            }
        }
        cleanupStandaloneRoutes(cfConfig, mtaInstance, fs);
        await saveMta(cfConfig, mtaInstance);
        cfConfig.cloudServiceName = mtaInstance.cloudServiceName;
    }
}

/**
 *
 * @param root0
 * @param root0.rootPath
 * @param root0.appId
 * @param mtaInstance
 * @param fs
 */
function cleanupStandaloneRoutes({ rootPath, appId }: CFConfig, mtaInstance: MtaConfig, fs: Editor): void {
    // Cleanup standalone xs-app.json to reflect new application
    const appRouterPath = mtaInstance.standaloneRouterPath;
    if (appRouterPath) {
        try {
            const xsAppPath = join(appRouterPath, XSAppFile);
            const appRouterXsAppObj = fs.readJSON(join(rootPath, xsAppPath)) as unknown as XSAppDocument;
            if ((appRouterXsAppObj && !appRouterXsAppObj?.[WelcomeFile]) || appRouterXsAppObj?.[WelcomeFile] === '/') {
                appRouterXsAppObj[WelcomeFile] = `/${appId}`;
                fs.writeJSON(join(rootPath, xsAppPath), appRouterXsAppObj);
            }
        } catch (error) {
            LoggerHelper.logger?.error(t('error.cannotUpdateRouterXSApp', { error }));
        }
    }
}

/**
 * Apply changes to mta.yaml, will retry if an exception is thrown.
 *
 * @param cfConfig writer configuration
 * @param mtaInstance MTA configuration instance
 */
async function saveMta(cfConfig: CFConfig, mtaInstance: MtaConfig): Promise<void> {
    let isMtaSaved = false;
    try {
        isMtaSaved = await mtaInstance.save();
    } catch (error) {
        LoggerHelper.logger?.debug(t('debug.mtaSavedFailed', { error }));
        isMtaSaved = await mtaInstance.save();
    }
    if (isMtaSaved) {
        // Add mtaext if required for API Hub Enterprise connectivity
        if (cfConfig.apiHubConfig?.apiHubType === ApiHubType.apiHubEnterprise) {
            try {
                await mtaInstance.addMtaExtensionConfig(cfConfig.destinationName, cfConfig.serviceHost, {
                    key: 'ApiKey',
                    value: cfConfig.apiHubConfig.apiHubKey
                });
            } catch (error) {
                LoggerHelper.logger?.error(t('error.mtaExtensionFailed', { error }));
            }
        }
        LoggerHelper.logger?.debug(t('debug.mtaSaved'));
    }
}

/**
 * Appends the Cloud Foundry specific configurations to the project.
 *
 * @param cfConfig writer configuration
 * @param fs reference to a mem-fs editor
 */
async function appendCloudFoundryConfigurations(cfConfig: CFConfig, fs: Editor): Promise<void> {
    // When data source is none in app generator, it is not required to provide destination
    if (cfConfig.destinationName && cfConfig.destinationName !== EmptyDestination) {
        fs.copyTpl(getTemplatePath('app/xs-app-destination.json'), join(cfConfig.appPath, XSAppFile), {
            destination: cfConfig.destinationName,
            servicePathSegment: `${cfConfig.firstServicePathSegment}${cfConfig.isDestinationFullUrl ? '/.*' : ''}`, // For service URL's, pull out everything after the last slash
            targetPath: `${cfConfig.isDestinationFullUrl ? '' : cfConfig.firstServicePathSegment}/$1`, // Pull group 1 from the regex
            authentication: cfConfig.destinationAuthentication === Authentication.NO_AUTHENTICATION ? 'none' : 'xsuaa'
        });
    } else {
        fs.copyTpl(getTemplatePath('app/xs-app-no-destination.json'), join(cfConfig.appPath, XSAppFile));
    }
    await generateUI5DeployConfig(cfConfig, fs);
}

/**
 * Updates the manifest.json file with the cloud service name.
 *
 * @param cfConfig writer configuration
 * @param fs reference to a mem-fs editor
 */
async function updateManifest(cfConfig: CFConfig, fs: Editor): Promise<void> {
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
}

/**
 * Updates the package.json file with the necessary scripts and dependencies.
 *
 * @param cfConfig writer configuration
 * @param fs reference to a mem-fs editor
 */
async function updateHTML5AppPackage(cfConfig: CFConfig, fs: Editor): Promise<void> {
    let deployArgs: string[] = [];
    if (fs.exists(join(cfConfig.appPath, MTAFileExtension))) {
        deployArgs = ['-e', MTAFileExtension];
    }
    // Added for all flows
    await updatePackageScript(cfConfig.appPath, 'build:cf', UI5DeployBuildScript, fs);
    await addCommonPackageDependencies(cfConfig.appPath, fs);

    // Scripts should only be added if mta and UI5 app are at the same level
    if (cfConfig.mtaPath && !cfConfig.isMtaRoot) {
        await updatePackageScript(cfConfig.appPath, 'build:mta', MTABuildScript, fs);
        await updatePackageScript(cfConfig.appPath, 'deploy', appDeployMTAScript(deployArgs), fs);
        await updatePackageScript(
            cfConfig.appPath,
            'undeploy',
            undeployMTAScript(cfConfig.mtaId ?? cfConfig.appId),
            fs
        );
        await addPackageDevDependency(cfConfig.appPath, Rimraf, RimrafVersion, fs);
        await addPackageDevDependency(cfConfig.appPath, MbtPackage, MbtPackageVersion, fs);
    }
}

/**
 * Update the root package.json with scripts to deploy the MTA.
 *
 * @param cfConfig writer configuration
 * @param fs reference to a mem-fs editor
 */
async function updateRootPackage(cfConfig: CFConfig, fs: Editor): Promise<void> {
    const packageExists = fs.exists(join(cfConfig.rootPath, FileName.Package));
    // Append mta scripts only if mta.yaml is at a different level to the HTML5 app
    if (cfConfig.isMtaRoot && packageExists) {
        await addPackageDevDependency(cfConfig.rootPath, Rimraf, RimrafVersion, fs);
        await addPackageDevDependency(cfConfig.rootPath, MbtPackage, MbtPackageVersion, fs);
        let deployArgs: string[] = [];
        if (fs.exists(join(cfConfig.rootPath, MTAFileExtension))) {
            deployArgs = ['-e', MTAFileExtension];
        }
        for (const script of [
            { name: 'undeploy', run: undeployMTAScript(cfConfig.mtaId ?? cfConfig.appId) },
            { name: 'build', run: `${MTABuildScript} --mtar archive` },
            { name: 'deploy', run: rootDeployMTAScript(deployArgs) }
        ]) {
            await updatePackageScript(cfConfig.rootPath, script.name, script.run, fs);
        }
    }
}
/**
 * Generate UI5 deploy config.
 *
 * @param cfConfig - the deployment config
 * @param fs reference to a mem-fs editor
 * @returns the deploy config
 */
export async function generateUI5DeployConfig(cfConfig: CFConfig, fs: Editor): Promise<void> {
    const ui5BaseConfig = await readUi5Yaml(cfConfig.appPath, FileName.Ui5Yaml, fs);
    const addTranspileTask = !!ui5BaseConfig.findCustomMiddleware('ui5-tooling-transpile-task');
    const addModulesTask = !!ui5BaseConfig.findCustomMiddleware('ui5-tooling-modules-task');
    const baseUi5Doc = ui5BaseConfig.removeConfig('server');
    const ui5DeployConfig = await UI5ConfigInstance.newInstance(baseUi5Doc.toString());
    ui5DeployConfig.addComment({
        comment: ' yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json',
        location: 'beginning'
    });
    ui5DeployConfig.setConfiguration({ propertiesFileSourceEncoding: 'UTF-8' });
    ui5DeployConfig.addCloudFoundryDeployTask(cfConfig.appId, addModulesTask, addTranspileTask);
    fs.write(join(cfConfig.appPath, FileName.UI5DeployYaml), ui5DeployConfig.toString());
}
