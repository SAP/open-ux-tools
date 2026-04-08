import type { mta } from '@sap/mta-lib';
import {
    CloudFoundry,
    RouterModule,
    ManagedXSUAA,
    HTML5RepoHost,
    ManagedAppFront,
    UI5StandaloneModuleDestination,
    MAX_MTA_PREFIX_LENGTH,
    SRV_API,
    UI5AppfrontDestinationParameter,
    CAPAppfrontDestination,
    DefaultMTADestination
} from '../constants';
import { t } from '../i18n';
import { RouterModuleType, type MTADestinationType } from '../types';
import type { MtaContext } from './mta-context';

/**
 * Manages router module configuration (approuter.nodejs, com.sap.application.content variants).
 * All methods are package-private — only MtaDeployment instantiates this class.
 */
export class RouterConfigurator {
    constructor(private readonly ctx: MtaContext) {}

    /**
     * Add a standalone (approuter.nodejs) router module.
     * Assumes xsuaa, html5-apps-repo:app-runtime, and destination resources already exist.
     *
     * @param fromServerGenerator If true the router path uses a shorter relative path
     */
    async addStandaloneRouter(fromServerGenerator = false): Promise<void> {
        this.ctx.log?.debug(t('debug.addingRouter', { routerType: RouterModuleType.Standard }));
        const appRuntimeName = this.ctx.resources.get('html5-apps-repo:app-runtime')?.name;
        const xsuaaName = this.ctx.resources.get('xsuaa')?.name;
        const destinationName = this.ctx.resources.get('destination')?.name;
        if (destinationName && xsuaaName && appRuntimeName) {
            const router: mta.Module = {
                name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-router`,
                type: 'approuter.nodejs',
                path: fromServerGenerator ? `${RouterModule}` : `${CloudFoundry}/${RouterModule}`,
                parameters: {
                    'disk-quota': '256M',
                    memory: '256M'
                },
                requires: [
                    { name: appRuntimeName },
                    { name: xsuaaName },
                    {
                        name: destinationName,
                        group: 'destinations',
                        properties: { name: 'ui5', url: 'https://ui5.sap.com', forwardAuthToken: false }
                    }
                ]
            };
            await this.ctx.mta.addModule(router);
            this.ctx.modules.set('approuter.nodejs', router);
            this.ctx.dirty = true;
        }
    }

    /**
     * Add a managed AppRouter (com.sap.application.content:destination).
     * Assumes destination, html5-apps-repo (app-host), and xsuaa resources already exist.
     */
    async addManagedRouter(): Promise<void> {
        if (this.ctx.modules.has('com.sap.application.content:destination')) {
            return;
        }
        this.ctx.log?.debug(t('debug.addingRouter', { routerType: RouterModuleType.Managed }));
        const destinationName = this.ctx.resources.get('destination')?.name;
        const appHostName = this.ctx.resources.get(HTML5RepoHost)?.name;
        const managedXSUAAName = this.ctx.resources.get(ManagedXSUAA)?.name;
        if (destinationName && appHostName && managedXSUAAName) {
            const appHostServiceName = this.getServiceInstanceName(HTML5RepoHost);
            const managedXSUAAServiceName = this.getServiceInstanceName(ManagedXSUAA);
            const router: mta.Module = {
                name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-destination-content`,
                type: 'com.sap.application.content',
                requires: [
                    { name: destinationName, parameters: { 'content-target': true } },
                    { name: appHostName, parameters: { 'service-key': { name: `${appHostName}-key` } } },
                    { name: managedXSUAAName, parameters: { 'service-key': { name: `${managedXSUAAName}-key` } } }
                ],
                parameters: {
                    content: {
                        instance: {
                            destinations: [
                                {
                                    Name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}_html_repo_host`,
                                    ServiceInstanceName: appHostServiceName,
                                    ServiceKeyName: `${appHostName}-key`,
                                    'sap.cloud.service': `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}`
                                },
                                {
                                    Authentication: 'OAuth2UserTokenExchange',
                                    Name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}_uaa`,
                                    ServiceInstanceName: managedXSUAAServiceName,
                                    ServiceKeyName: `${managedXSUAAName}-key`,
                                    'sap.cloud.service': `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}`
                                }
                            ],
                            'existing_destinations_policy': 'update'
                        }
                    }
                },
                'build-parameters': { 'no-source': true }
            };
            await this.ctx.mta.addModule(router);
            this.ctx.modules.set('com.sap.application.content:destination', router);
            this.ctx.dirty = true;
        }
    }

    /**
     * Add an AppFront router (com.sap.application.content:appfront).
     * Assumes xsuaa and app-front resources already exist.
     */
    async addAppFrontRouter(): Promise<void> {
        if (this.ctx.modules.has('com.sap.application.content:appfront')) {
            return;
        }
        this.ctx.log?.debug(t('debug.addingRouter', { routerType: RouterModuleType.AppFront }));
        const appHostName = this.ctx.resources.get(ManagedAppFront)?.name;
        if (appHostName) {
            const appContentModule: mta.Module = {
                name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-app-content`,
                type: 'com.sap.application.content',
                path: '.',
                requires: [{ name: appHostName, parameters: { 'content-target': true } }],
                parameters: {
                    config: {
                        destinations: [UI5AppfrontDestinationParameter]
                    }
                }
            };
            if (this.ctx.modules.has('nodejs')) {
                appContentModule.requires?.push({ name: SRV_API });
            }
            await this.ctx.mta.addModule(appContentModule);
            this.ctx.modules.set('com.sap.application.content:appfront', appContentModule);
            this.ctx.dirty = true;
        }
    }

    /**
     * Dispatch router setup by type and optionally clean up missing resources/modules.
     *
     * @param root0
     * @param root0.routerType
     * @param root0.addMissingModules
     */
    async configureRouter({
        routerType,
        addMissingModules = true
    }: {
        routerType?: RouterModuleType;
        addMissingModules?: boolean;
    } = {}): Promise<void> {
        if (routerType === RouterModuleType.Standard) {
            await this.addStandaloneRouter(true);
        }
        if (routerType === RouterModuleType.Managed) {
            await this.addManagedRouter();
        }
        if (routerType === RouterModuleType.AppFront) {
            await this.addAppFrontRouter();
        }
        if (routerType !== RouterModuleType.AppFront) {
            if (addMissingModules) {
                await this.cleanupMissingResources();
            }
            await this.cleanupModules();
        }
    }

    /**
     * Ensure missing content modules and destination resources are present.
     */
    async cleanupMissingResources(): Promise<void> {
        this.ctx.log?.debug(t('debug.addMissingModules'));
        if (!this.ctx.modules.has('com.sap.application.content:appfront')) {
            if (!this.ctx.modules.has('com.sap.application.content:resource')) {
                await this.addAppContent();
            }
            if (this.ctx.resources.get('destination')) {
                await this.updateDestinationResource(this.ctx.modules.has('com.sap.application.content:destination'));
            } else {
                await this.addDestinationResource(this.ctx.modules.has('com.sap.application.content:destination'));
            }
        }
    }

    /**
     * Ensure existing router modules have the destination resource wired in their requires.
     */
    async cleanupModules(): Promise<void> {
        this.ctx.log?.debug(t('debug.cleanupModules'));
        for (const module of [
            this.ctx.modules.get('com.sap.application.content:destination'),
            this.ctx.modules.get('approuter.nodejs')
        ].filter((elem): elem is mta.Module => elem !== undefined)) {
            const destinationName =
                this.ctx.resources.get('destination')?.name ??
                `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-destination-service`;
            if (module.requires?.findIndex((app) => app.name === destinationName) === -1) {
                if (module.type === 'approuter.nodejs') {
                    module.requires.push({ name: destinationName, ...UI5StandaloneModuleDestination });
                }
                if (module.type === 'com.sap.application.content') {
                    module.requires.push({ name: destinationName, parameters: { 'content-target': true } });
                }
                await this.ctx.mta.updateModule(module);
                this.ctx.dirty = true;
            }
        }
    }

    /**
     * Update router modules to require the connectivity and ABAP resources (called after those are added).
     *
     * @param managedXSUAAName
     * @param appendSrvApi
     */
    async updateServerModuleAppFront(managedXSUAAName: string, appendSrvApi: boolean): Promise<void> {
        for (const moduleType of ['com.sap.application.content:appfront' as const, 'nodejs' as const] as Array<
            keyof typeof RouterModuleType | string
        >) {
            const serverModule = this.ctx.modules.get(moduleType as string);
            if (serverModule) {
                const mtaResource = this.ctx.resources.get(ManagedXSUAA);
                if (appendSrvApi && !serverModule.provides?.some((ele) => ele.name === SRV_API)) {
                    serverModule.provides = [...(serverModule.provides ?? [])];
                }
                if (mtaResource && !serverModule.requires?.some((ele) => ele.name === mtaResource.name)) {
                    serverModule.requires = [...(serverModule.requires ?? []), { name: mtaResource.name }];
                }
                await this.ctx.mta.updateModule(serverModule);
                this.ctx.modules.set(moduleType as string, serverModule);
                this.ctx.dirty = true;
            }
        }
    }

    /** Returns true if the MTA contains an AppFront router module. */
    hasAppFrontendRouter(): boolean {
        return this.ctx.modules.has('com.sap.application.content:appfront');
    }

    /** Returns the path to the standalone approuter if present. */
    get standaloneRouterPath(): string | undefined {
        return this.ctx.modules.get('approuter.nodejs')?.path;
    }

    /** Returns the cloud service name from the content module destinations. */
    get cloudServiceName(): string | undefined {
        let cloudServiceName: string | undefined;
        this.ctx.modules.forEach((contentModule) => {
            const moduleDestinations: MTADestinationType[] =
                contentModule.parameters?.content?.instance?.destinations ?? [];
            if (contentModule.type === 'com.sap.application.content' && moduleDestinations.length) {
                moduleDestinations.some((destination: MTADestinationType) => {
                    cloudServiceName = destination['sap.cloud.service'];
                    return !!cloudServiceName;
                });
            }
        });
        return cloudServiceName;
    }

    // ---- private helpers forwarded from ResourceManager logic needed here ----

    private getServiceInstanceName(resourceName: string): string | undefined {
        const resource = this.ctx.resources.get(resourceName);
        const explicitServiceName = resource?.parameters?.['service-name'];
        return explicitServiceName ?? resource?.name;
    }

    private async addAppContent(): Promise<void> {
        if (!this.ctx.resources.has(HTML5RepoHost)) {
            await this.addHtml5Host();
        }
        const appHostName = this.ctx.resources.get(HTML5RepoHost)?.name;
        if (appHostName) {
            const appContentModule: mta.Module = {
                name: `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-app-content`,
                type: 'com.sap.application.content',
                path: '.',
                requires: [{ name: appHostName, parameters: { 'content-target': true } }],
                'build-parameters': { 'build-result': 'resources', requires: [] }
            };
            await this.ctx.mta.addModule(appContentModule);
            this.ctx.modules.set('com.sap.application.content:resource', appContentModule);
            this.ctx.dirty = true;
        }
    }

    private async addHtml5Host(): Promise<void> {
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

    private async addDestinationResource(isManagedApp = false): Promise<void> {
        const destinationName = `${this.ctx.mtaId?.slice(0, MAX_MTA_PREFIX_LENGTH)}-destination-service`;
        const resource: mta.Resource = {
            name: destinationName,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                service: 'destination',
                'service-name': destinationName,
                'service-plan': 'lite',
                config: {
                    init_data: {
                        instance: {
                            existing_destinations_policy: 'update',
                            destinations: [
                                {
                                    Name: 'ui5',
                                    Description: 'ui5',
                                    URL: 'https://ui5.sap.com',
                                    Type: 'HTTP',
                                    ProxyType: 'Internet',
                                    Authentication: 'NoAuthentication'
                                }
                            ]
                        }
                    },
                    ['HTML5Runtime_enabled']: isManagedApp
                }
            }
        };
        await this.ctx.mta.addResource(resource);
        this.ctx.resources.set('destination', resource);
        this.ctx.dirty = true;
    }

    private async updateDestinationResource(isManagedApp = false): Promise<void> {
        const resource = this.ctx.resources.get('destination');
        if (resource) {
            resource.parameters = {
                ...(resource.parameters ?? {}),
                config: {
                    ...(resource.parameters?.config ?? {}),
                    ['HTML5Runtime_enabled']: isManagedApp
                }
            };
            await this.ctx.mta.updateResource(resource);
            this.ctx.resources.set('destination', resource);
            this.ctx.dirty = true;
        }
    }

    /**
     * Add a destination to AppFront router module (inline config).
     *
     * @param cfDestination
     */
    async addAppFrontDestination(cfDestination: string | undefined): Promise<void> {
        const module = this.ctx.modules.get('com.sap.application.content:appfront');
        if (module) {
            const destName = cfDestination === DefaultMTADestination ? SRV_API : cfDestination;
            if (
                !module.parameters?.config?.destinations?.some(
                    (destination: MTADestinationType) => destination.Name === destName
                )
            ) {
                const destination = { ...CAPAppfrontDestination, name: destName };
                module.parameters?.config?.destinations.push(destination);
                await this.ctx.mta.updateModule(module);
            }
        }
    }
}
