import type {
    AbapApp,
    AbapTarget,
    Configuration,
    CustomItem,
    CustomMiddleware,
    CustomTask,
    FioriToolsProxyConfig,
    FioriToolsProxyConfigBackend,
    FioriToolsProxyConfigUI5,
    Resources,
    Ui5Document
} from './types';
import type { NodeComment, YAMLMap, YAMLSeq } from '@sap-ux/yaml';
import { YamlDocument } from '@sap-ux/yaml';
import {
    getAppReloadMiddlewareConfig,
    getFioriToolsProxyMiddlewareConfig,
    getMockServerMiddlewareConfig
} from './middlewares';

/**
 * Represents a UI5 config file in yaml format (ui5(-*).yaml) with utility functions to manipulate the yaml document.
 *
 * @class UI5Config
 */
export class UI5Config {
    private document: YamlDocument;

    /**
     * Returns a new instance of UI5Config.
     *
     * @static
     * @param {string} serializedYaml - the serialized yaml string
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    static async newInstance(serializedYaml: string): Promise<UI5Config> {
        const instance = new UI5Config();
        instance.document = await YamlDocument.newInstance(serializedYaml);
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
     * Adds a instance of the Fiori tools app-reload middleware to the config.
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
     * Adds a instance of the Fiori tools proxy middleware to the config.
     *
     * @param proxyConfig proxy configuration containing an optional array of backend and an option UI5 host configuration
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addFioriToolsProxydMiddleware(proxyConfig: FioriToolsProxyConfig): UI5Config {
        const { config, comments } = getFioriToolsProxyMiddlewareConfig(proxyConfig.backend, proxyConfig.ui5);
        this.document.appendTo({
            path: 'server.customMiddleware',
            value: config,
            comments: comments as any
        });
        return this;
    }

    /**
     * Adds a backend configuration to an existing fiori-tools-proxy middleware. If the config does not contain a fiori-tools-proxy middleware, an error is thrown.
     *
     * @param backend config of backend that is to be proxied
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addBackendToFioriToolsProxydMiddleware(backend: FioriToolsProxyConfigBackend): UI5Config {
        const middlewareList = this.document.getSequence({ path: 'server.customMiddleware' });
        const proxyMiddleware = this.document.findItem(
            middlewareList,
            (item: any) => item.name === 'fiori-tools-proxy'
        );
        if (!proxyMiddleware) {
            throw new Error('Could not find fiori-tools-proxy');
        }
        this.document.getMap({ start: proxyMiddleware as YAMLMap, path: 'configuration' }).set('backend', [backend]);
        return this;
    }

    /**
     * Adds a ui configuration to an existing fiori-tools-proxy middleware. If the config does not contain a fiori-tools-proxy middleware, an error is thrown.
     *
     * @param ui5 config of backend that is to be proxied
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addUi5ToFioriToolsProxydMiddleware(ui5: FioriToolsProxyConfigUI5): UI5Config {
        const middlewareList = this.document.getSequence({ path: 'server.customMiddleware' });
        const proxyMiddleware = this.document.findItem(
            middlewareList,
            (item: any) => item.name === 'fiori-tools-proxy'
        );
        if (!proxyMiddleware) {
            throw new Error('Could not find fiori-tools-proxy');
        }

        this.document.getMap({ start: proxyMiddleware as YAMLMap, path: 'configuration' }).set('ui5', [ui5]);
        return this;
    }

    /**
     * Adds a instance of the mockserver middleware to the config.
     *
     * @param path option path that is to be mocked
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addMockServerMiddleware(path?: string): UI5Config {
        this.document.appendTo({
            path: 'server.customMiddleware',
            value: getMockServerMiddlewareConfig(path)
        });
        return this;
    }

    /**
     * Adds the ABAP deployment task to the config.
     *
     * @param target system that this app is to be deployed to
     * @param app application configuration for the deployment to ABAP
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addAbapDeployTask(target: AbapTarget, app: AbapApp): UI5Config {
        this.document.appendTo({
            path: 'builder.resources',
            value: {
                excludes: ['/test/**', '/localService/**']
            }
        });
        this.document.appendTo({
            path: 'builder.customTasks',
            value: {
                name: 'deploy-to-abap',
                afterTask: 'generateCachebusterInfo',
                configuration: { target, app }
            }
        });
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
     * Returns a string representation of the config.
     *
     * @returns {string} the string representation
     * @memberof UI5Config
     */
    public toString(): string {
        return this.document.toString();
    }
}
