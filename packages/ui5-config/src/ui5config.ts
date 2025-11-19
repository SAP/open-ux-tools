import type {
    BspApp,
    AbapTarget,
    Configuration,
    CustomItem,
    CustomMiddleware,
    CustomTask,
    FioriToolsProxyConfig,
    FioriToolsProxyConfigBackend,
    FioriToolsProxyConfigUI5,
    Resources,
    Ui5Document,
    Adp,
    MockserverConfig,
    ServeStaticPath,
    DataSourceConfig,
    AbapDeployConfig,
    MockserverService
} from './types';
import type { NodeComment, YAMLMap, YAMLSeq } from '@sap-ux/yaml';
import { YamlDocument } from '@sap-ux/yaml';
import {
    getAppReloadMiddlewareConfig,
    getBackendComments,
    getFioriToolsProxyMiddlewareConfig,
    getMockServerMiddlewareConfig
} from './middlewares';
import { fioriToolsProxy, serveStatic } from './constants';
import Ajv, { type ValidateFunction } from 'ajv';
import type { SomeJSONSchema } from 'ajv/dist/types/json-schema';
import { join, posix, relative, sep } from 'node:path';
import { readFile } from 'fs/promises';
import yaml from 'js-yaml';

/**
 * Represents a UI5 config file in yaml format (ui5(-*).yaml) with utility functions to manipulate the yaml document.
 *
 * @class UI5Config
 */
export class UI5Config {
    private document: YamlDocument;
    private static validate: ValidateFunction<SomeJSONSchema>;

    /**
     * Validates the schema of the given yaml document.
     *
     * @returns true if the document is valid, false otherwise
     */
    async validateSchema(): Promise<boolean> {
        if (!UI5Config.validate) {
            const path = join(__dirname, '..', 'dist', 'schema', 'ui5.yaml.json');
            const schema = JSON.parse(await readFile(path, 'utf8')) as SomeJSONSchema | null;
            if (!schema) {
                throw Error('The schema file was not found. Validation is not possible.');
            }
            UI5Config.validate = new Ajv({ strict: false }).compile<SomeJSONSchema>(schema);
        }

        let isValid = false;
        try {
            isValid = yaml.loadAll(this.document.toString()).every((document) => UI5Config.validate(document));
        } catch (error) {
            throw Error(`No validation possible. Error: ${error}`);
        }
        return isValid;
    }

    /**
     * Returns a new instance of UI5Config.
     *
     * @static
     * @param {string} serializedYaml - the serialized yaml string
     * @param options - options
     * @param [options.validateSchema] - whether to validate the schema of the yaml file
     * @returns {UI5Config} the UI5Config instance
     * @throws {Error} if the schema validation fails
     * @memberof UI5Config
     */
    static async newInstance(
        serializedYaml: string,
        options?: {
            validateSchema?: boolean;
        }
    ): Promise<UI5Config> {
        const instance = new UI5Config();
        instance.document = await YamlDocument.newInstance(serializedYaml);
        const validateSchema = options?.validateSchema ?? false;
        if (validateSchema) {
            const isValid = await instance.validateSchema();
            if (!isValid) {
                throw new Error('This file does not comply with the schema.');
            }
        }
        return instance;
    }

    /**
     * Tries reading the resources/configuration object from the config.
     *
     * @returns resources/configuration object from config or an empty object
     * @memberof UI5Config
     */
    public getConfiguration(): Configuration {
        let resources: Resources;
        try {
            resources = this.document.getMap({ path: 'resources' }).toJSON();
        } catch (error) {
            resources = {};
        }
        return resources.configuration ?? {};
    }

    /**
     * Adds or replaces the resources/configuration object in the config.
     *
     * @param config configuration object that is to be written to the config
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public setConfiguration(config: Configuration): UI5Config {
        this.document.setIn({
            path: 'resources',
            value: { configuration: config }
        });
        return this;
    }

    /**
     * Set the metadata object in the yaml file.
     * See also https://sap.github.io/ui5-tooling/pages/Configuration/#metadata for reference.
     *
     * @param {Ui5Document['metadata']} value metadata of the project or application
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public setMetadata(value: Ui5Document['metadata']): UI5Config {
        this.document.setIn({ path: 'metadata', value });
        return this;
    }

    /**
     * Get the type in the yaml file.
     *
     * @returns {Ui5Document['type']} the type
     * @memberof Ui5Document['type']
     */
    public getType(): Ui5Document['type'] {
        const type = this.document.getNode({ path: 'type' });
        return type as Ui5Document['type'];
    }

    /**
     * Set the type in the yaml file.
     * See also https://sap.github.io/ui5-tooling/pages/Configuration/#general-configuration for reference.
     *
     * @param {Ui5Document['type']} value - type of the application
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public setType(value: Ui5Document['type']): UI5Config {
        this.document.setIn({ path: 'type', value });
        return this;
    }

    /**
     * Add a custom configuration to the yaml.
     *
     * @param key key/name of the custom property
     * @param value the properties value
     */
    public addCustomConfiguration(key: string, value: object | string) {
        try {
            const configNode = this.document.getMap({ path: 'customConfiguration' });
            configNode.setIn([key], value);
        } catch (_error) {
            this.document.setIn({
                path: 'customConfiguration',
                value: {
                    [key]: value
                }
            });
        }
    }

    /**
     * Get a custom configuration from the yaml.
     *
     * @param key key/name of the custom property
     * @returns the value of the property or undefined
     */
    public getCustomConfiguration(key: string): object | string | undefined {
        try {
            const node = this.document.getMap({ path: 'customConfiguration' }).get(key) as YAMLMap | undefined;
            return node?.toJSON?.() ?? node?.toString();
        } catch (_error) {
            return undefined;
        }
    }

    /**
     * Get the UI5 framework from the yaml.
     *
     * @returns the ui5 framework.
     */
    public getUi5Framework(): Ui5Document['framework'] | undefined {
        return this.document.getMap({ path: 'framework' }).toJSON();
    }

    /**
     * Adds a UI5 Framework entry to the yaml file.
     *
     * @param {string} ui5Framework - whether to user SAPUI5 or OpenUI5
     * @param {string} ui5Version - ui5 version
     * @param {string[]} ui5Libraries - a list of libraries
     * @param {string} ui5Theme - optional ui5 theme
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addUI5Framework(
        ui5Framework: string,
        ui5Version: string,
        ui5Libraries: string[],
        ui5Theme = 'sap_fiori_3'
    ): UI5Config {
        const libraryObjs = [];
        for (const library of ui5Libraries) {
            libraryObjs.push({ name: library });
        }
        // Add theme lib (dark theme versions are provided by base theme lib)
        libraryObjs.push({ name: `themelib_${ui5Theme.replace(/_dark$|_hcw$|_hcb$/, '')}` });

        this.document.setIn({
            path: 'framework',
            value: { name: ui5Framework, version: ui5Version, libraries: libraryObjs }
        });
        return this;
    }

    /**
     * Adds a list of custom tasks to the config.
     *
     * @param {CustomTask<any>[]} tasks - the list of custom tasks
     * @param {NodeComment<CustomMiddleware<any>>[]} comments - a list of comments
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addCustomTasks(tasks: CustomTask<any>[], comments?: NodeComment<CustomMiddleware<any>>[]): UI5Config {
        for (const task of tasks) {
            this.document.appendTo({ path: 'builder.customTasks', value: task, comments });
        }
        return this;
    }

    /**
     * Adds a list of custom middlewares to the config.
     *
     * @param {CustomMiddleware<any>[]} middlewares - the list of custom middlewares
     * @param {NodeComment<CustomMiddleware<any>>[]} comments - a list of comments
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addCustomMiddleware(
        middlewares: CustomMiddleware<unknown>[],
        comments?: NodeComment<CustomMiddleware<unknown>>[]
    ): UI5Config {
        for (const mw of middlewares) {
            this.document.appendTo({ path: 'server.customMiddleware', value: mw, comments });
        }
        return this;
    }

    /**
     * Adds an instance of the Fiori tools app-reload middleware to the config.
     *
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addFioriToolsAppReloadMiddleware(): UI5Config {
        this.document.appendTo({
            path: 'server.customMiddleware',
            value: getAppReloadMiddlewareConfig()
        });
        return this;
    }

    /**
     * Adds an instance of the Fiori tools proxy middleware to the config.
     *
     * @param proxyConfig proxy configuration containing an optional array of backend and an option UI5 host configuration
     * @param afterMiddleware middleware after which fiori-tools-proxy middleware will be started
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addFioriToolsProxyMiddleware(proxyConfig: FioriToolsProxyConfig, afterMiddleware?: string): UI5Config {
        // Support both old and new property names for backward compatibility
        const resolvedIgnoreCertErrors = proxyConfig?.ignoreCertErrors ?? proxyConfig?.ignoreCertError ?? false; // NOSONAR

        const { config, comments } = getFioriToolsProxyMiddlewareConfig(
            proxyConfig.backend,
            proxyConfig.ui5,
            afterMiddleware,
            resolvedIgnoreCertErrors
        );
        this.document.appendTo({
            path: 'server.customMiddleware',
            value: config,
            comments: comments as any
        });
        return this;
    }

    /**
     * Returns a fiori-tools-proxy middleware YAML configuration.
     *
     * @returns {unknown} The fiori-tools-proxy middleware configuration
     * @memberof UI5Config
     */
    private getFioriToolsProxyMiddlewareConfiguration(): YAMLMap<unknown, unknown> {
        const middlewareList = this.document.getSequence({ path: 'server.customMiddleware' });
        const proxyMiddleware = this.document.findItem(middlewareList, (item: any) => item.name === fioriToolsProxy);
        if (!proxyMiddleware) {
            throw new Error('Could not find fiori-tools-proxy');
        }
        return this.document.getMap({
            start: proxyMiddleware as YAMLMap,
            path: 'configuration'
        });
    }

    /**
     * Adds a backend configuration to an existing fiori-tools-proxy middleware keeping any existing 'fiori-tools-proxy' backend configurations. If the config does not contain a fiori-tools-proxy middleware, an error is thrown.
     *
     * @param backend config of backend that is to be proxied
     * @param ignoreCertErrors if true some certificate errors are ignored
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addBackendToFioriToolsProxyMiddleware(
        backend: FioriToolsProxyConfigBackend,
        ignoreCertErrors: boolean = false
    ): this {
        const configuration = this.getFioriToolsProxyMiddlewareConfiguration();
        const proxyMiddlewareConfig = configuration.toJSON() as FioriToolsProxyConfig;
        const comments = getBackendComments(backend);
        const backendNode = this.document.createNode({
            value: backend,
            comments
        });

        // Support both old and new property names for backward compatibility
        const currentIgnoreCertErrors =
            proxyMiddlewareConfig?.ignoreCertErrors ?? proxyMiddlewareConfig?.ignoreCertError ?? false; // NOSONAR

        if (currentIgnoreCertErrors !== ignoreCertErrors) {
            configuration.set('ignoreCertErrors', ignoreCertErrors);
            // Remove the deprecated property if it exists
            //prettier-ignore
            if (proxyMiddlewareConfig?.ignoreCertError !== undefined) { // NOSONAR
                configuration.delete('ignoreCertError');
            }
        }

        // Add new entry to existing backend configurations in yaml, avoid duplicates
        if (proxyMiddlewareConfig?.backend) {
            if (!proxyMiddlewareConfig?.backend.find((existingBackend) => existingBackend.path === backend.path)) {
                const backendConfigs = this.document.getSequence({ start: configuration, path: 'backend' });
                if (backendConfigs.items.length === 0) {
                    configuration.set('backend', [backendNode]);
                } else {
                    backendConfigs.add(backendNode);
                }
            }
        } else {
            // Create a new 'backend' node in yaml for middleware config
            configuration.set('backend', [backendNode]);
        }
        return this;
    }

    /**
     * Updates backend configuration to an existing fiori-tools-proxy middleware that matches path. If the config does not contain a fiori-tools-proxy middleware, an error is thrown.
     *
     * @param backend config of backend that is to be proxied
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public updateBackendToFioriToolsProxyMiddleware(backend: FioriToolsProxyConfigBackend): this {
        const configuration = this.getFioriToolsProxyMiddlewareConfiguration();
        const proxyMiddlewareConfig = configuration.toJSON() as FioriToolsProxyConfig;
        const comments = getBackendComments(backend);
        const backendNode = this.document.createNode({
            value: backend,
            comments
        });
        // Update existing backend entry with matching path
        if (proxyMiddlewareConfig?.backend) {
            const matchingBackendIndex = proxyMiddlewareConfig?.backend.findIndex(
                (existingBackend) => existingBackend.path && existingBackend.path === backend.path
            );
            if (matchingBackendIndex !== -1) {
                const backendConfigs = this.document.getSequence({ start: configuration, path: 'backend' });
                backendConfigs.set(matchingBackendIndex, backendNode);
            }
        }
        return this;
    }

    /**
     * Removes a backend configuration from an existing fiori-tools-proxy middleware backend configurations. If the config does not contain a fiori-tools-proxy middleware, an error is thrown.
     *
     * @param path Path of the backend to delete.
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public removeBackendFromFioriToolsProxyMiddleware(path: string): this {
        const fioriToolsProxyMiddleware = this.findCustomMiddleware<FioriToolsProxyConfig>(fioriToolsProxy);
        if (!fioriToolsProxyMiddleware) {
            throw new Error('Could not find fiori-tools-proxy');
        } else {
            const proxyMiddlewareConfig = fioriToolsProxyMiddleware?.configuration;
            // Remove backend from middleware configurations in yaml
            if (proxyMiddlewareConfig?.backend) {
                const reservedBackendPath = '/sap';
                // Make sure entry with "/sap" path is not getting deleted
                const backendIndexToKeep = proxyMiddlewareConfig.backend.findIndex(
                    (existingBackend) => existingBackend.path === reservedBackendPath
                );
                proxyMiddlewareConfig.backend = proxyMiddlewareConfig.backend.filter((existingBackend, index) => {
                    if (index === backendIndexToKeep) {
                        return true;
                    }
                    return existingBackend.path !== path;
                });
                this.updateCustomMiddleware(fioriToolsProxyMiddleware);
            }
        }
        return this;
    }

    /**
     * Returns the backend configuration from the fiori-tools-proxy middleware.
     *
     * @param path Path of the backend.
     * @returns {FioriToolsProxyConfigBackend} the backend configuration
     */
    public getBackendConfigFromFioriToolsProxyMiddleware(path: string): FioriToolsProxyConfigBackend | undefined {
        const backendConfigs: FioriToolsProxyConfigBackend[] = this.getBackendConfigsFromFioriToolsProxyMiddleware();
        return backendConfigs.find((backendConfig) => backendConfig.path === path);
    }

    /**
     * Returns the backend configurations from the fiori-tools-proxy middleware.
     *
     * @returns {FioriToolsProxyConfigBackend[]} the backend configurations
     */
    public getBackendConfigsFromFioriToolsProxyMiddleware(): FioriToolsProxyConfigBackend[] {
        let backendConfigs: FioriToolsProxyConfigBackend[];
        try {
            const middlewareList = this.document.getSequence({ path: 'server.customMiddleware' });
            const proxyMiddleware = this.document.findItem(
                middlewareList,
                (item: any) => item.name === fioriToolsProxy
            );

            const configuration = this.document.getMap({ start: proxyMiddleware as YAMLMap, path: 'configuration' });
            backendConfigs = this.document
                .getSequence({ start: configuration, path: 'backend' })
                .toJSON() as FioriToolsProxyConfigBackend[];
        } catch (e) {
            return [];
        }
        return backendConfigs;
    }

    /**
     * Adds a ui configuration to an existing fiori-tools-proxy middleware. If the config does not contain a fiori-tools-proxy middleware, an error is thrown.
     *
     * @param ui5 config of backend that is to be proxied
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addUi5ToFioriToolsProxyMiddleware(ui5: FioriToolsProxyConfigUI5): this {
        const middlewareList = this.document.getSequence({ path: 'server.customMiddleware' });
        const proxyMiddleware = this.document.findItem(middlewareList, (item: any) => item.name === fioriToolsProxy);
        if (!proxyMiddleware) {
            throw new Error('Could not find fiori-tools-proxy');
        }

        this.document.getMap({ start: proxyMiddleware as YAMLMap, path: 'configuration' }).set('ui5', [ui5]);
        return this;
    }

    /**
     * Adds an instance of the mockserver middleware to the config.
     *
     * @param basePath - path to project root, where package.json and ui5.yaml is
     * @param webappPath - path to webapp folder, where manifest.json is
     * @param dataSourcesConfig - annotations config that is to be mocked
     * @param annotationsConfig - annotations config that is to be mocked
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addMockServerMiddleware(
        basePath: string,
        webappPath: string,
        dataSourcesConfig: DataSourceConfig[],
        annotationsConfig: MockserverConfig['annotations']
    ): this {
        this.document.appendTo({
            path: 'server.customMiddleware',
            value: getMockServerMiddlewareConfig(basePath, webappPath, dataSourcesConfig, annotationsConfig)
        });
        return this;
    }

    /**
     * Adds a service configuration to an existing sap-fe-mockserver middleware keeping any existing service configurations. If the config does not contain a sap-fe-mockserver middleware, an error is thrown.
     *
     * @param basePath - path to project root, where package.json and ui5.yaml is
     * @param webappPath - path to webapp folder, where manifest.json is
     * @param dataSourceConfig - dataSource config from manifest to add to mockserver middleware services list
     * @param annotationsConfig - optional, annotations config that is to be mocked
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addServiceToMockserverMiddleware(
        basePath: string,
        webappPath: string,
        dataSourceConfig: DataSourceConfig,
        annotationsConfig: MockserverConfig['annotations'] = []
    ): this {
        const mockserverMiddleware = this.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver');
        if (!mockserverMiddleware) {
            throw new Error('Could not find sap-fe-mockserver');
        } else {
            // Else append new data to current middleware config and then run middleware update
            const serviceRoot = `.${posix.sep}${relative(
                basePath,
                join(webappPath, 'localService', dataSourceConfig.serviceName)
            ).replaceAll(sep, posix.sep)}`;

            const mockserverMiddlewareConfig = mockserverMiddleware?.configuration;
            if (mockserverMiddlewareConfig?.services) {
                const urlPath = dataSourceConfig.servicePath.replace(/\/$/, ''); // Mockserver is sensitive to trailing '/'
                const newServiceData: MockserverService = {
                    urlPath,
                    metadataPath: dataSourceConfig.metadataPath ?? `${serviceRoot}/metadata.xml`,
                    mockdataPath: `${serviceRoot}/data`,
                    generateMockData: true
                };
                if (dataSourceConfig.resolveExternalServiceReferences === true) {
                    newServiceData.resolveExternalServiceReferences = true;
                }
                const serviceIndex = mockserverMiddlewareConfig.services.findIndex(
                    (existingService) => existingService.urlPath === urlPath
                );
                if (serviceIndex === -1) {
                    mockserverMiddlewareConfig.services = [...mockserverMiddlewareConfig.services, newServiceData];
                }
            }
            if (mockserverMiddlewareConfig?.annotations) {
                const existingAnnotations = mockserverMiddlewareConfig.annotations;
                annotationsConfig.forEach((annotationConfig) => {
                    if (
                        !existingAnnotations.find(
                            (existingAnnotation) => existingAnnotation.urlPath === annotationConfig.urlPath
                        )
                    ) {
                        existingAnnotations.push(annotationConfig);
                    }
                });
            }
            this.updateCustomMiddleware(mockserverMiddleware);
        }
        return this;
    }

    /**
     * Removes a service from the mockserver middleware.
     *
     * @param servicePath - path of the service that is to be deleted
     * @param annotationPaths - paths of the service related annotations
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public removeServiceFromMockServerMiddleware(servicePath: string, annotationPaths: string[]): this {
        const mockserverMiddleware = this.findCustomMiddleware<MockserverConfig>('sap-fe-mockserver');
        if (!mockserverMiddleware) {
            throw new Error('Could not find sap-fe-mockserver');
        } else {
            const mockserverMiddlewareConfig = mockserverMiddleware?.configuration;
            // Remove service from middleware configurations in yaml
            if (mockserverMiddlewareConfig?.services) {
                mockserverMiddlewareConfig.services = mockserverMiddlewareConfig?.services.filter(
                    (existingService) => existingService.urlPath !== servicePath.replace(/\/$/, '')
                );
            }
            // Remove service related annotations
            if (mockserverMiddlewareConfig?.annotations) {
                const mockserverMiddlewareConfigAnnotations = mockserverMiddlewareConfig.annotations;
                annotationPaths.forEach((annotationPath: string) => {
                    // Search for annotations that needs to be deleted
                    mockserverMiddlewareConfig.annotations = mockserverMiddlewareConfigAnnotations.filter(
                        (existingAnnotation) => existingAnnotation.urlPath !== annotationPath
                    );
                });
            }
            this.updateCustomMiddleware(mockserverMiddleware);
        }
        return this;
    }

    /**
     * Adds the ABAP deployment task to the config.
     *
     * @param target system that this app is to be deployed to
     * @param app application configuration for the deployment to ABAP
     * @param fioriTools if true use the middleware included in the @sap/ux-ui5-tooling module
     * @param exclude optional list of files that are to be excluded from the deployment configuration
     * @param index if true a standalone index.html is generated during deployment
     * @param lrep optional lrep namespace to be used for the deployment configuration
     * @param comments optional comments that are added to the task
     * @returns this UI5Config instance
     * @memberof UI5Config
     */
    public addAbapDeployTask(
        target: AbapTarget,
        app: BspApp | Adp,
        fioriTools = true,
        exclude?: string[],
        index = false,
        lrep?: string,
        comments: NodeComment<CustomTask<AbapDeployConfig>>[] = []
    ): this {
        this.document.appendTo({
            path: 'builder.resources.excludes',
            value: '/test/**'
        });
        this.document.appendTo({
            path: 'builder.resources.excludes',
            value: '/localService/**'
        });

        const configuration: {
            target: AbapTarget;
            app: BspApp | Adp;
            exclude: string[] | undefined;
            index?: boolean;
            lrep?: string;
        } = { target, app, exclude, lrep };

        if (index) {
            configuration['index'] = true;
        }

        this.document.appendTo({
            path: 'builder.customTasks',
            value: {
                name: fioriTools ? 'deploy-to-abap' : 'abap-deploy-task',
                afterTask: 'generateCachebusterInfo',
                configuration
            },
            comments
        });
        return this;
    }

    /**
     * Adds the Cloud Foundry deployment task to the config.
     *
     * @param archiveName the name of the archive that is to be generated as part of the CF bundling
     * @param addModulesTask if true the modules task is added to the deployment configuration
     * @param addTranspileTask if true the transpile task is added to the deployment configuration
     * @returns this UI5Config instance
     * @memberof UI5Config
     */
    public addCloudFoundryDeployTask(archiveName: string, addModulesTask = false, addTranspileTask = false): this {
        this.document.appendTo({
            path: 'builder.resources.excludes',
            value: '/test/**'
        });
        this.document.appendTo({
            path: 'builder.resources.excludes',
            value: '/localService/**'
        });

        this.document.appendTo({
            path: 'builder.customTasks',
            value: {
                name: 'ui5-task-zipper',
                afterTask: 'generateCachebusterInfo',
                configuration: {
                    archiveName,
                    relativePaths: true,
                    additionalFiles: ['xs-app.json']
                }
            }
        });

        if (addModulesTask) {
            this.document.appendTo({
                path: 'builder.customTasks',
                value: {
                    name: 'ui5-tooling-modules-task',
                    afterTask: 'replaceVersion',
                    configuration: {}
                }
            });
        }

        if (addTranspileTask) {
            this.document.appendTo({
                path: 'builder.customTasks',
                value: {
                    name: 'ui5-tooling-transpile-task',
                    afterTask: 'replaceVersion',
                    configuration: {
                        debug: true,
                        removeConsoleStatements: true,
                        transpileAsync: true,
                        transpileTypeScript: true
                    }
                }
            });
        }
        return this;
    }

    /**
     * Remove a middleware form the UI5 config.
     *
     * @param name name of the middleware that is to be removed
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public removeCustomMiddleware(name: string): UI5Config {
        this.document.deleteAt({
            path: 'server.customMiddleware',
            matcher: { key: 'name', value: name }
        });
        return this;
    }

    /**
     * Remove a task form the UI5 config.
     *
     * @param name name of the task that is to be removed
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public removeCustomTask(name: string): UI5Config {
        this.document.deleteAt({
            path: 'builder.customTasks',
            matcher: { key: 'name', value: name }
        });
        return this;
    }

    /**
     * Removes the entire config for the given key.
     *
     * @param key key of the config that is to be removed
     * @returns {UI5Config} the UI5Config instance
     */
    public removeConfig(key: string): this {
        this.document.delete(key);
        return this;
    }

    /**
     * Adds a comment to the ui5 config.
     *
     * @param root0 - the comment object
     * @param root0.comment - the comment object's comment
     * @param root0.location - the comment object's location
     * @returns {UI5Config} the UI5Config instance
     */
    public addComment({ comment, location = 'beginning' }: { comment: string; location?: 'beginning' | 'end' }): this {
        this.document.addDocumentComment({ comment, location });
        return this;
    }

    /**
     * Find a custom item in the UI5 config.
     *
     * @param name name of the item (task or middlewre) that is to be looked for
     * @param path path to the root of the sequence that is to be searched
     * @returns the configuration as object or undefined if not found
     * @memberof UI5Config
     */
    private findCustomActivity<C extends object = object>(name: string, path: string): CustomItem<C> | undefined {
        let list: YAMLSeq<unknown> | undefined;
        try {
            list = this.document.getSequence({ path });
        } catch (error) {
            // if the document does not contain the builder > customTasks section and error is thrown
        }
        let item: YAMLMap | undefined;
        if (list) {
            item = this.document.findItem(list, (item: CustomItem<object>) => item.name === name) as YAMLMap;
        }

        return item ? item.toJSON() : undefined;
    }

    /**
     * Find a middleware in the UI5 config.
     *
     * @param name name of the middleware that is to be looked for
     * @returns the middleware configuration as object or undefined if not found
     * @memberof UI5Config
     */
    public findCustomMiddleware<T extends object = object>(name: string): CustomMiddleware<T> | undefined {
        return this.findCustomActivity<T>(name, 'server.customMiddleware');
    }

    /**
     * Find a task in the UI5 config.
     *
     * @param name name of the task that is to be looked for
     * @returns the middleware configuration as object or undefined if not found
     * @memberof UI5Config
     */
    public findCustomTask<T extends object = object>(name: string): CustomTask<T> | undefined {
        return this.findCustomActivity<T>(name, 'builder.customTasks');
    }

    /**
     * Update an existing custom middleware or create it. Existing custom middleware be overwritten, not merged.
     * If the custom middleware doesn't exist, it will be added.
     *
     * @param middleware - middleware config
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public updateCustomMiddleware(middleware: CustomMiddleware<unknown>): UI5Config {
        const name = middleware.name;
        if (this.findCustomMiddleware(name)) {
            this.document.updateAt({
                path: 'server.customMiddleware',
                matcher: { key: 'name', value: name },
                value: middleware,
                mode: 'overwrite'
            });
        } else {
            this.addCustomMiddleware([middleware]);
        }
        return this;
    }

    /**
     * Merges existing custom middleware with the passed config.
     *
     * @param middleware - middleware config
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    private mergeCustomMiddleware(middleware: CustomMiddleware<unknown>): this {
        const name = middleware.name;
        if (this.findCustomMiddleware(name)) {
            this.document.updateAt({
                path: 'server.customMiddleware',
                matcher: { key: 'name', value: name },
                value: middleware,
                mode: 'merge'
            });
        }
        return this;
    }

    /**
     * Returns the serve static config.
     *
     * @param addFioriToolProxy - if true, `fiori-tools-proxy` config is added, otherwise a `compression` config will be added
     * @param paths - serve static paths for the reuse libraries
     * @returns the serve static middleware config
     */
    private getServeStaticConfig(
        addFioriToolProxy: boolean,
        paths: ServeStaticPath[]
    ): CustomMiddleware<{ paths: ServeStaticPath[] }> {
        return addFioriToolProxy
            ? {
                  name: serveStatic,
                  beforeMiddleware: fioriToolsProxy,
                  configuration: {
                      paths: paths
                  }
              }
            : {
                  name: serveStatic,
                  afterMiddleware: 'compression',
                  configuration: {
                      paths: paths
                  }
              };
    }

    /**
     * Adds or updates the serve static middleware in the config.
     *
     * @param serveStaticPaths serve static paths for the reuse libraries
     * @returns {UI5Config} the UI5Config instance
     */
    public addServeStaticConfig(serveStaticPaths: ServeStaticPath[]): this {
        const serveStaticConfig = this.findCustomMiddleware<{ paths: ServeStaticPath[] }>(serveStatic);
        const fioriToolsProxyConfig = this.findCustomMiddleware(fioriToolsProxy);

        if (serveStaticConfig) {
            if (serveStaticConfig.afterMiddleware === 'compression' && fioriToolsProxyConfig) {
                this.updateCustomMiddleware({
                    name: serveStatic,
                    beforeMiddleware: fioriToolsProxy,
                    configuration: {
                        paths: [...serveStaticConfig.configuration.paths, ...serveStaticPaths]
                    }
                });
            } else {
                this.mergeCustomMiddleware({
                    name: serveStatic,
                    configuration: {
                        paths: [...serveStaticConfig.configuration.paths, ...serveStaticPaths]
                    }
                });
            }
        } else {
            const serveStaticConfig = this.getServeStaticConfig(!!fioriToolsProxyConfig, serveStaticPaths);
            this.addCustomMiddleware([serveStaticConfig]);
        }

        return this;
    }

    /**
     * Returns a string representation of the config.
     *
     * @returns {string} the string representation
     * @memberof UI5Config
     */
    public toString(): string {
        return this.document.toString();
    }
}
