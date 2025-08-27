import fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

import type { ToolsLogger } from '@sap-ux/logger';

import type { Resource, Yaml, MTAModule, AppParamsExtended } from '../types';
import { AppRouterType } from '../types';
import { createService } from './utils';
import { getProjectNameForXsSecurity, YamlLoader } from './yaml-loader';

const CF_MANAGED_SERVICE = 'org.cloudfoundry.managed-service';
const HTML5_APPS_REPO = 'html5-apps-repo';
const SAP_APPLICATION_CONTENT = 'com.sap.application.content';

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
 * @param {Yaml} yamlContent - The YAML content.
 * @returns {string} The SAP Cloud Service.
 */
export function getSAPCloudService(yamlContent: Yaml): string {
    const modules = yamlContent?.modules?.filter((module: { name: string }) =>
        module.name.includes('destination-content')
    );
    const destinations = modules?.[0]?.parameters?.content?.instance?.destinations;
    let sapCloudService = destinations?.find((destination: { Name: string }) =>
        destination.Name.includes('html_repo_host')
    );
    sapCloudService = sapCloudService?.['sap.cloud.service'].replace(/_/g, '.');

    return sapCloudService;
}

/**
 * Gets the router type.
 *
 * @param {Yaml} yamlContent - The YAML content.
 * @returns {AppRouterType} The router type.
 */
export function getRouterType(yamlContent: Yaml): AppRouterType {
    const filtered: MTAModule[] | undefined = yamlContent?.modules?.filter(
        (module: { name: string }) => module.name.includes('destination-content') || module.name.includes('approuter')
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
 * @returns {Promise<AppParamsExtended>} The app params.
 */
export function getAppParamsFromUI5Yaml(projectPath: string): AppParamsExtended {
    const ui5YamlPath = path.join(projectPath, 'ui5.yaml');
    const parsedYaml = YamlLoader.getYamlContent(ui5YamlPath) as any;

    const appConfiguration = parsedYaml?.builder?.customTasks?.[0]?.configuration;
    const appParams: AppParamsExtended = {
        appHostId: appConfiguration?.appHostId,
        appName: appConfiguration?.appName,
        appVersion: appConfiguration?.appVersion,
        spaceGuid: appConfiguration?.space
    };

    return appParams;
}

/**
 * Adjusts the MTA YAML for a standalone approuter.
 *
 * @param {any} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {string} businessService - The business service.
 */
function adjustMtaYamlStandaloneApprouter(yamlContent: any, projectName: string, businessService: string): void {
    const appRouterName = `${projectName}-approuter`;
    let appRouter = yamlContent.modules.find((module: { name: string }) => module.name === appRouterName);
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
        yamlContent.modules.push(appRouter);
    }
    const requires = [
        `${projectName}_html_repo_runtime`,
        `${projectName}_uaa`,
        `portal_resources_${projectName}`
    ].concat(businessService);
    requires.forEach((name) => {
        if (appRouter.requires.every((existing: { name: string }) => existing.name !== name)) {
            appRouter.requires.push({ name });
        }
    });
}

/**
 * Adjusts the MTA YAML for a managed approuter.
 *
 * @param {any} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {any} businessSolution - The business solution.
 * @param {string} businessService - The business service.
 */
function adjustMtaYamlManagedApprouter(
    yamlContent: any,
    projectName: string,
    businessSolution: string,
    businessService: string
): void {
    const appRouterName = `${projectName}-destination-content`;
    let appRouter = yamlContent.modules.find((module: { name: string }) => module.name === appRouterName);
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
                                'sap.cloud.service': businessSolution.replace(/_/g, '.')
                            },
                            {
                                Name: `${businessSolution}-uaa-${projectName}`,
                                ServiceInstanceName: `${projectName}-xsuaa`,
                                ServiceKeyName: `${projectName}_uaa-key`,
                                Authentication: 'OAuth2UserTokenExchange',
                                'sap.cloud.service': businessSolution.replace(/_/g, '.')
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
        yamlContent.modules.push(appRouter);
    }
}

/**
 * Adjusts the MTA YAML for a UI deployer.
 *
 * @param {any} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {string} moduleName - The module name.
 */
function adjustMtaYamlUDeployer(yamlContent: any, projectName: string, moduleName: string): void {
    const uiDeployerName = `${projectName}_ui_deployer`;
    let uiDeployer = yamlContent.modules.find((module: { name: string }) => module.name === uiDeployerName);
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
        yamlContent.modules.push(uiDeployer);
    }
    const htmlRepoHostName = `${projectName}_html_repo_host`;
    if (uiDeployer.requires.every((req: { name: string }) => req.name !== htmlRepoHostName)) {
        uiDeployer.requires.push({
            name: htmlRepoHostName,
            parameters: {
                'content-target': true
            }
        });
    }
    if (uiDeployer['build-parameters'].requires.every((require: { name: any }) => require.name !== moduleName)) {
        uiDeployer['build-parameters'].requires.push({
            artifacts: [`${moduleName}.zip`],
            name: moduleName,
            'target-path': 'resources/'
        });
    }
}

/**
 * Adjusts the MTA YAML for resources.
 *
 * @param {any} yamlContent - The YAML content.
 * @param {string} projectName - The project name.
 * @param {string} timestamp - The timestamp.
 * @param {boolean} isManagedAppRouter - Whether the approuter is managed.
 */
function adjustMtaYamlResources(
    yamlContent: any,
    projectName: string,
    timestamp: string,
    isManagedAppRouter: boolean
): void {
    const projectNameForXsSecurity = getProjectNameForXsSecurity(yamlContent, timestamp);
    const resources: Resource[] = [
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

    resources.forEach((resource) => {
        if (yamlContent.resources.every((existing: { name: string }) => existing.name !== resource.name)) {
            yamlContent.resources.push(resource);
        }
    });
}

/**
 * Adjusts the MTA YAML for the own module.
 *
 * @param {any} yamlContent - The YAML content.
 * @param {string} moduleName - The module name.
 */
function adjustMtaYamlOwnModule(yamlContent: any, moduleName: string): void {
    let module = yamlContent.modules.find((module: { name: string }) => module.name === moduleName);
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
        yamlContent.modules.push(module);
    }
}

/**
 * Adds a module if it does not exist.
 *
 * @param {any[]} requires - The requires.
 * @param {any} name - The name.
 */
function addModuleIfNotExists(requires: { name: any }[], name: any): void {
    if (requires.every((require) => require.name !== name)) {
        requires.push({ name });
    }
}

/**
 * Adjusts the MTA YAML for the FLP module.
 *
 * @param {any} yamlContent - The YAML content.
 * @param {any} yamlContent.modules - The modules.
 * @param {string} projectName - The project name.
 * @param {string} businessService - The business service.
 */
function adjustMtaYamlFlpModule(yamlContent: { modules: any[] }, projectName: any, businessService: string): void {
    yamlContent.modules.forEach((module, index) => {
        if (module.type === SAP_APPLICATION_CONTENT && module.requires) {
            const portalResources = module.requires.find(
                (require: { name: string }) => require.name === `portal_resources_${projectName}`
            );
            if (portalResources?.['parameters']?.['service-key']?.['name'] === 'content-deploy-key') {
                addModuleIfNotExists(module.requires, `${projectName}_html_repo_host`);
                addModuleIfNotExists(module.requires, `${projectName}_ui_deployer`);
                addModuleIfNotExists(module.requires, businessService);
                // move flp module to last position
                yamlContent.modules.push(yamlContent.modules.splice(index, 1)[0]);
            }
        }
    });
}

/**
 * Writes the file callback.
 *
 * @param {any} error - The error.
 */
function writeFileCallback(error: any): void {
    if (error) {
        throw new Error('Cannot save mta.yaml file.');
    }
}

/**
 * The YAML utilities class.
 */
export class YamlUtils {
    public static spaceGuid: string;
    private static yamlPath: string;
    private static HTML5_APPS_REPO = 'html5-apps-repo';

    /**
     * Adjusts the MTA YAML.
     *
     * @param {string} projectPath - The project path.
     * @param {string} moduleName - The module name.
     * @param {AppRouterType} appRouterType - The app router type.
     * @param {string} businessSolutionName - The business solution name.
     * @param {string} businessService - The business service.
     * @param {ToolsLogger} logger - The logger.
     * @returns {Promise<void>} The promise.
     */
    public static async adjustMtaYaml(
        projectPath: string,
        moduleName: string,
        appRouterType: AppRouterType,
        businessSolutionName: string,
        businessService: string,
        logger?: ToolsLogger
    ): Promise<void> {
        const timestamp = Date.now().toString();

        const mtaYamlPath = path.join(projectPath, 'mta.yaml');
        const loadedYamlContent = YamlLoader.getYamlContent(mtaYamlPath);

        const defaultYaml = {
            ID: projectPath.split(path.sep).pop(),
            version: '0.0.1',
            modules: [] as any[],
            resources: [] as any[],
            '_schema-version': '3.2'
        };

        if (!appRouterType) {
            appRouterType = getRouterType(loadedYamlContent);
        }

        const yamlContent = Object.assign(defaultYaml, loadedYamlContent);
        const projectName = yamlContent.ID.toLowerCase();
        const initialServices = yamlContent.resources.map(
            (resource: { parameters: { service: string } }) => resource.parameters.service
        );
        const isStandaloneApprouter = appRouterType === AppRouterType.STANDALONE;
        if (isStandaloneApprouter) {
            adjustMtaYamlStandaloneApprouter(yamlContent, projectName, businessService);
        } else {
            adjustMtaYamlManagedApprouter(yamlContent, projectName, businessSolutionName, businessService);
        }
        adjustMtaYamlUDeployer(yamlContent, projectName, moduleName);
        adjustMtaYamlResources(yamlContent, projectName, timestamp, !isStandaloneApprouter);
        adjustMtaYamlOwnModule(yamlContent, moduleName);
        // should go last since it sorts the modules (workaround, should be removed after fixed in deployment module)
        adjustMtaYamlFlpModule(yamlContent, projectName, businessService);

        const updatedYamlContent = yaml.dump(yamlContent);
        await this.createServices(projectPath, yamlContent, initialServices, timestamp, logger);
        return fs.writeFile(this.yamlPath, updatedYamlContent, 'utf-8', writeFileCallback);
    }

    /**
     * Creates the services.
     *
     * @param {string} projectPath - The project path.
     * @param {Yaml} yamlContent - The YAML content.
     * @param {string[]} initialServices - The initial services.
     * @param {string} timestamp - The timestamp.
     * @param {ToolsLogger} logger - The logger.
     * @returns {Promise<void>} The promise.
     */
    private static async createServices(
        projectPath: string,
        yamlContent: Yaml,
        initialServices: string[],
        timestamp: string,
        logger?: ToolsLogger
    ): Promise<void> {
        const excludeServices = initialServices.concat(['portal', this.HTML5_APPS_REPO]);
        const xsSecurityPath = path.join(projectPath, 'xs-security.json');
        const resources = yamlContent.resources as any[];
        const xsSecurityProjectName = getProjectNameForXsSecurity(yamlContent, timestamp);
        for (const resource of resources) {
            if (!excludeServices.includes(resource.parameters.service)) {
                if (resource.parameters.service === 'xsuaa') {
                    await createService(
                        this.spaceGuid,
                        resource.parameters['service-plan'],
                        resource.parameters['service-name'],
                        logger,
                        [],
                        xsSecurityPath,
                        resource.parameters.service,
                        xsSecurityProjectName
                    );
                } else {
                    await createService(
                        this.spaceGuid,
                        resource.parameters['service-plan'],
                        resource.parameters['service-name'],
                        logger,
                        [],
                        '',
                        resource.parameters.service,
                        xsSecurityProjectName
                    );
                }
            }
        }
    }
}
