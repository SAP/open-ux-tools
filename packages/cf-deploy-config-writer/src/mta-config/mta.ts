import { format } from 'util';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { render } from 'ejs';
import { Mta, type mta } from '@sap/mta-lib';
import { type Destination, isGenericODataDestination, isAbapEnvironmentOnBtp } from '@sap-ux/btp-utils';
import { YamlDocument } from '@sap-ux/yaml';
import { getMtaPath } from '@sap-ux/project-access';
import {
    CloudFoundry,
    RouterModule,
    MTAYamlFile,
    ResourceMTADestination,
    DefaultMTADestination,
    SRV_API,
    ManagedXSUAA,
    MTAFileExtension,
    MTABuildParams,
    MTABuildResult,
    DestinationServiceConfig,
    UI5ResourceDestination,
    UI5Destination,
    MTAAPIDestination,
    UI5StandaloneModuleDestination,
    ServiceAPIRequires,
    HTMLAppBuildParams,
    MTAVersion
} from '../constants';
import { t } from '../i18n';
import type { Logger } from '@sap-ux/logger';
import type { YAMLMap, YAMLSeq } from '@sap-ux/yaml';
import {
    CloudFoundryServiceType,
    type HTML5App,
    type ModuleType,
    type ResourceType,
    type MTADestinationType
} from '../types';

/**
 * A class representing interactions with the MTA binary, found at https://sap.github.io/cloud-mta-build-tool/.
 */
export class MtaConfig {
    private readonly mta: Mta;
    private readonly apps: Map<string, mta.Module> = new Map();
    private readonly modules: Map<string, mta.Module> = new Map();
    private readonly resources: Map<string, mta.Resource> = new Map();
    private readonly log: Logger | undefined;
    private dirty = false;
    private mtaId: string;

    /**
     * Returns a new instance of MtaConfig.
     *
     * @static
     * @param {string} mtaDir - the path to the mta.yaml file
     * @param {Logger} logger - the logger instance
     * @returns {MtaConfig} the MtaConfig instance
     */
    public static async newInstance(mtaDir: string, logger?: Logger): Promise<MtaConfig> {
        return new MtaConfig(mtaDir, logger).init();
    }

    /**
     * Creates an instance of Mta.
     *
     * @param {string} mtaDir - the path to the mta.yaml file
     * @param {Logger} logger - the logger instance
     * @memberof Mta
     */
    private constructor(mtaDir: string, logger: Logger | undefined) {
        this.mta = new Mta(mtaDir, false);
        this.log = logger;
    }

    /**
     * Load the modules and resources, read from the mta.yaml file.
     *
     * @returns {Promise<MtaConfig>} an MtaConfig instance
     */
    private async init(): Promise<MtaConfig> {
        try {
            await this.loadMTAResources();
            await this.loadMTAModules();
            this.mtaId = await this.mta.getMtaID();
        } catch (e) {
            this.log?.error(t('error.unableToLoadMTA'));
        }
        return this;
    }

    /**
     * Determines if the MTA configuration contains a known resource or module.
     *
     * @param requires resource to validate
     * @param resourceType managed or existing service
     * @returns true if the resource exists, false otherwise
     * @private
     */
    private targetExists(requires: mta.Requires[], resourceType: string): boolean {
        return (
            requires &&
            requires.findIndex(
                (requireEle) =>
                    requireEle.parameters?.['content-target'] === true &&
                    this.resources.get(resourceType)?.name === requireEle.name
            ) !== -1
        );
    }

    private async loadMTAResources(): Promise<void> {
        // Handle resources first, modules need to verify if resources exist
        const resources = (await this.mta.getResources()) || [];
        resources.forEach((resource) => {
            if (resource.parameters?.service) {
                if (resource.parameters?.service === 'html5-apps-repo') {
                    this.resources.set(
                        resource.parameters['service-plan'] === 'app-host'
                            ? 'html5-apps-repo:app-host'
                            : 'html5-apps-repo:app-runtime',
                        resource
                    );
                } else if (resource.parameters?.service === 'xsuaa') {
                    this.resources.set(ManagedXSUAA, resource);
                } else if (resource.type === CloudFoundryServiceType.Existing) {
                    this.resources.set(resource.name, resource);
                } else {
                    this.resources.set(resource.parameters.service, resource);
                }
            }
        });
        this.log?.debug(t('debug.mtaLoaded', { type: 'resources' }));
    }

    private async loadMTAModules(): Promise<void> {
        const modules = (await this.mta.getModules()) || [];
        modules.forEach((module: mta.Module) => {
            if (module.type) {
                if (module.type === 'html5') {
                    this.apps.set(module.name, module);
                } else if (this.targetExists(module.requires ?? [], 'destination')) {
                    this.modules.set('com.sap.application.content:destination', module);
                } else if (this.targetExists(module.requires ?? [], 'html5-apps-repo:app-host')) {
                    this.modules.set('com.sap.application.content:resource', module);
                } else {
                    this.modules.set(module.type as ModuleType, module); // i.e. 'approuter.nodejs'
                }
            }
        });
        this.log?.debug(t('debug.mtaLoaded', { type: 'modules' }));
    }

    private async addAppContent(): Promise<void> {
        if (!this.resources.has('html5-apps-repo:app-host')) {
            await this.addHtml5Host();
        }
        // Setup the basic module template, artifacts will be added in another step
        const appHostName = this.resources.get('html5-apps-repo:app-host')?.name;
        if (appHostName) {
            const deployer: mta.Module = {
                name: `${this.prefix.slice(0, 38)}-app-content`,
                type: 'com.sap.application.content',
                path: '.',
                requires: [
                    {
                        name: appHostName,
                        parameters: {
                            'content-target': true
                        }
                    }
                ],
                'build-parameters': {
                    'build-result': 'resources',
                    requires: []
                }
            };
            await this.mta.addModule(deployer);
            this.modules.set('com.sap.application.content:resource', deployer);
            this.dirty = true;
        }
    }

    private async addUaa(): Promise<void> {
        const resource: mta.Resource = {
            name: `${this.prefix.slice(0, 46)}-uaa`,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                'service-plan': 'application',
                service: 'xsuaa',
                config: { xsappname: this.prefix + '-${space-guid}', 'tenant-mode': 'dedicated' }
            }
        };
        await this.mta.addResource(resource);
        this.resources.set('xsuaa', resource);
        this.dirty = true;
    }

    private async addHtml5Runtime(): Promise<void> {
        const resource: mta.Resource = {
            name: `${this.prefix.slice(0, 29)}-html5-repo-runtime`,
            type: 'org.cloudfoundry.managed-service',
            parameters: { 'service-plan': 'app-runtime', service: 'html5-apps-repo' }
        };
        await this.mta.addResource(resource);
        this.resources.set('html5-apps-repo:app-runtime', resource);
        this.dirty = true;
    }

    private async addHtml5Host(): Promise<void> {
        const html5host = `${this.prefix.slice(0, 40)}-repo-host`; // Need to cater for -key being added too!
        const resource: mta.Resource = {
            name: html5host,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                'service-name': `${this.prefix.slice(0, 36)}-html5-service`,
                'service-plan': 'app-host',
                service: 'html5-apps-repo'
            }
        };
        await this.mta.addResource(resource);
        this.resources.set('html5-apps-repo:app-host', resource);
        this.dirty = true;
    }

    /**
     * Add a destination service to the MTA.
     *
     * @param isManagedApp - If the destination service is for a managed app
     */
    private async addDestinationResource(isManagedApp = false): Promise<void> {
        const destinationName = `${this.prefix.slice(0, 30)}-destination-service`;
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
        await this.mta.addResource(resource);
        this.resources.set('destination', resource);
        this.dirty = true;
    }

    /**
     * Update the destination service in the MTA if not already present.
     *
     * @param isManagedApp - If the destination service is for a managed app, false by default
     */
    private async updateDestinationResource(isManagedApp = false): Promise<void> {
        const resource = this.resources.get('destination');
        if (resource) {
            // Append HTML5Runtime_enabled flag, needs to reflect the router type i.e. managed | standalone
            resource.parameters = {
                ...(resource.parameters ?? {}),
                config: {
                    ...(resource.parameters?.config ?? {}),
                    ['HTML5Runtime_enabled']: isManagedApp
                }
            };
            // Ensure the instance destinations exist
            if (!resource.parameters?.config?.init_data?.instance?.destinations) {
                resource.parameters.config = {
                    ...resource.parameters.config,
                    ...UI5ResourceDestination
                };
            }
            // Append the UI5 destination if missing
            if (
                !resource.parameters?.config?.init_data?.instance?.destinations?.some(
                    (destination: MTADestinationType) => destination.Name === UI5Destination.Name
                )
            ) {
                resource.parameters.config.init_data.instance.destinations.push(UI5Destination);
            }
            await this.mta.updateResource(resource);
            this.resources.set('destination', resource);
            this.dirty = true;
        }
    }

    /**
     * Update the server module to include the required dependencies to ensure endpoints are secured.
     *
     * @param moduleType known module type
     */
    private async updateServerModule(moduleType: ModuleType): Promise<void> {
        // Update the CAP API to only allow xsuaa calls, this requires the security.json to be present
        const uaaResource = this.resources.get(ManagedXSUAA);
        const serverModule = this.modules.get(moduleType);
        if (serverModule) {
            // Ensure the server module is providing srv-api
            if (!serverModule.provides?.some((ele) => ele.name === SRV_API)) {
                // Add it back for all this to work!
                serverModule.provides = [...(serverModule.provides ?? []), ...[ServiceAPIRequires]];
            }
            // Ensure there is an xsuaa instance to allow the xs-app.json to use xsuaa to lockdown the endpoints
            if (uaaResource && !serverModule.requires?.some((ele) => ele.name === uaaResource.name)) {
                serverModule.requires = [...(serverModule.requires ?? []), ...[{ name: uaaResource.name }]];
            }
            await this.mta.updateModule(serverModule);
            this.modules.set(moduleType, serverModule);
            this.dirty = true;
        }
    }

    private async addManagedUaa(): Promise<void> {
        const resource: mta.Resource = {
            name: `${this.prefix.slice(0, 46)}-uaa`,
            type: 'org.cloudfoundry.managed-service',
            parameters: {
                path: './xs-security.json',
                service: 'xsuaa',
                'service-name': `${this.prefix}-xsuaa-srv`,
                'service-plan': 'application'
            }
        };
        await this.mta.addResource(resource);
        this.resources.set(ManagedXSUAA, resource);
        this.dirty = true;
    }

    /**
     * Verify if the destination is valid and if WebIDEUsage is set to ODATA_GENERIC or ODATA_ABAP.
     *
     * @param {MTADestinationType} destination - destination object
     * @returns {boolean} - true if the destination is valid, false otherwise
     */
    private isODataDestination(destination: Destination): boolean {
        return isGenericODataDestination(destination) || isAbapEnvironmentOnBtp(destination);
    }

    /**
     *
     * @private
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    private async cleanupMissingResources(): Promise<void> {
        if (!this.modules.has('com.sap.application.content:resource')) {
            await this.addAppContent();
        }

        // For Approuter Configuration generators, the destination resource is missing for both Standalone | Managed
        if (this.resources.get('destination')) {
            // Ensure the resource is added
            await this.updateDestinationResource(this.modules.has('com.sap.application.content:destination'));
        } else {
            // No destination resource found, add it, more common for standalone
            await this.addDestinationResource(this.modules.has('com.sap.application.content:destination'));
        }
    }

    /**
     * Returns the MTA prefix, read from the MTA ID.
     *
     * @returns {string} the MTA ID
     */
    public get prefix(): string {
        return this.mtaId;
    }

    /**
     * Returns the path to the standalone approuter module.
     *
     * @returns {string | undefined} the MTA ID
     */
    public get standaloneRouterPath(): string | undefined {
        return this.modules.get('approuter.nodejs')?.path;
    }

    /**
     * Returns the cloud service name, read from the content module which contains destinations.
     *
     * @returns {string | undefined} the cloud service name
     */
    public get cloudServiceName(): string | undefined {
        let cloudServiceName;
        this.modules.forEach((contentModule) => {
            const moduleDestinations: MTADestinationType[] =
                contentModule.parameters?.content?.instance?.destinations || [];
            if (contentModule.type === 'com.sap.application.content' && moduleDestinations.length) {
                // In theory, if there is more than one, it should be same!
                moduleDestinations.some((destination: MTADestinationType) => {
                    cloudServiceName = destination['sap.cloud.service'] || undefined;
                    if (cloudServiceName) {
                        return true; // breakout
                    }
                });
            }
        });
        return cloudServiceName;
    }

    /**
     * Returns the mta parameters.
     *
     * @returns {Promise<mta.Parameters>} the MTA parameters
     */
    public async getParameters(): Promise<mta.Parameters> {
        return this.mta.getParameters();
    }

    /**
     * Returns the mta build parameters.
     *
     * @returns {Promise<mta.Parameters>} the MTA build parameters
     */
    public async getBuildParameters(): Promise<mta.ProjectBuildParameters> {
        return this.mta.getBuildParameters();
    }

    /**
     * Update the MTA parameters.
     *
     * @param parameters the MTA parameters being applied
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    public async updateParameters(parameters: mta.Parameters): Promise<void> {
        await this.mta.updateParameters(parameters);
    }

    /**
     * Update the MTA build parameters i.e. build-parameters -> before-all.
     *
     * @param parameters the MTA build parameters being applied
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    public async updateBuildParams(parameters: mta.ProjectBuildParameters): Promise<void> {
        await this.mta.updateBuildParameters(parameters);
    }

    /**
     * Append the UI5 app to the MTA.
     *
     * @param {string} appModule the name of the app module i.e. myui5app
     * @param {string} appPath path to the UI5 app i.e. ./apps/myui5app
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    public async addApp(appModule: string, appPath: string): Promise<void> {
        // If an existing content module exists whether standalone/managed, append the new artifact
        const contentModule = this.modules.get('com.sap.application.content:resource');
        if (contentModule) {
            contentModule[MTABuildParams] = contentModule[MTABuildParams] ?? {};
            contentModule[MTABuildParams][MTABuildResult] =
                contentModule[MTABuildParams]?.[MTABuildResult] ?? `resources`; // Default
            contentModule[MTABuildParams].requires = contentModule[MTABuildParams].requires ?? [];
            if (
                contentModule[MTABuildParams].requires?.findIndex(
                    (app: mta.Requires) => app.name === appModule.slice(0, 128)
                ) === -1
            ) {
                contentModule[MTABuildParams].requires.push({
                    name: appModule.slice(0, 128),
                    artifacts: [`${appModule.slice(0, 128)}.zip`],
                    'target-path': `${contentModule[MTABuildParams][MTABuildResult]}/`
                });
            }
            await this.mta.updateModule(contentModule);
        }

        // Add application module
        const html5Module = this.apps.get(appModule);
        if (!html5Module) {
            const app: HTML5App = {
                name: appModule.slice(0, 50),
                type: 'html5',
                path: appPath,
                'build-parameters': HTMLAppBuildParams as HTML5App['build-parameters']
            };
            await this.mta.addModule(app);
            this.apps.set(appModule, app);
        }
        this.dirty = true;
    }

    /**
     * Append the connectivity service to the list of resources.
     *
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    public async addConnectivityResource(): Promise<void> {
        const serviceType: ResourceType = 'connectivity';
        const resourceType = CloudFoundryServiceType.Managed;
        const resourceName = `${this.prefix.slice(0, 37)}-connectivity`;

        const router = this.modules.get('approuter.nodejs');
        if (router) {
            if (router.requires?.findIndex((resource) => resource.name === resourceName) === -1) {
                router.requires.push({ name: resourceName });
                await this.mta.updateModule(router);
            }
        }

        const connectivityResource: mta.Resource = {
            name: resourceName,
            type: resourceType,
            parameters: {
                service: serviceType,
                'service-plan': 'lite'
            }
        };

        if (!this.resources.has(serviceType)) {
            await this.mta.addResource(connectivityResource);
            this.resources.set(serviceType, connectivityResource);
        }
        this.dirty = true;
    }

    /**
     * Append and/or cleanup the destination resource if missing in mta.yaml.
     *
     * @param {boolean} isManagedApp - if true, append managed approuter configuration
     * @returns {Promise<void>} - A promise that resolves when the change request has been processed.
     */
    public async addRoutingModules(isManagedApp = false): Promise<void> {
        if (isManagedApp && !this.modules.has('com.sap.application.content:destination')) {
            await this.addManagedAppRouter();
        }

        await this.cleanupMissingResources();

        // Handle standalone | managed
        for (const module of [
            this.modules.get('com.sap.application.content:destination'),
            this.modules.get('approuter.nodejs')
        ].filter((elem) => elem !== undefined)) {
            const destinationName =
                this.resources.get('destination')?.name ?? `${this.prefix.slice(0, 30)}-destination-service`;
            if (module?.requires?.findIndex((app) => app.name === destinationName) === -1) {
                if (module.type === 'approuter.nodejs') {
                    module.requires.push({
                        name: destinationName,
                        ...UI5StandaloneModuleDestination
                    });
                }
                if (module.type === 'com.sap.application.content') {
                    module.requires.push({
                        name: destinationName,
                        parameters: {
                            'content-target': true
                        }
                    });
                }
                await this.mta.updateModule(module);
                this.dirty = true;
            }
        }
    }

    /**
     * Append ABAP service to the modules and resources.
     *
     * @param {string} serviceName The name of the service i.e. myabapservice-abap-service
     * @param {string} btpService The SAP BTP service i.e. xsuaa | html5-apps-repo | app-host | destination
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    public async addAbapService(serviceName: string, btpService: string): Promise<void> {
        const newResourceName = `${this.prefix.slice(0, 24)}-abap-${serviceName.slice(0, 20)}`;
        const router = this.modules.get('approuter.nodejs');
        if (router) {
            if (router.requires?.findIndex((resource) => resource.name === newResourceName) === -1) {
                router.requires.push({ name: newResourceName });
                await this.mta.updateModule(router);
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

        if (!this.resources.has(newResourceName)) {
            await this.mta.addResource(abapServiceResource);
            this.resources.set(newResourceName, abapServiceResource);
        }
        this.dirty = true;
    }

    /**
     * Validate if mta contains an ABAP resource.
     *
     * @returns {boolean} true | false if mta.yaml contains an abap resource
     */
    public get isABAPServiceFound(): boolean {
        let isAbapDirectServiceBinding = false;
        const resourceNames = Array.from(this.resources.keys());
        for (const resourceName of resourceNames) {
            if (resourceName.includes(`${this.prefix}-abap-`)) {
                isAbapDirectServiceBinding = true;
                break;
            }
        }
        return isAbapDirectServiceBinding;
    }

    /**
     * Append the standalone app router module.
     *
     * @param {boolean} fromServerGenerator If true, the request is from the server generator, so the path changes.
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    public async addStandaloneRouter(fromServerGenerator = false): Promise<void> {
        if (!this.resources.has('xsuaa')) {
            await this.addUaa();
        }
        if (!this.resources.has('html5-apps-repo:app-runtime')) {
            await this.addHtml5Runtime();
        }
        if (!this.resources.has('destination')) {
            await this.addDestinationResource();
        }

        const appRuntimeName = this.resources.get('html5-apps-repo:app-runtime')?.name;
        const xsuaaName = this.resources.get('xsuaa')?.name;
        const destinationName = this.resources.get('destination')?.name;
        if (destinationName && xsuaaName && appRuntimeName) {
            const router: mta.Module = {
                name: `${this.prefix.slice(0, 43)}-router`,
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
            await this.mta.addModule(router);
            this.modules.set('approuter.nodejs', router);
            this.dirty = true;
        }
    }

    /**
     * Validate if mta contains an XSUAA resource.
     *
     * @returns {boolean} true if the mta contains an XSUAA resource
     */
    public hasManagedXsuaaResource(): boolean {
        return this.resources.has(ManagedXSUAA);
    }

    /**
     * Add an mta extension config, either creating a new mtaext file or extending an existing one.
     *
     * @param {string} instanceDestName The name of the instance destination that will be created
     * @param {string} destUrl The URL of the instance destination that will be created, usually the url base, the service path is provided by the manifest.json
     * @param headerConfig The additional header config of the instance destination
     * @param {string} headerConfig.key The key of the header config
     * @param {string} headerConfig.value  The value of the header config
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     * @see https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/51ac525c78244282919029d8f5e2e35d.html?locale=en-US&version=2.0.00
     */
    public async addMtaExtensionConfig(
        instanceDestName: string | undefined,
        destUrl: string,
        headerConfig: { key: string; value: string }
    ): Promise<void> {
        /**
         * This does not use mta.lib to create the mtaext file as it does not support configurable mta config file names e.g. *.mtaext
         * And it will merge resources found in existing mtaext files rather than allow them to be written back to the existing file
         * To add additional destination instances a destination service must exist in mta.yaml resources.
         *
         * 1) Find an existing destination service
         * 2) Use the existing destination service from the mta.yaml (type dest see https://github.com/SAP-samples/fiori-tools-samples/blob/main/cap/cap-fiori-mta/mta.yaml#L87)
         * 3) Create or update the mtaext config
         */

        let destinationServiceName = this.resources.get('destination')?.name;
        if (!destinationServiceName) {
            this.log?.info(t('info.existingDestinationNotFound'));
            destinationServiceName = `${this.prefix}-destination-service`;
        }

        const appMtaId = this.mtaId;
        const mtaExtFilePath = join(this.mta.mtaDirPath, MTAFileExtension);
        let mtaExtensionYamlFile;

        try {
            const mtaExtContents = readFileSync(mtaExtFilePath, 'utf-8');
            mtaExtensionYamlFile = await YamlDocument.newInstance(mtaExtContents);
        } catch (err) {
            // File does not exist or cannot be parsed, either way we create a new one
            this.log?.info(t('info.existingMTAExtensionNotFound'));
        }

        // Create a new mta extension file
        if (!mtaExtensionYamlFile) {
            const mtaExt = {
                appMtaId,
                mtaExtensionId: `${appMtaId}-ext`,
                destinationName: instanceDestName,
                destinationUrl: destUrl,
                headerKey: headerConfig.key,
                headerValue: headerConfig.value,
                destinationServiceName: destinationServiceName,
                mtaVersion: MTAVersion
            };
            const mtaExtTemplate = readFileSync(join(__dirname, `../../templates/app/${MTAFileExtension}`), 'utf-8');
            writeFileSync(mtaExtFilePath, render(mtaExtTemplate, mtaExt));
            this.log?.info(t('info.mtaExtensionCreated', { appMtaId, mtaExtFile: MTAFileExtension }));
        } else {
            // Create an entry in an existing mta extension file
            const resources: YAMLSeq = mtaExtensionYamlFile.getSequence({ path: 'resources' });
            const resIdx = resources.items.findIndex((item) => {
                return (item as YAMLMap).get('name') === destinationServiceName;
            });
            if (resIdx > -1) {
                const nodeToInsert = {
                    Authentication: 'NoAuthentication',
                    Name: instanceDestName,
                    ProxyType: `Internet`,
                    Type: `HTTP`,
                    URL: destUrl,
                    [`URL.headers.${headerConfig.key}`]: headerConfig.value
                };
                mtaExtensionYamlFile.appendTo({
                    path: `resources.${resIdx}.parameters.config.init_data.instance.destinations`,
                    value: nodeToInsert
                });
                writeFileSync(mtaExtFilePath, mtaExtensionYamlFile.toString());
                this.log?.info(t('info.mtaExtensionUpdated', { mtaExtFile: MTAFileExtension }));
            } else {
                this.log?.error(t('error.updatingMTAExtensionFailed', { mtaExtFilePath }));
            }
        }
    }

    /**
     * Append a destination instance to the mta.yaml file, required by consumers of CAP services (e.g. approuter, destinations).
     *
     * @param {string} cfDestination The new destination instance name
     * @returns {Promise<void>} A promise that resolves when the change request has been processed
     */
    public async appendInstanceBasedDestination(cfDestination: string | undefined): Promise<void> {
        // Part 1. Update the destination service with the new instance based destination
        const destinationResource = this.resources.get('destination');
        if (destinationResource) {
            if (!destinationResource.requires?.some((ele) => ele.name === SRV_API)) {
                destinationResource.requires = [
                    ...(destinationResource.requires ?? []),
                    ...[
                        {
                            name: SRV_API
                        }
                    ]
                ];
            }
            // If the destination provided is `fiori-default-srv-api` then use the default destination name
            const capDestName =
                cfDestination === DefaultMTADestination
                    ? this.getFormattedPrefix(ResourceMTADestination)
                    : cfDestination;
            // Ensure the destination does not exist already!
            if (
                !destinationResource.parameters?.config?.init_data?.instance?.destinations?.some(
                    (destination: MTADestinationType) => destination.Name === capDestName
                )
            ) {
                destinationResource.parameters?.config?.init_data?.instance?.destinations?.push({
                    ...MTAAPIDestination,
                    Name: capDestName
                });
            }
            await this.mta.updateResource(destinationResource);
            this.resources.set('destination', destinationResource);
            // Only make additional modifications if the MTA destination is added
            await this.updateServerModule(
                this.modules.has('nodejs') ? ('nodejs' as ModuleType) : ('java' as ModuleType)
            );
            this.dirty = true;
        }
    }

    /**
     * Save changes to the mta.yaml file.
     *
     * @returns {Promise<boolean>} return current state read state.
     */
    public async save(): Promise<boolean> {
        if (this.dirty) {
            await this.mta.save();
        }
        return this.dirty;
    }

    /**
     * Add a managed app router to the MTA.
     *
     * @returns {Promise<void>} A promise that resolves when the change request has been processed.
     */
    public async addManagedAppRouter(): Promise<void> {
        if (!this.resources.has('destination')) {
            await this.addDestinationResource(true);
        }
        if (!this.resources.has(ManagedXSUAA)) {
            await this.addManagedUaa();
        }
        if (!this.resources.has('html5-apps-repo:app-host')) {
            await this.addHtml5Host();
        }

        const destinationName = this.resources.get('destination')?.name;
        const appHostName = this.resources.get('html5-apps-repo:app-host')?.name;
        const appHostServiceName = this.resources.get('html5-apps-repo:app-host')?.parameters?.['service-name'];
        const managedXSUAAName = this.resources.get(ManagedXSUAA)?.name;
        const managedXSUAAServiceName = this.resources.get(ManagedXSUAA)?.parameters?.['service-name'];
        if (destinationName && appHostName && managedXSUAAName && managedXSUAAServiceName) {
            const router: mta.Module = {
                name: `${this.prefix.slice(0, 30)}-destination-content`,
                type: 'com.sap.application.content',
                requires: [
                    {
                        name: destinationName,
                        parameters: {
                            'content-target': true
                        }
                    },
                    {
                        name: appHostName,
                        parameters: {
                            'service-key': {
                                name: `${appHostName}-key`
                            }
                        }
                    },
                    {
                        name: managedXSUAAName,
                        parameters: {
                            'service-key': {
                                name: `${managedXSUAAName}-key`
                            }
                        }
                    }
                ],
                parameters: {
                    content: {
                        instance: {
                            destinations: [
                                {
                                    Name: `${this.prefix.slice(0, 35)}_html_repo_host`,
                                    ServiceInstanceName: appHostServiceName,
                                    ServiceKeyName: `${appHostName}-key`,
                                    'sap.cloud.service': `${this.prefix}`
                                },
                                {
                                    Authentication: 'OAuth2UserTokenExchange',
                                    Name: `${this.prefix.slice(0, 46)}_uaa`,
                                    ServiceInstanceName: managedXSUAAServiceName,
                                    ServiceKeyName: `${managedXSUAAName}-key`,
                                    'sap.cloud.service': `${this.prefix}`
                                }
                            ],
                            'existing_destinations_policy': 'ignore'
                        }
                    }
                },
                'build-parameters': {
                    'no-source': true
                }
            };
            await this.mta.addModule(router);
            this.modules.set('com.sap.application.content:destination', router);
            this.dirty = true;
        }
    }

    /**
     * Get the exposed destinations, read from the mta.yaml.
     *
     * @param {boolean} checkWebIDEUsage - check if the destination contains WebIDEUsage property odata_gen or odata_abap
     * @returns {string[]} Return a list of destination names read from the mta.yaml
     */
    public getExposedDestinations(checkWebIDEUsage = false): string[] {
        const exposedDestinations: string[] = [];
        // Pull destinations from two places:
        // 1. Resources
        const destinationResources = this.resources.get('destination');
        if (destinationResources) {
            // instance
            destinationResources.parameters?.config?.init_data?.instance?.destinations?.forEach(
                (dest: Destination) =>
                    (checkWebIDEUsage ? this.isODataDestination(dest) : true) && exposedDestinations.push(dest.Name)
            );
            // subaccount
            destinationResources.parameters?.config?.init_data?.subaccount?.destinations?.forEach(
                (dest: Destination) =>
                    (checkWebIDEUsage ? this.isODataDestination(dest) : true) && exposedDestinations.push(dest.Name)
            );
        }

        // 2. Modules
        const destinationModules = this.modules.get('com.sap.application.content:destination');
        if (destinationModules) {
            destinationModules.parameters?.content?.instance?.destinations?.map(
                (dest: Destination) =>
                    (checkWebIDEUsage ? this.isODataDestination(dest) : true) && exposedDestinations.push(dest.Name)
            );
        }
        return exposedDestinations;
    }

    /**
     * Format the string with the mta prefix, read from the mta.yaml file.
     *
     * @param {string} formatString format string i.e. `%s-srv-api` becomes `mymtaid-srv-api`
     * @returns {string} return a formatted prefix value.
     */
    public getFormattedPrefix(formatString: string): string {
        return format(formatString, this.prefix).replace(/[^\w-]/g, '_');
    }
}

/**
 * Returns true if there's an MTA configuration file in the supplied directory.
 *
 * @param {string} dir directory to check for MTA configuration file
 * @returns {boolean} true | false if MTA configuration file is found
 */
export function isMTAFound(dir: string): boolean {
    return existsSync(join(dir, MTAYamlFile));
}

/**
 * Returns true if there's an MTA configuration file in the supplied directory and contains an ABAP service binding.
 *
 * @param {string} appPath UI5 Fiori project folder path
 * @param {boolean} findMtaPath If findMtaPath=true, need to validate if the Fiori app is inside MTA project.
 * @param {string} mtaPath If findMtaPath=false, the generator already knows if the Fiori app
 * @param {Logger} logger - option logger instance
 * @returns {boolean} true if mta.yaml is found and ABAP service binding is found
 */
export async function useAbapDirectServiceBinding(
    appPath: string,
    findMtaPath: boolean,
    mtaPath = '',
    logger?: Logger
): Promise<boolean> {
    try {
        let rootPath;
        if (findMtaPath) {
            const foundMtaPath = await getMtaPath(appPath);
            if (foundMtaPath) {
                rootPath = dirname(foundMtaPath.mtaPath);
            }
        } else if (mtaPath) {
            rootPath = dirname(mtaPath);
        }

        if (rootPath) {
            const mtaConfig = await MtaConfig.newInstance(rootPath, logger);
            return mtaConfig.isABAPServiceFound;
        } else {
            return false;
        }
    } catch (error) {
        logger?.debug(t('debug.logError', { error, method: 'useAbapDirectServiceBinding' }));
        return false;
    }
}
