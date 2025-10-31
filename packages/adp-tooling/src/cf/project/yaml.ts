import fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { Editor } from 'mem-fs-editor';

import type { ToolsLogger } from '@sap-ux/logger';

import type {
    MtaModule,
    AppParamsExtended,
    MtaDestination,
    MtaResource,
    MtaRequire,
    CfUI5Yaml,
    MtaYaml
} from '../../types';
import { AppRouterType } from '../../types';
import { createServices } from '../services/api';
import { getProjectNameForXsSecurity, getYamlContent } from './yaml-loader';

const CF_MANAGED_SERVICE = 'org.cloudfoundry.managed-service';
const HTML5_APPS_REPO = 'html5-apps-repo';
const SAP_APPLICATION_CONTENT = 'com.sap.application.content';

interface AdjustMtaYamlParams {
    projectPath: string;
    moduleName: string;
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
 * @param {string} projectName - The project name.
 * @param {string} moduleName - The module name.
 */
function adjustMtaYamlUDeployer(yamlContent: MtaYaml, projectName: string, moduleName: string): void {
    const uiDeployerName = `${projectName}_ui_deployer`;
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
    const htmlRepoHostName = `${projectName}_html_repo_host`;
    if (uiDeployer.requires?.every((req: { name: string }) => req.name !== htmlRepoHostName)) {
        uiDeployer.requires?.push({
            name: htmlRepoHostName,
            parameters: {
                'content-target': true
            }
        });
    }
    if (uiDeployer['build-parameters']?.requires?.every((require: { name: string }) => require.name !== moduleName)) {
        uiDeployer['build-parameters']?.requires?.push({
            artifacts: [`${moduleName}.zip`],
            name: moduleName,
            'target-path': 'resources/'
        });
    }
}

/**
 * Adjusts the MTA YAML for resources.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {string} timestamp - The timestamp.
 * @param {boolean} isManagedAppRouter - Whether the approuter is managed.
 */
function adjustMtaYamlResources(
    yamlContent: MtaYaml,
    projectName: string,
    timestamp: string,
    isManagedAppRouter: boolean
): void {
    const projectNameForXsSecurity = getProjectNameForXsSecurity(yamlContent, timestamp);
    const resources: MtaResource[] = [
        {
            name: `${projectName}_html_repo_host`,
            type: CF_MANAGED_SERVICE,
            parameters: {
                service: HTML5_APPS_REPO,
                'service-plan': 'app-host',
                'service-name': `${projectName}-html5_app_host`
            }
        },
        {
            name: `${projectName}_uaa`,
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
            name: `${projectName}-destination`,
            type: CF_MANAGED_SERVICE,
            parameters: {
                service: 'destination',
                'service-name': `${projectName}-destination`,
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
                name: `portal_resources_${projectName}`,
                type: CF_MANAGED_SERVICE,
                parameters: {
                    service: 'portal',
                    'service-plan': 'standard'
                }
            },
            {
                name: `${projectName}_html_repo_runtime`,
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
 * @param {string} moduleName - The module name.
 */
function adjustMtaYamlOwnModule(yamlContent: MtaYaml, moduleName: string): void {
    let module = yamlContent.modules?.find((module: MtaModule) => module.name === moduleName);
    if (module == null) {
        module = {
            name: moduleName,
            type: 'html5',
            path: moduleName,
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
    { projectPath, moduleName, appRouterType, businessSolutionName, businessService }: AdjustMtaYamlParams,
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
    const projectName = yamlContent.ID.toLowerCase();
    const initialServices =
        yamlContent.resources?.map((resource: MtaResource) => resource.parameters.service ?? '') ?? [];
    const isStandaloneApprouter = appRouterType === AppRouterType.STANDALONE;
    if (isStandaloneApprouter) {
        adjustMtaYamlStandaloneApprouter(yamlContent, projectName, businessService);
    } else {
        adjustMtaYamlManagedApprouter(yamlContent, projectName, businessSolutionName, businessService, timestamp);
    }
    adjustMtaYamlUDeployer(yamlContent, projectName, moduleName);
    adjustMtaYamlResources(yamlContent, projectName, timestamp, !isStandaloneApprouter);
    adjustMtaYamlOwnModule(yamlContent, moduleName);
    // should go last since it sorts the modules (workaround, should be removed after fixed in deployment module)
    adjustMtaYamlFlpModule(yamlContent, projectName, businessService);

    await createServices(yamlContent, initialServices, timestamp, templatePathOverwrite, logger);

    const updatedYamlContent = yaml.dump(yamlContent);

    memFs.write(mtaYamlPath, updatedYamlContent);
    logger?.debug(`Adjusted MTA YAML for project ${projectPath}`);
}
