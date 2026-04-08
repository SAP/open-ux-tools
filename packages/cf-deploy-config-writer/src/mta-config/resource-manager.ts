import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FileName, hasDependency, type Package } from '@sap-ux/project-access';
import type { mta } from '@sap/mta-lib';
import {
    ManagedXSUAA,
    HTML5RepoHost,
    ManagedAppFront,
    DestinationServiceConfig,
    UI5ResourceDestination,
    UI5Destination,
    ServiceAPIRequires,
    HTMLAppBuildParams,
    MTABuildParams,
    MTABuildResult,
    MAX_MTA_PREFIX_LENGTH,
    MAX_MTA_PREFIX_SHORT_LENGTH,
    MAX_MTA_PREFIX_SHORTER_LENGTH,
    MAX_ABAP_SERVICE_PREFIX_LENGTH,
    MAX_ABAP_SERVICE_NAME_LENGTH,
    MAX_MTA_ID_LENGTH,
    SRV_API,
    deployMode,
    enableParallelDeployments
} from '../constants';
import { t } from '../i18n';
import { CloudFoundryServiceType, type ModuleType, type MTADestinationType, type SupportedResources, type HTML5App } from '../types';
import type { MtaContext } from './mta-context';

/**
 * Manages SAP BTP service resources and HTML5 app modules within an MTA.
 * All methods are package-private — only MtaDeployment instantiates this class.
 */
export class ResourceManager {
    constructor(private readonly ctx: MtaContext) {}

    /** Add a basic XSUAA resource (used by standalone router). */
    async addUaa(): Promise<void> {
        const resource: mta.Resource = {
            name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-uaa`,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                'service-plan': 'application',
                service: 'xsuaa',
                config: {
                    xsappname: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}` + '-${space-guid}',
                    'tenant-mode': 'dedicated'
                }
            }
        };
        await this.ctx.mta.addResource(resource);
        this.ctx.resources.set('xsuaa', resource);
        this.ctx.dirty = true;
    }

    /** Add a managed XSUAA resource referencing xs-security.json (used by managed/AppFront router). */
    async addManagedUAAWithSecurity(): Promise<void> {
        this.ctx.log?.debug(t('debug.addXsuaaService'));
        const resource: mta.Resource = {
            name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-uaa`,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                path: './xs-security.json',
                service: 'xsuaa',
                'service-name': `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-xsuaa-service`,
                'service-plan': 'application',
                ...(this.ctx.modules.has('nodejs') && this.ctx.modules.has('com.sap.application.content:appfront')
                    ? {
                          config: {
                              xsappname: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-\${org}-\${space}`,
                              'tenant-mode': 'dedicated'
                          }
                      }
                    : {})
            }
        };
        await this.ctx.mta.addResource(resource);
        this.ctx.resources.set(ManagedXSUAA, resource);
        this.ctx.dirty = true;
    }

    /** Add an html5-apps-repo runtime resource (used by standalone router). */
    async addHtml5Runtime(): Promise<void> {
        const resource: mta.Resource = {
            name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-html5-repo-runtime`,
            type: 'org.cloudfoundry.managed-service',
            parameters: { 'service-plan': 'app-runtime', service: 'html5-apps-repo' }
        };
        await this.ctx.mta.addResource(resource);
        this.ctx.resources.set('html5-apps-repo:app-runtime', resource);
        this.ctx.dirty = true;
    }

    /** Add an html5-apps-repo host resource (used by managed router). */
    async addHtml5Host(): Promise<void> {
        const html5host = `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-repo-host`;
        const resource: mta.Resource = {
            name: html5host,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                'service-name': `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-html5-service`,
                'service-plan': 'app-host',
                service: 'html5-apps-repo'
            }
        };
        await this.ctx.mta.addResource(resource);
        this.ctx.resources.set(HTML5RepoHost, resource);
        this.ctx.dirty = true;
    }

    /** Add an app-front service resource (used by AppFront router). */
    async addAppFrontResource(): Promise<void> {
        const resource: mta.Resource = {
            name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_SHORT_LENGTH)}-app-front`,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                service: 'app-front',
                'service-name': `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_SHORTER_LENGTH)}-app-front-service`,
                'service-plan': 'developer'
            }
        };
        await this.ctx.mta.addResource(resource);
        this.ctx.resources.set(ManagedAppFront, resource);
        this.ctx.dirty = true;
    }

    /** Add a destination service resource. */
    async addDestinationResource(isManagedApp = false): Promise<void> {
        const destinationName = `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-destination-service`;
        const resource: mta.Resource = {
            name: destinationName,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                service: 'destination',
                'service-name': destinationName,
                'service-plan': 'lite',
                config: {
                    ...DestinationServiceConfig.config,
                    ['HTML5Runtime_enabled']: isManagedApp
                }
            }
        };
        await this.ctx.mta.addResource(resource);
        this.ctx.resources.set('destination', resource);
        this.ctx.dirty = true;
    }

    /** Update an existing destination resource with HTML5Runtime_enabled flag and ensure UI5 destination exists. */
    async updateDestinationResource(isManagedApp = false): Promise<void> {
        const resource = this.ctx.resources.get('destination');
        if (resource) {
            resource.parameters = {
                ...(resource.parameters ?? {}),
                config: {
                    ...(resource.parameters?.config ?? {}),
                    ['HTML5Runtime_enabled']: isManagedApp
                }
            };
            if (!resource.parameters?.config?.init_data?.instance?.destinations) {
                resource.parameters.config = { ...resource.parameters.config, ...UI5ResourceDestination };
            }
            if (
                !resource.parameters?.config?.init_data?.instance?.destinations?.some(
                    (destination: MTADestinationType) => destination.Name === UI5Destination.Name
                )
            ) {
                resource.parameters.config.init_data.instance.destinations.push(UI5Destination);
            }
            await this.ctx.mta.updateResource(resource);
            this.ctx.resources.set('destination', resource);
            this.ctx.dirty = true;
        }
    }

    /**
     * Add or update the service-name parameter for a resource if not already set.
     *
     * @param serviceName Suffix for the service name (e.g. 'xsuaa', 'html5')
     * @param resourceName Cache key for the resource (e.g. ManagedXSUAA, HTML5RepoHost)
     */
    async updateServiceName(serviceName: string, resourceName: string): Promise<void> {
        const resource = this.ctx.resources.get(resourceName);
        if (resource && !resource.parameters?.['service-name']) {
            resource.parameters = {
                ...(resource.parameters ?? {}),
                'service-name': `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-${serviceName}-service`
            };
            await this.ctx.mta.updateResource(resource);
            this.ctx.resources.set(resourceName, resource);
            this.ctx.dirty = true;
        }
    }

    /**
     * Gets the effective service instance name for a resource.
     * Prefers explicit 'service-name' parameter; falls back to resource name.
     */
    getServiceInstanceName(resourceName: string): string | undefined {
        const resource = this.ctx.resources.get(resourceName);
        return resource?.parameters?.['service-name'] ?? resource?.name;
    }

    /**
     * Add a connectivity service resource and wire it into the standalone router.
     */
    async addConnectivityResource(): Promise<void> {
        const resourceName = `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-connectivity`;
        const router = this.ctx.modules.get('approuter.nodejs');
        if (router) {
            if (router.requires?.findIndex((resource) => resource.name === resourceName) === -1) {
                router.requires.push({ name: resourceName });
                await this.ctx.mta.updateModule(router);
            }
        }
        const connectivityResource: mta.Resource = {
            name: resourceName,
            type: CloudFoundryServiceType.Managed,
            parameters: { service: 'connectivity', 'service-plan': 'lite' }
        };
        if (!this.ctx.resources.has('connectivity')) {
            await this.ctx.mta.addResource(connectivityResource);
            this.ctx.resources.set('connectivity', connectivityResource);
        }
        this.ctx.dirty = true;
    }

    /**
     * Add an ABAP existing-service resource and wire it into the standalone router.
     *
     * @param serviceName The ABAP service instance name
     * @param btpService The BTP service type
     */
    async addAbapService(serviceName: string, btpService: string): Promise<void> {
        const newResourceName = `${this.ctx.mtaId?.slice(0, MAX_ABAP_SERVICE_PREFIX_LENGTH)}-abap-${serviceName.slice(0, MAX_ABAP_SERVICE_NAME_LENGTH)}`;
        const router = this.ctx.modules.get('approuter.nodejs');
        if (router) {
            if (router.requires?.findIndex((resource) => resource.name === newResourceName) === -1) {
                router.requires.push({ name: newResourceName });
                await this.ctx.mta.updateModule(router);
            }
        }
        const abapServiceResource: mta.Resource = {
            name: newResourceName,
            type: CloudFoundryServiceType.Existing,
            parameters: {
                'service-name': serviceName,
                protocol: ['ODataV2'],
                service: btpService,
                'service-plan': '16_abap_64_db'
            }
        };
        if (!this.ctx.resources.has(newResourceName)) {
            await this.ctx.mta.addResource(abapServiceResource);
            this.ctx.resources.set(newResourceName, abapServiceResource);
        }
        this.ctx.dirty = true;
    }

    /**
     * Update a server module (nodejs/java) to require a resource and optionally provide srv-api.
     *
     * @param moduleType Known module type (e.g. 'nodejs', 'java')
     * @param supportedResource The resource to wire in (default: ManagedXSUAA)
     * @param appendSrvApi Whether to append srv-api provides (default: true)
     */
    async updateServerModule(
        moduleType: ModuleType,
        supportedResource: SupportedResources = ManagedXSUAA,
        appendSrvApi = true
    ): Promise<void> {
        const mtaResource = this.ctx.resources.get(supportedResource);
        const serverModule = this.ctx.modules.get(moduleType);
        if (serverModule) {
            if (appendSrvApi && !serverModule.provides?.some((ele) => ele.name === SRV_API)) {
                serverModule.provides = [...(serverModule.provides ?? []), ...[ServiceAPIRequires]];
            }
            if (mtaResource && !serverModule.requires?.some((ele) => ele.name === mtaResource.name)) {
                serverModule.requires = [...(serverModule.requires ?? []), ...[{ name: mtaResource.name }]];
            }
            await this.ctx.mta.updateModule(serverModule);
            this.ctx.modules.set(moduleType, serverModule);
            this.ctx.dirty = true;
        }
    }

    /** Returns true if the MTA contains an XSUAA resource. */
    hasManagedXsuaaResource(): boolean {
        return this.ctx.resources.has(ManagedXSUAA);
    }

    /** Returns true if the MTA contains an ABAP service resource. */
    get isABAPServiceFound(): boolean {
        for (const resourceName of this.ctx.resources.keys()) {
            if (resourceName.includes(`${this.ctx.mtaId}-abap-`)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Register an HTML5 app module and update the content module's build-parameters.
     *
     * @param appName HTML5 module name
     * @param appPath Relative path to the app
     */
    async addApp(appName: string, appPath: string): Promise<void> {
        const contentModule = this.getAppContentModule();
        let isHTML5AlreadyExisting = false;
        if (contentModule) {
            contentModule[MTABuildParams] = contentModule[MTABuildParams] ?? {};
            contentModule[MTABuildParams][MTABuildResult] =
                contentModule[MTABuildParams]?.[MTABuildResult] ?? 'resources';
            contentModule[MTABuildParams].requires = contentModule[MTABuildParams].requires ?? [];
            const artifactName = `${appName}.zip`;
            if (
                contentModule[MTABuildParams].requires?.findIndex((app: mta.Requires & { artifacts?: string[] }) =>
                    app.artifacts?.includes?.(artifactName)
                ) !== -1
            ) {
                this.ctx.log?.debug(t('debug.html5AlreadyExists', { appName }));
                isHTML5AlreadyExisting = true;
            } else {
                contentModule[MTABuildParams].requires.push({
                    name: appName.slice(0, MAX_MTA_ID_LENGTH),
                    artifacts: [artifactName],
                    'target-path': `${contentModule[MTABuildParams][MTABuildResult]}/`.replace(/\/{2,}/g, '/')
                });
            }
            await this.ctx.mta.updateModule(contentModule);
            this.ctx.dirty = true;
        }

        if (!isHTML5AlreadyExisting && !this.ctx.apps.get(appName)) {
            const app: HTML5App = {
                name: appName.slice(0, MAX_MTA_ID_LENGTH),
                type: 'html5',
                path: appPath,
                'build-parameters': HTMLAppBuildParams as HTML5App['build-parameters']
            } as HTML5App;
            await this.ctx.mta.addModule(app);
            this.ctx.apps.set(appName, app);
            this.ctx.dirty = true;
            this.ctx.log?.debug(t('debug.html5AppAdded', { appName }));
        }
        await this.syncHtml5Apps();
        await this.addMtaDeployParameters();
    }

    /** Add the before-all build parameters (npm install). */
    async addMtaBuildParameters(): Promise<void> {
        const params = ((await this.ctx.mta.getBuildParameters()) ?? {}) as Record<string, unknown>;
        (params['before-all'] as unknown[]) ??= [];
        (params['before-all'] as unknown[]).push({ builder: 'custom', commands: ['npm install'] });
        await this.ctx.mta.updateBuildParameters(params as mta.ProjectBuildParameters);
        this.ctx.dirty = true;
    }

    /** Set deployment parameters (deploy_mode and enable-parallel-deployments). */
    async addMtaDeployParameters(): Promise<void> {
        let params = await this.ctx.mta.getParameters();
        params = { ...(params ?? {}), ...{} } as mta.Parameters;
        params[deployMode] = 'html5-repo';
        params[enableParallelDeployments] = true;
        await this.ctx.mta.updateParameters(params);
        this.ctx.dirty = true;
    }

    private getAppContentModule(): mta.Module | undefined {
        return (
            this.ctx.modules.get('com.sap.application.content:resource') ??
            this.ctx.modules.get('com.sap.application.content:appfront')
        );
    }

    private async syncHtml5Apps(): Promise<void> {
        for (const [appName, app] of this.ctx.apps.entries()) {
            if (app.type === 'html5' && app.path && app['build-parameters']) {
                this.ctx.log?.debug(t('debug.processHTML5App', { appName }));
                try {
                    const packageJson = JSON.parse(
                        readFileSync(join(this.ctx.mtaDir, app.path, FileName.Package), 'utf8')
                    ) as Package;
                    if (packageJson && hasDependency(packageJson, '@sap/ux-ui5-tooling')) {
                        app['build-parameters'].commands = ['npm install', 'npm run build:cf'];
                        await this.ctx.mta.updateModule(app);
                        this.ctx.dirty = true;
                    }
                } catch (error) {
                    this.ctx.log?.debug(t('debug.unableToReadPackageJson', { error }));
                }
            }
        }
    }
}
