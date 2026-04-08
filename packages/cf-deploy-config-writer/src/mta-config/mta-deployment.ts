import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'node:util';
import { render } from 'ejs';
import { Mta, type mta } from '@sap/mta-lib';
import { YamlDocument } from '@sap-ux/yaml';
import { FileName, getMtaPath } from '@sap-ux/project-access';
import { t } from '../i18n';
import type { Logger } from '@sap-ux/logger';
import type { YAMLMap, YAMLSeq } from '@sap-ux/yaml';
import { RouterModuleType, type MTADestinationType } from '../types';
import { ManagedXSUAA, HTML5RepoHost, ManagedAppFront, MAX_MTA_PREFIX_LENGTH } from '../constants';
import type { MtaContext } from './mta-context';
import { RouterConfigurator } from './router-configurator';
import { ResourceManager } from './resource-manager';
import { DestinationManager } from './destination-manager';

export interface ManagedAppOptions {
    appName: string;
    appPath: string;
    destinationName?: string;
    addConnectivity?: boolean;
    abapService?: { name: string; btpService: string };
}

export interface RouterDeployOptions {
    routerType?: RouterModuleType;
    addMissingModules?: boolean;
    addConnectivity?: boolean;
    abapService?: { name: string; btpService: string };
}

/**
 * Public entry point for MTA configuration operations.
 *
 * Replaces the monolithic MtaConfig god class. Internally delegates to three
 * focused private managers (RouterConfigurator, ResourceManager, DestinationManager)
 * that share state via MtaContext.
 *
 * Primary entry points:
 * - `deployManagedApp()` — 80% case: full managed HTML5 app in one call
 * - `deployWithRouter()` — non-standard router types (standalone, appFront)
 */
export class MtaDeployment {
    private readonly ctx: MtaContext;
    private readonly router: RouterConfigurator;
    private readonly resources: ResourceManager;
    private readonly destinations: DestinationManager;

    private constructor(ctx: MtaContext) {
        this.ctx = ctx;
        this.router = new RouterConfigurator(ctx);
        this.resources = new ResourceManager(ctx);
        this.destinations = new DestinationManager(ctx);
    }

    /**
     * Factory: create and initialise a new MtaDeployment from an mta.yaml on disk.
     *
     * @param mtaDir Directory containing mta.yaml
     * @param logger Optional logger instance
     */
    public static async newInstance(mtaDir: string, logger?: Logger): Promise<MtaDeployment> {
        const mta = new Mta(mtaDir, false);
        const ctx: MtaContext = {
            mta,
            apps: new Map(),
            modules: new Map(),
            resources: new Map(),
            mtaDir,
            log: logger,
            mtaId: '',
            dirty: false
        };
        const instance = new MtaDeployment(ctx);
        await instance.init();
        return instance;
    }

    private async init(): Promise<void> {
        try {
            await this.loadMTAResources();
            await this.loadMTAModules();
            this.ctx.mtaId = await this.ctx.mta.getMtaID();
        } catch (error) {
            this.ctx.log?.error(t('error.unableToLoadMTA', { error, mtaDir: this.ctx.mtaDir }));
        }
    }

    private async loadMTAResources(): Promise<void> {
        const resourceList = (await this.ctx.mta.getResources()) || [];
        resourceList.forEach((resource) => {
            if (resource.parameters?.service) {
                if (resource.parameters.service === 'html5-apps-repo') {
                    this.ctx.resources.set(
                        resource.parameters['service-plan'] === 'app-host'
                            ? HTML5RepoHost
                            : 'html5-apps-repo:app-runtime',
                        resource
                    );
                } else if (resource.parameters.service === 'xsuaa') {
                    this.ctx.resources.set(ManagedXSUAA, resource);
                } else if (resource.parameters.service === 'app-front') {
                    this.ctx.resources.set(ManagedAppFront, resource);
                } else if (resource.type === 'org.cloudfoundry.existing-service') {
                    this.ctx.resources.set(resource.name, resource);
                } else {
                    this.ctx.resources.set(resource.parameters.service, resource);
                }
            }
        });
        this.ctx.log?.debug(t('debug.mtaLoaded', { type: 'resources', size: this.ctx.resources.size }));
    }

    private targetExists(requires: mta.Requires[], resourceType: string): boolean {
        return (
            requires &&
            requires.findIndex(
                (r) =>
                    r.parameters?.['content-target'] === true && this.ctx.resources.get(resourceType)?.name === r.name
            ) !== -1
        );
    }

    private async loadMTAModules(): Promise<void> {
        const moduleList = (await this.ctx.mta.getModules()) || [];
        moduleList.forEach((module: mta.Module) => {
            if (module.type) {
                if (module.type === 'html5') {
                    this.ctx.apps.set(module.name, module);
                } else if (this.targetExists(module.requires ?? [], 'destination')) {
                    this.ctx.modules.set('com.sap.application.content:destination', module);
                } else if (this.targetExists(module.requires ?? [], HTML5RepoHost)) {
                    this.ctx.modules.set('com.sap.application.content:resource', module);
                } else if (this.targetExists(module.requires ?? [], ManagedAppFront)) {
                    this.ctx.modules.set('com.sap.application.content:appfront', module);
                } else {
                    this.ctx.modules.set(module.type, module);
                }
            }
        });
        this.ctx.log?.debug(t('debug.mtaLoaded', { type: 'modules', size: this.ctx.modules.size }));
    }

    // ---- Public API ----

    /**
     * The MTA ID prefix.
     */
    public get prefix(): string {
        return this.ctx.mtaId;
    }

    /**
     * Path to the standalone approuter module, if present.
     */
    public get standaloneRouterPath(): string | undefined {
        return this.router.standaloneRouterPath;
    }

    /**
     * Cloud service name read from the content module destinations.
     */
    public get cloudServiceName(): string | undefined {
        return this.router.cloudServiceName;
    }

    /**
     * True if the MTA contains an AppFront router module.
     */
    public hasAppFrontendRouter(): boolean {
        return this.router.hasAppFrontendRouter();
    }

    /**
     * True if the MTA contains an XSUAA resource.
     */
    public hasManagedXsuaaResource(): boolean {
        return this.resources.hasManagedXsuaaResource();
    }

    /**
     * True if the MTA contains an ABAP service resource.
     */
    public get isABAPServiceFound(): boolean {
        return this.resources.isABAPServiceFound;
    }

    /**
     * Get exposed destination names.
     *
     * @param checkWebIDEUsage If true, only return OData destinations
     */
    public getExposedDestinations(checkWebIDEUsage = false): string[] {
        return this.destinations.getExposedDestinations(checkWebIDEUsage);
    }

    /**
     * Format a string with the MTA prefix, sanitising special characters.
     *
     * @param formatString Template string e.g. `%s-srv-api`
     */
    public getFormattedPrefix(formatString: string): string {
        return format(formatString, this.prefix).replace(/[^\w-]/g, '_');
    }

    // ---- Router / resource orchestration ----

    /**
     * 80% case: configure managed HTML5 app deployment in one call.
     * Ensures all required resources, router module, and app registration are done.
     */
    public async deployManagedApp(options: ManagedAppOptions): Promise<void> {
        // Ensure managed router prerequisites
        if (!this.ctx.resources.has('destination')) {
            await this.resources.addDestinationResource(true);
        }
        if (!this.ctx.resources.has(ManagedXSUAA)) {
            await this.resources.addManagedUAAWithSecurity();
        }
        if (!this.ctx.resources.has(HTML5RepoHost)) {
            await this.resources.addHtml5Host();
        }
        await this.resources.updateServiceName('html5', HTML5RepoHost);
        await this.resources.updateServiceName('xsuaa', ManagedXSUAA);

        // Add managed router module
        await this.router.addManagedRouter();
        await this.router.cleanupMissingResources();
        await this.router.cleanupModules();

        // Register the app
        await this.resources.addApp(options.appName, options.appPath);

        // Optional add-ons
        if (options.addConnectivity) {
            await this.resources.addConnectivityResource();
        }
        if (options.abapService?.name && options.abapService?.btpService) {
            await this.resources.addAbapService(options.abapService.name, options.abapService.btpService);
        }

        // Deploy parameters
        await this.resources.addMtaDeployParameters();
    }

    /**
     * Non-standard router types: standalone (Standard) or AppFront.
     * Used by base-config, cap-config, and app-config for non-managed flows.
     */
    public async deployWithRouter(options: RouterDeployOptions): Promise<void> {
        if (options.routerType === RouterModuleType.Standard) {
            if (!this.ctx.resources.has('xsuaa')) {
                await this.resources.addUaa();
            }
            if (!this.ctx.resources.has('html5-apps-repo:app-runtime')) {
                await this.resources.addHtml5Runtime();
            }
            if (!this.ctx.resources.has('destination')) {
                await this.resources.addDestinationResource();
            }
            await this.router.addStandaloneRouter(true);
        } else if (options.routerType === RouterModuleType.AppFront) {
            if (!this.ctx.resources.has(ManagedXSUAA)) {
                await this.resources.addManagedUAAWithSecurity();
            }
            await this.resources.updateServiceName('xsuaa', ManagedXSUAA);
            if (!this.ctx.resources.has(ManagedAppFront)) {
                await this.resources.addAppFrontResource();
            }
            await this.router.addAppFrontRouter();
            await this.resources.updateServerModule(
                'com.sap.application.content:appfront' as Parameters<typeof this.resources.updateServerModule>[0],
                ManagedXSUAA,
                false
            );
            await this.resources.updateServerModule(
                'nodejs' as Parameters<typeof this.resources.updateServerModule>[0],
                ManagedXSUAA,
                false
            );
        } else if (options.routerType === RouterModuleType.Managed) {
            if (!this.ctx.resources.has('destination')) {
                await this.resources.addDestinationResource(true);
            }
            if (!this.ctx.resources.has(ManagedXSUAA)) {
                await this.resources.addManagedUAAWithSecurity();
            }
            if (!this.ctx.resources.has(HTML5RepoHost)) {
                await this.resources.addHtml5Host();
            }
            await this.router.addManagedRouter();
        }

        if (options.routerType !== RouterModuleType.AppFront) {
            if (options.addMissingModules ?? true) {
                await this.router.cleanupMissingResources();
            }
            await this.router.cleanupModules();
        }

        if (options.addConnectivity) {
            await this.resources.addConnectivityResource();
        }
        if (options.abapService?.name && options.abapService?.btpService) {
            await this.resources.addAbapService(options.abapService.name, options.abapService.btpService);
        }

        await this.resources.addMtaDeployParameters();
    }

    /**
     * Register an HTML5 app module and update the content module build-parameters.
     *
     * @param appName HTML5 module name
     * @param appPath Relative path to the app
     */
    public async addApp(appName: string, appPath: string): Promise<void> {
        await this.resources.addApp(appName, appPath);
    }

    /**
     * Add a destination to the appropriate router.
     *
     * @param cfDestination Destination name
     */
    public async addDestinationToAppRouter(cfDestination: string | undefined): Promise<void> {
        await this.destinations.addDestinationToAppRouter(cfDestination);
    }

    /**
     * Add or extend an MTA extension config file (mta.ext.yaml).
     *
     * @param instanceDestName Instance destination name
     * @param destUrl Destination URL
     * @param headerConfig Additional header config key/value
     */
    public async addMtaExtensionConfig(
        instanceDestName: string | undefined,
        destUrl: string,
        headerConfig: { key: string; value: string }
    ): Promise<void> {
        let destinationServiceName = this.ctx.resources.get('destination')?.name;
        if (!destinationServiceName) {
            this.ctx.log?.info(t('info.existingDestinationNotFound'));
            destinationServiceName = `${this.prefix?.slice(0, MAX_MTA_PREFIX_LENGTH)}-destination-service`;
        }

        const appMtaId = this.ctx.mtaId;
        const mtaExtFilePath = join(this.ctx.mta.mtaDirPath, FileName.MtaExtYaml);
        let mtaExtensionYamlFile: YamlDocument | undefined;

        try {
            const mtaExtContents = readFileSync(mtaExtFilePath, 'utf-8');
            mtaExtensionYamlFile = await YamlDocument.newInstance(mtaExtContents);
        } catch (err) {
            this.ctx.log?.info(t('info.existingMTAExtensionNotFound', { error: (err as Error).message }));
        }

        if (!mtaExtensionYamlFile) {
            const mtaExt = {
                appMtaId,
                mtaExtensionId: `${appMtaId}-ext`,
                destinationName: instanceDestName,
                destinationUrl: destUrl,
                headerKey: headerConfig.key,
                headerValue: headerConfig.value,
                destinationServiceName,
                mtaVersion: '1.0.0'
            };
            const mtaExtTemplate = readFileSync(join(__dirname, `../../templates/app/${FileName.MtaExtYaml}`), 'utf-8');
            writeFileSync(mtaExtFilePath, render(mtaExtTemplate, mtaExt));
            this.ctx.log?.info(t('info.mtaExtensionCreated', { appMtaId, mtaExtFile: FileName.MtaExtYaml }));
        } else {
            const resources: YAMLSeq = mtaExtensionYamlFile.getSequence({ path: 'resources' });
            const resIdx = resources.items.findIndex((item) => {
                return (item as YAMLMap).get('name') === destinationServiceName;
            });
            if (resIdx > -1) {
                const nodeToInsert = {
                    Authentication: 'NoAuthentication',
                    Name: instanceDestName,
                    ProxyType: 'Internet',
                    Type: 'HTTP',
                    URL: destUrl,
                    [`URL.headers.${headerConfig.key}`]: headerConfig.value
                };
                mtaExtensionYamlFile.appendTo({
                    path: `resources.${resIdx}.parameters.config.init_data.instance.destinations`,
                    value: nodeToInsert
                });
                writeFileSync(mtaExtFilePath, mtaExtensionYamlFile.toString());
                this.ctx.log?.info(t('info.mtaExtensionUpdated', { mtaExtFile: FileName.MtaExtYaml }));
            } else {
                this.ctx.log?.error(t('error.updatingMTAExtensionFailed', { mtaExtFilePath }));
            }
        }
    }

    /**
     * Add the before-all build parameters (npm install).
     */
    public async addMtaBuildParameters(): Promise<void> {
        await this.resources.addMtaBuildParameters();
    }

    /**
     * Get MTA parameters.
     */
    public async getParameters(): Promise<mta.Parameters> {
        return this.ctx.mta.getParameters();
    }

    /**
     * Get MTA build parameters.
     */
    public async getBuildParameters(): Promise<mta.ProjectBuildParameters> {
        return this.ctx.mta.getBuildParameters();
    }

    /**
     * Update MTA parameters.
     *
     * @param parameters Parameters to apply
     */
    public async updateParameters(parameters: mta.Parameters): Promise<void> {
        await this.ctx.mta.updateParameters(parameters);
        this.ctx.dirty = true;
    }

    /**
     * Update MTA build parameters.
     *
     * @param parameters Build parameters to apply
     */
    public async updateBuildParams(parameters: mta.ProjectBuildParameters): Promise<void> {
        await this.ctx.mta.updateBuildParameters(parameters);
        this.ctx.dirty = true;
    }

    /**
     * Add routing modules — backwards-compatible shim used by addRoutingConfig() in index.ts.
     *
     * @param options Routing options
     */
    public async addRoutingModules({
        isManagedApp = false,
        isAppFrontApp = false,
        addMissingModules = true
    }: {
        isManagedApp?: boolean;
        isAppFrontApp?: boolean;
        addMissingModules?: boolean;
    } = {}): Promise<void> {
        const routerType = isAppFrontApp
            ? RouterModuleType.AppFront
            : isManagedApp
              ? RouterModuleType.Managed
              : undefined;
        await this.deployWithRouter({ routerType, addMissingModules });
    }

    /**
     * Add a router type — backwards-compatible shim.
     *
     * @param options Router type options
     */
    public async addRouterType({
        routerType,
        addMissingModules = true
    }: {
        routerType?: RouterModuleType;
        addMissingModules?: boolean;
    } = {}): Promise<void> {
        await this.deployWithRouter({ routerType, addMissingModules });
    }

    /**
     * Add standalone router — backwards-compatible shim used by addStandaloneRouter in index.ts.
     *
     * @param fromServerGenerator If true the router uses a shorter relative path
     */
    public async addStandaloneRouter(fromServerGenerator = false): Promise<void> {
        if (!this.ctx.resources.has('xsuaa')) {
            await this.resources.addUaa();
        }
        if (!this.ctx.resources.has('html5-apps-repo:app-runtime')) {
            await this.resources.addHtml5Runtime();
        }
        if (!this.ctx.resources.has('destination')) {
            await this.resources.addDestinationResource();
        }
        await this.router.addStandaloneRouter(fromServerGenerator);
    }

    /**
     * Add connectivity resource — backwards-compatible shim.
     */
    public async addConnectivityResource(): Promise<void> {
        await this.resources.addConnectivityResource();
    }

    /**
     * Add ABAP service — backwards-compatible shim.
     *
     * @param serviceName ABAP service instance name
     * @param btpService BTP service type
     */
    public async addAbapService(serviceName: string, btpService: string): Promise<void> {
        await this.resources.addAbapService(serviceName, btpService);
    }

    /**
     * Save changes to mta.yaml if dirty.
     *
     * @returns True if changes were written
     */
    public async save(): Promise<boolean> {
        if (this.ctx.dirty) {
            await this.ctx.mta.save();
        }
        return this.ctx.dirty;
    }
}

/**
 * @deprecated Use MtaDeployment instead. This alias exists for backwards compatibility.
 */
export { MtaDeployment as MtaConfig };
