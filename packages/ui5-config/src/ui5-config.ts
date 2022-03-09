import type { AbapApp, AbapTarget, CustomTask, FioriToolsProxyConfig, ProxyBackend, ProxyUIConfig } from './types';
import type { NodeComment, YAMLMap } from '@sap-ux/yaml';
import { YamlDocument } from '@sap-ux/yaml';
import {
    getAppReloadMiddlewareConfig,
    getFioriToolsProxyMiddlewareConfig,
    getMockServerMiddlewareConfig
} from './middlewares';
import type { CustomMiddleware } from 'index';

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
        libraryObjs.push({ name: `themelib_${ui5Theme.replace(/_dark$/, '')}` });

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
    public addBackendToFioriToolsProxydMiddleware(backend: ProxyBackend): UI5Config {
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
    public addUi5ToFioriToolsProxydMiddleware(ui5: ProxyUIConfig): UI5Config {
        try {
            const middlewareList = this.document.getSequence({ path: 'server.customMiddleware' });
            const proxyMiddleware = this.document.findItem(
                middlewareList,
                (item: any) => item.name === 'fiori-tools-proxy'
            );
            if (proxyMiddleware && ui5 !== undefined) {
                const configurationUi5Doc = this.document.getMap({
                    start: proxyMiddleware as YAMLMap,
                    path: 'configuration.ui5'
                });
                if (ui5.url) {
                    configurationUi5Doc.set('url', ui5.url);
                }
                if (ui5.directLoad) {
                    configurationUi5Doc.set('directLoad', ui5.directLoad);
                }
            }
        } catch (e) {
            // Ignore
        }
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
     * Returns a string representation of the config.
     *
     * @returns {string} the string representation
     * @memberof UI5Config
     */
    public toString(): string {
        return this.document.toString();
    }
}
