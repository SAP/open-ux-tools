import fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

import type { ToolsLogger } from '@sap-ux/logger';

import CFUtils from './utils';
import type { Resource, Yaml, MTAModule, AppParamsExtended } from '../types';

export default class YamlUtils {
    public static timestamp: string;
    public static yamlContent: Yaml;
    public static spaceGuid: string;
    private static STANDALONE_APPROUTER = 'Standalone Approuter';
    private static APPROUTER_MANAGED = 'Approuter Managed by SAP Cloud Platform';
    private static yamlPath: string;
    private static MTA_YAML_FILE = 'mta.yaml';
    private static UI5_YAML_FILE = 'ui5.yaml';
    private static HTML5_APPS_REPO = 'html5-apps-repo';
    private static SAP_APPLICATION_CONTENT = 'com.sap.application.content';
    private static CF_MANAGED_SERVICE = 'org.cloudfoundry.managed-service';

    public static isMtaProject(selectedPath: string): boolean {
        return fs.existsSync(path.join(selectedPath, this.MTA_YAML_FILE));
    }

    public static loadYamlContent(file: string): void {
        const parsed = this.parseMtaFile(file);
        this.yamlContent = parsed as Yaml;
        this.yamlPath = file;
    }

    public static async adjustMtaYaml(
        projectPath: string,
        moduleName: string,
        appRouterType: string,
        businessSolutionName: string,
        businessService: string,
        logger: ToolsLogger
    ): Promise<void> {
        this.setTimestamp();

        const defaultYaml = {
            ID: projectPath.split(path.sep).pop(),
            version: '0.0.1',
            modules: [] as any[],
            resources: [] as any[],
            '_schema-version': '3.2'
        };

        if (!appRouterType) {
            appRouterType = this.getRouterType();
        }

        const yamlContent = Object.assign(defaultYaml, this.yamlContent);
        const projectName = yamlContent.ID.toLowerCase();
        const businesServices = yamlContent.resources.map((resource: { name: string }) => resource.name);
        const initialServices = yamlContent.resources.map(
            (resource: { parameters: { service: string } }) => resource.parameters.service
        );
        if (appRouterType === this.STANDALONE_APPROUTER) {
            this.adjustMtaYamlStandaloneApprouter(yamlContent, projectName, businesServices, businessService);
        } else if (appRouterType === this.APPROUTER_MANAGED) {
            this.adjustMtaYamlManagedApprouter(yamlContent, projectName, businessSolutionName, businessService);
        }
        this.adjustMtaYamlUDeployer(yamlContent, projectName, moduleName);
        this.adjustMtaYamlResources(yamlContent, projectName, appRouterType === this.APPROUTER_MANAGED);
        this.adjustMtaYamlOwnModule(yamlContent, moduleName);
        // should go last since it sorts the modules (workaround, should be removed after fixed in deployment module)
        this.adjustMtaYamlFlpModule(yamlContent, projectName, businessService);

        const updatedYamlContent = yaml.dump(yamlContent);
        await this.createServices(yamlContent.resources, initialServices, logger);
        return fs.writeFile(this.yamlPath, updatedYamlContent, 'utf-8', this.writeFileCallback);
    }

    public static getRouterType(): string {
        const filterd: MTAModule[] | undefined = this.yamlContent?.modules?.filter(
            (module: { name: string }) =>
                module.name.includes('destination-content') || module.name.includes('approuter')
        );
        const routerType = filterd?.pop();
        if (routerType?.name.includes('approuter')) {
            return this.STANDALONE_APPROUTER;
        } else {
            return this.APPROUTER_MANAGED;
        }
    }

    public static getProjectName(): string {
        return this.yamlContent.ID;
    }

    public static getProjectNameForXsSecurity(): string {
        return `${this.getProjectName().toLowerCase().replace(/\./g, '_')}_${this.timestamp}`;
    }

    private static setTimestamp(): void {
        this.timestamp = Date.now().toString();
    }

    public static getSAPCloudService(): string {
        const modules = this.yamlContent?.modules?.filter((module: { name: string }) =>
            module.name.includes('destination-content')
        );
        const destinations = modules?.[0]?.parameters?.content?.instance?.destinations;
        let sapCloudService = destinations?.find((destination: { Name: string }) =>
            destination.Name.includes('html_repo_host')
        );
        sapCloudService = sapCloudService?.['sap.cloud.service'].replace(/_/g, '.');

        return sapCloudService;
    }

    public static async getAppParamsFromUI5Yaml(projectPath: string): Promise<AppParamsExtended> {
        const ui5YamlPath = path.join(projectPath, this.UI5_YAML_FILE);
        const parsedMtaFile = this.parseMtaFile(ui5YamlPath) as any;

        const appConfiguration = parsedMtaFile?.builder?.customTasks[0]?.configuration;
        const appParams: AppParamsExtended = {
            appHostId: appConfiguration?.appHostId,
            appName: appConfiguration?.appName,
            appVersion: appConfiguration?.appVersion,
            spaceGuid: appConfiguration?.space
        };

        return Promise.resolve(appParams);
    }

    private static parseMtaFile(file: string) {
        if (!fs.existsSync(file)) {
            throw new Error(`Could not find file ${file}`);
        }

        const content = fs.readFileSync(file, 'utf-8');
        let parsed;
        try {
            parsed = yaml.load(content);

            return parsed;
        } catch (e) {
            throw new Error(`Error parsing file ${file}`);
        }
    }

    private static async createServices(
        resources: any[],
        initialServices: string[],
        logger: ToolsLogger
    ): Promise<void> {
        const excludeServices = initialServices.concat(['portal', this.HTML5_APPS_REPO]);
        const xsSecurityPath = this.yamlPath.replace('mta.yaml', 'xs-security.json');
        for (const resource of resources) {
            if (!excludeServices.includes(resource.parameters.service)) {
                if (resource.parameters.service === 'xsuaa') {
                    await CFUtils.createService(
                        this.spaceGuid,
                        resource.parameters['service-plan'],
                        resource.parameters['service-name'],
                        logger,
                        [],
                        xsSecurityPath,
                        resource.parameters.service
                    );
                } else {
                    await CFUtils.createService(
                        this.spaceGuid,
                        resource.parameters['service-plan'],
                        resource.parameters['service-name'],
                        logger,
                        [],
                        '',
                        resource.parameters.service
                    );
                }
            }
        }
    }

    private static writeFileCallback(error: any): void {
        if (error) {
            throw new Error('Cannot save mta.yaml file.');
        }
    }

    private static adjustMtaYamlStandaloneApprouter(
        yamlContent: any,
        projectName: string,
        resourceNames: ConcatArray<string>,
        businessService: string
    ): void {
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

    private static adjustMtaYamlManagedApprouter(
        yamlContent: any,
        projectName: string,
        businessSolution: any,
        businessService: string
    ): void {
        const appRouterName = `${projectName}-destination-content`;
        let appRouter = yamlContent.modules.find((module: { name: string }) => module.name === appRouterName);
        if (appRouter == null) {
            businessSolution = businessSolution.split('.').join('_');
            appRouter = {
                name: appRouterName,
                type: this.SAP_APPLICATION_CONTENT,
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

    private static adjustMtaYamlUDeployer(yamlContent: any, projectName: string, moduleName: string): void {
        const uiDeployerName = `${projectName}_ui_deployer`;
        let uiDeployer = yamlContent.modules.find((module: { name: string }) => module.name === uiDeployerName);
        if (uiDeployer == null) {
            uiDeployer = {
                name: uiDeployerName,
                type: this.SAP_APPLICATION_CONTENT,
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

    private static adjustMtaYamlResources(yamlContent: any, projectName: string, isManagedAppRouter: boolean): void {
        const resources: Resource[] = [
            {
                name: `${projectName}_html_repo_host`,
                type: this.CF_MANAGED_SERVICE,
                parameters: {
                    service: this.HTML5_APPS_REPO,
                    'service-plan': 'app-host',
                    'service-name': `${projectName}-html5_app_host`
                }
            },
            {
                name: `${projectName}_uaa`,
                type: this.CF_MANAGED_SERVICE,
                parameters: {
                    service: 'xsuaa',
                    path: './xs-security.json',
                    'service-plan': 'application',
                    'service-name': `${YamlUtils.getProjectNameForXsSecurity()}-xsuaa`
                }
            }
        ];

        if (isManagedAppRouter) {
            resources.push({
                name: `${projectName}-destination`,
                type: this.CF_MANAGED_SERVICE,
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
                    type: this.CF_MANAGED_SERVICE,
                    parameters: {
                        service: 'portal',
                        'service-plan': 'standard'
                    }
                },
                {
                    name: `${projectName}_html_repo_runtime`,
                    type: this.CF_MANAGED_SERVICE,
                    parameters: {
                        service: this.HTML5_APPS_REPO,
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

    private static adjustMtaYamlOwnModule(yamlContent: any, moduleName: string): void {
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

    private static addModuleIfNotExists(requires: { name: any }[], name: any): void {
        if (requires.every((require) => require.name !== name)) {
            requires.push({ name });
        }
    }

    private static adjustMtaYamlFlpModule(
        yamlContent: { modules: any[] },
        projectName: any,
        businessService: string
    ): void {
        yamlContent.modules.forEach((module, index) => {
            if (module.type === this.SAP_APPLICATION_CONTENT && module.requires) {
                const portalResources = module.requires.find(
                    (require: { name: string }) => require.name === `portal_resources_${projectName}`
                );
                if (portalResources?.['parameters']?.['service-key']?.['name'] === 'content-deploy-key') {
                    this.addModuleIfNotExists(module.requires, `${projectName}_html_repo_host`);
                    this.addModuleIfNotExists(module.requires, `${projectName}_ui_deployer`);
                    this.addModuleIfNotExists(module.requires, businessService);
                    // move flp module to last position
                    yamlContent.modules.push(yamlContent.modules.splice(index, 1)[0]);
                }
            }
        });
    }
}
