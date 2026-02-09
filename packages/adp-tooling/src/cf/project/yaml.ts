import fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { Editor } from 'mem-fs-editor';

import type { ToolsLogger } from '@sap-ux/logger';
import type { UI5Config } from '@sap-ux/ui5-config';

import type {
    MtaModule,
    AppParamsExtended,
    MtaDestination,
    MtaResource,
    MtaRequire,
    CfUI5Yaml,
    MtaYaml,
    CfUi5AppInfo,
    ServiceKeys
} from '../../types';
import { AppRouterType } from '../../types';
import { createServices } from '../services/api';
import { getProjectNameForXsSecurity, getYamlContent } from './yaml-loader';
import { getBackendUrlsWithPaths } from '../app/discovery';

const CF_MANAGED_SERVICE = 'org.cloudfoundry.managed-service';
const HTML5_APPS_REPO = 'html5-apps-repo';
const SAP_APPLICATION_CONTENT = 'com.sap.application.content';

interface AdjustMtaYamlParams {
    projectPath: string;
    adpProjectName: string;
    appRouterType: AppRouterType;
    businessSolutionName: string;
    businessService: string;
}

/**
 * Checks if the selected path is a MTA project.
 *
 * @param {string} selectedPath - The selected path.
 * @returns {boolean} True if the selected path is a MTA project, false otherwise.
 */
export function isMtaProject(selectedPath: string): boolean {
    return fs.existsSync(path.join(selectedPath, 'mta.yaml'));
}

/**
 * Gets the SAP Cloud Service.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @returns {string} The SAP Cloud Service.
 */
export function getSAPCloudService(yamlContent: MtaYaml): string {
    const modules = yamlContent?.modules?.filter((module: MtaModule) => module.name.includes('destination-content'));
    const destinations = modules?.[0]?.parameters?.content?.instance?.destinations;
    const mtaDestination = destinations?.find((destination: MtaDestination) =>
        destination.Name.includes('html_repo_host')
    );
    const sapCloudService = mtaDestination?.['sap.cloud.service']?.replaceAll('_', '.') ?? '';

    return sapCloudService;
}

/**
 * Gets the router type.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @returns {AppRouterType} The router type.
 */
export function getRouterType(yamlContent: MtaYaml): AppRouterType {
    const filtered: MtaModule[] | undefined = yamlContent?.modules?.filter(
        (module: MtaModule) => module.name.includes('destination-content') || module.name.includes('approuter')
    );
    const routerType = filtered?.pop();
    if (routerType?.name.includes('approuter')) {
        return AppRouterType.STANDALONE;
    } else {
        return AppRouterType.MANAGED;
    }
}

/**
 * Gets the app params from the UI5 YAML file.
 *
 * @param {string} projectPath - The project path.
 * @returns {AppParamsExtended} The app params.
 */
export function getAppParamsFromUI5Yaml(projectPath: string): AppParamsExtended {
    const ui5YamlPath = path.join(projectPath, 'ui5.yaml');
    const parsedYaml = getYamlContent<CfUI5Yaml>(ui5YamlPath);

    const appConfiguration = parsedYaml?.builder?.customTasks?.[0]?.configuration;
    const appParams: AppParamsExtended = {
        appHostId: appConfiguration?.appHostId || '',
        appName: appConfiguration?.appVersion || '',
        appVersion: appConfiguration?.appVersion || '',
        spaceGuid: appConfiguration?.space || ''
    };

    return appParams;
}

/**
 * Adjusts the MTA YAML for a standalone approuter.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {string} businessService - The business service.
 */
function adjustMtaYamlStandaloneApprouter(yamlContent: MtaYaml, projectName: string, businessService: string): void {
    const appRouterName = `${projectName}-approuter`;
    let appRouter = yamlContent.modules?.find((module: MtaModule) => module.name === appRouterName);
    if (appRouter == null) {
        appRouter = {
            name: appRouterName,
            type: 'approuter.nodejs',
            path: appRouterName,
            requires: [],
            parameters: {
                'disk-quota': '256M',
                'memory': '256M'
            }
        };
        yamlContent.modules?.push(appRouter);
    }

    const requires = [
        `${projectName}_html_repo_runtime`,
        `${projectName}_uaa`,
        `portal_resources_${projectName}`
    ].concat(businessService);

    for (const name of requires) {
        if (appRouter.requires?.every((existing: { name: string }) => existing.name !== name)) {
            appRouter.requires?.push({ name });
        }
    }
}

/**
 * Adjusts the MTA YAML for a managed approuter.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {string} businessSolution - The business solution.
 * @param {string} businessService - The business service.
 * @param {string} timestamp - The timestamp.
 */
function adjustMtaYamlManagedApprouter(
    yamlContent: MtaYaml,
    projectName: string,
    businessSolution: string,
    businessService: string,
    timestamp: string
): void {
    const projectNameForXsSecurity = getProjectNameForXsSecurity(yamlContent, timestamp);
    const appRouterName = `${projectName}-destination-content`;
    let appRouter = yamlContent.modules?.find((module: MtaModule) => module.name === appRouterName);
    if (appRouter == null) {
        businessSolution = businessSolution.split('.').join('_');
        appRouter = {
            name: appRouterName,
            type: SAP_APPLICATION_CONTENT,
            requires: [
                {
                    name: `${projectName}_uaa`,
                    parameters: {
                        'service-key': {
                            name: `${projectName}-uaa-key`
                        }
                    }
                },
                {
                    name: `${projectName}_html_repo_host`,
                    parameters: {
                        'service-key': {
                            name: `${projectName}-html_repo_host-key`
                        }
                    }
                },
                {
                    name: `${projectName}-destination`,
                    parameters: {
                        'content-target': true
                    }
                },
                {
                    name: `${businessService}`,
                    parameters: {
                        'service-key': {
                            name: `${businessService}-key`
                        }
                    }
                }
            ],
            'build-parameters': {
                'no-source': true
            },
            parameters: {
                content: {
                    instance: {
                        destinations: [
                            {
                                Name: `${businessSolution}-${projectName}-html_repo_host`,
                                ServiceInstanceName: `${projectName}-html5_app_host`,
                                ServiceKeyName: `${projectName}-html_repo_host-key`,
                                'sap.cloud.service': businessSolution.replaceAll('_', '.')
                            },
                            {
                                Name: `${businessSolution}-uaa-${projectName}`,
                                ServiceInstanceName: `${projectNameForXsSecurity}-xsuaa`,
                                ServiceKeyName: `${projectName}_uaa-key`,
                                Authentication: 'OAuth2UserTokenExchange',
                                'sap.cloud.service': businessSolution.replaceAll('_', '.')
                            },
                            {
                                Name: `${businessService}-service_instance_name`,
                                Authentication: 'OAuth2UserTokenExchange',
                                ServiceInstanceName: `${businessService}`,
                                ServiceKeyName: `${businessService}-key`
                            }
                        ],
                        existing_destinations_policy: 'update'
                    }
                }
            }
        };
        yamlContent.modules?.push(appRouter);
    }
}

/**
 * Adjusts the MTA YAML for a UI deployer.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} mtaProjectName - The MTA project name.
 * @param {string} adpProjectName - The ADP project name.
 */
function adjustMtaYamlUDeployer(yamlContent: MtaYaml, mtaProjectName: string, adpProjectName: string): void {
    const uiDeployerName = `${mtaProjectName}_ui_deployer`;
    let uiDeployer = yamlContent.modules?.find((module: MtaModule) => module.name === uiDeployerName);
    if (uiDeployer == null) {
        uiDeployer = {
            name: uiDeployerName,
            type: SAP_APPLICATION_CONTENT,
            path: '.',
            requires: [],
            'build-parameters': {
                'build-result': 'resources',
                requires: []
            }
        };
        yamlContent.modules?.push(uiDeployer);
    }
    const htmlRepoHostName = `${mtaProjectName}_html_repo_host`;
    if (uiDeployer.requires?.every((req: { name: string }) => req.name !== htmlRepoHostName)) {
        uiDeployer.requires?.push({
            name: htmlRepoHostName,
            parameters: {
                'content-target': true
            }
        });
    }
    if (
        uiDeployer['build-parameters']?.requires?.every((require: { name: string }) => require.name !== adpProjectName)
    ) {
        uiDeployer['build-parameters']?.requires?.push({
            artifacts: [`${adpProjectName}.zip`],
            name: adpProjectName,
            'target-path': 'resources/'
        });
    }
}

/**
 * Adjusts the MTA YAML for resources.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} mtaProjectName - The project name.
 * @param {string} timestamp - The timestamp.
 * @param {boolean} isManagedAppRouter - Whether the approuter is managed.
 */
function adjustMtaYamlResources(
    yamlContent: MtaYaml,
    mtaProjectName: string,
    timestamp: string,
    isManagedAppRouter: boolean
): void {
    const projectNameForXsSecurity = getProjectNameForXsSecurity(yamlContent, timestamp);
    const resources: MtaResource[] = [
        {
            name: `${mtaProjectName}_html_repo_host`,
            type: CF_MANAGED_SERVICE,
            parameters: {
                service: HTML5_APPS_REPO,
                'service-plan': 'app-host',
                'service-name': `${mtaProjectName}-html5_app_host`
            }
        },
        {
            name: `${mtaProjectName}_uaa`,
            type: CF_MANAGED_SERVICE,
            parameters: {
                service: 'xsuaa',
                path: './xs-security.json',
                'service-plan': 'application',
                'service-name': `${projectNameForXsSecurity}-xsuaa`
            }
        }
    ];

    if (isManagedAppRouter) {
        resources.push({
            name: `${mtaProjectName}-destination`,
            type: CF_MANAGED_SERVICE,
            parameters: {
                service: 'destination',
                'service-name': `${mtaProjectName}-destination`,
                'service-plan': 'lite',
                config: {
                    HTML5Runtime_enabled: true,
                    version: '1.0.0'
                }
            }
        });
    } else {
        resources.push(
            {
                name: `portal_resources_${mtaProjectName}`,
                type: CF_MANAGED_SERVICE,
                parameters: {
                    service: 'portal',
                    'service-plan': 'standard'
                }
            },
            {
                name: `${mtaProjectName}_html_repo_runtime`,
                type: CF_MANAGED_SERVICE,
                parameters: {
                    service: HTML5_APPS_REPO,
                    'service-plan': 'app-runtime'
                }
            }
        );
    }

    for (const resource of resources) {
        if (yamlContent.resources?.every((existing: MtaResource) => existing.name !== resource.name)) {
            yamlContent.resources?.push(resource);
        }
    }
}

/**
 * Adjusts the MTA YAML for the own module.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} adpProjectName - The ADP project name.
 */
function adjustMtaYamlOwnModule(yamlContent: MtaYaml, adpProjectName: string): void {
    let module = yamlContent.modules?.find((module: MtaModule) => module.name === adpProjectName);
    if (module == null) {
        module = {
            name: adpProjectName,
            type: 'html5',
            path: adpProjectName,
            'build-parameters': {
                builder: 'custom',
                commands: ['npm install', 'npm run build'],
                'supported-platforms': []
            }
        };
        yamlContent.modules?.push(module);
    }
}

/**
 * Adds a module if it does not exist.
 *
 * @param {MtaRequire[]} requires - The requires.
 * @param {string} name - The name.
 */
function addModuleIfNotExists(requires: MtaRequire[], name: string): void {
    if (requires.every((require) => require.name !== name)) {
        requires.push({ name });
    }
}

/**
 * Adjusts the MTA YAML for the FLP module.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {string} businessService - The business service.
 */
function adjustMtaYamlFlpModule(yamlContent: MtaYaml, projectName: string, businessService: string): void {
    for (const module of yamlContent.modules ?? []) {
        const moduleIndex = yamlContent.modules?.indexOf(module);
        if (moduleIndex !== undefined) {
            if (module.type === SAP_APPLICATION_CONTENT && module.requires) {
                const portalResources = module.requires.find(
                    (require: MtaRequire) => require.name === `portal_resources_${projectName}`
                );
                if (portalResources?.parameters?.['service-key']?.name === 'content-deploy-key') {
                    addModuleIfNotExists(module.requires, `${projectName}_html_repo_host`);
                    addModuleIfNotExists(module.requires, `${projectName}_ui_deployer`);
                    addModuleIfNotExists(module.requires, businessService);
                    // Move FLP module to last position
                    yamlContent.modules?.push(yamlContent.modules.splice(moduleIndex, 1)[0]);
                }
            }
        }
    }
}

/**
 * Adjusts the MTA YAML.
 *
 * @param {AdjustMtaYamlParams} params - The parameters.
 * @param {Editor} memFs - The mem-fs editor instance.
 * @param {string} [templatePathOverwrite] - The template path overwrite.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<void>} The promise.
 */
export async function adjustMtaYaml(
    { projectPath, adpProjectName, appRouterType, businessSolutionName, businessService }: AdjustMtaYamlParams,
    memFs: Editor,
    templatePathOverwrite?: string,
    logger?: ToolsLogger
): Promise<void> {
    const timestamp = Date.now().toString();

    const mtaYamlPath = path.join(projectPath, 'mta.yaml');
    const loadedYamlContent = getYamlContent(mtaYamlPath);

    const defaultYaml: MtaYaml = {
        ID: projectPath.split(path.sep).pop() ?? '',
        version: '0.0.1',
        modules: [],
        resources: [],
        '_schema-version': '3.2'
    };

    if (!appRouterType) {
        appRouterType = getRouterType(loadedYamlContent);
    }

    const yamlContent = Object.assign(defaultYaml, loadedYamlContent);
    const mtaProjectName = yamlContent.ID.toLowerCase();
    const initialServices =
        yamlContent.resources?.map((resource: MtaResource) => resource.parameters.service ?? '') ?? [];
    const isStandaloneApprouter = appRouterType === AppRouterType.STANDALONE;
    if (isStandaloneApprouter) {
        adjustMtaYamlStandaloneApprouter(yamlContent, mtaProjectName, businessService);
    } else {
        adjustMtaYamlManagedApprouter(yamlContent, mtaProjectName, businessSolutionName, businessService, timestamp);
    }
    adjustMtaYamlUDeployer(yamlContent, mtaProjectName, adpProjectName);
    adjustMtaYamlResources(yamlContent, mtaProjectName, timestamp, !isStandaloneApprouter);
    adjustMtaYamlOwnModule(yamlContent, adpProjectName);
    // should go last since it sorts the modules (workaround, should be removed after fixed in deployment module)
    adjustMtaYamlFlpModule(yamlContent, mtaProjectName, businessService);
    await createServices(yamlContent, initialServices, timestamp, templatePathOverwrite, logger);

    const updatedYamlContent = yaml.dump(yamlContent);

    memFs.write(mtaYamlPath, updatedYamlContent);
    logger?.debug(`Adjusted MTA YAML for project ${projectPath}`);
}

/**
 * Add fiori-tools-servestatic configuration to ui5.yaml and removes previously added configuration.
 *
 * @param basePath - path to application root
 * @param ui5Config - UI5 configuration object
 * @param logger - logger instance
 */
export async function addServeStaticMiddleware(
    basePath: string,
    ui5Config: UI5Config,
    logger?: ToolsLogger
): Promise<void> {
    try {
        if (ui5Config.findCustomMiddleware('fiori-tools-servestatic')) {
            ui5Config.removeCustomMiddleware('fiori-tools-servestatic');
        }

        const ui5AppInfoPath = path.join(basePath, 'ui5AppInfo.json');
        if (!fs.existsSync(ui5AppInfoPath)) {
            logger?.warn('ui5AppInfo.json not found in project root, skipping fiori-tools-servestatic configuration');
            return;
        }

        const ui5AppInfoData = JSON.parse(fs.readFileSync(ui5AppInfoPath, 'utf-8')) as Record<string, unknown>;
        const ui5AppInfo = ui5AppInfoData[Object.keys(ui5AppInfoData)[0]] as CfUi5AppInfo;

        const reusableLibs =
            ui5AppInfo.asyncHints?.libs?.filter(
                (lib) => lib.html5AppName && lib.url && typeof lib.url === 'object' && lib.url.url !== undefined
            ) ?? [];

        if (reusableLibs.length === 0) {
            logger?.info(
                'No reusable libraries found in ui5AppInfo.json, skipping fiori-tools-servestatic configuration'
            );
            return;
        }

        const paths = reusableLibs.map((lib) => {
            const libName = String(lib.name);
            const html5AppName = String(lib.html5AppName);
            const resourcePath = '/resources/' + libName.replaceAll('.', '/');

            return {
                path: resourcePath,
                src: `./.adp/reuse/${html5AppName}`,
                fallthrough: false
            };
        });

        // Add the fiori-tools-servestatic configuration
        ui5Config.addCustomMiddleware([
            {
                name: 'fiori-tools-servestatic',
                beforeMiddleware: 'compression',
                configuration: {
                    paths
                }
            }
        ]);
    } catch (error) {
        logger?.warn(`Could not add fiori-tools-servestatic configuration: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Add backend-proxy-middleware-cf configuration to ui5.yaml.
 *
 * @param basePath - path to application root
 * @param ui5Config - UI5 configuration object
 * @param serviceKeys - service keys from Cloud Foundry
 * @param logger - logger instance
 */
export async function addBackendProxyMiddleware(
    basePath: string,
    ui5Config: UI5Config,
    serviceKeys: ServiceKeys[],
    logger?: ToolsLogger
): Promise<void> {
    try {
        if (ui5Config.findCustomMiddleware('backend-proxy-middleware-cf')) {
            ui5Config.removeCustomMiddleware('backend-proxy-middleware-cf');
        }

        const urlsWithPaths = getBackendUrlsWithPaths(serviceKeys, basePath);

        if (urlsWithPaths.length === 0) {
            logger?.info('No backend URLs with paths found. Skipping backend-proxy-middleware-cf configuration.');
            return;
        }

        ui5Config.addCustomMiddleware([
            {
                name: 'backend-proxy-middleware-cf',
                afterMiddleware: 'compression',
                configuration: {
                    backends: urlsWithPaths
                }
            }
        ]);
    } catch (error) {
        logger?.warn(`Could not add backend-proxy-middleware-cf configuration: ${(error as Error).message}`);
    }
}
