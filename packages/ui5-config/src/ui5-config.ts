import { FioriToolsProxyConfig, ProxyBackend } from './types';
import { YamlDocument, NodeComment, YAMLMap } from '@sap-ux/yaml';
import {
    getAppReloadMiddlewareConfig,
    getFioriToolsProxyMiddlewareConfig,
    getMockServerMiddlewareConfig
} from './middlewares';
import { CustomMiddleware } from 'index';

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
     * @param {string} framework - whether to user SAPUI5 or OpenUI5
     * @param {string} version - ui5 version
     * @param {string[]} libraries - a list of libraries
     * @param theme - optional ui5 theme
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addUI5Framework(framework: string, version: string, libraries: string[], theme = 'sap_fiori_3'): UI5Config {
        const libraryObjs = [];
        for (const library of libraries) {
            libraryObjs.push({ name: library });
        }
        // Add theme lib (dark theme versions are provided by base theme lib)
        libraryObjs.push({ name: `themelib_${theme.replace(/_dark$/, '')}` });

        this.document.setIn({
            path: 'framework',
            value: { name: framework, version, libraries: libraryObjs }
        });
        return this;
    }

    /**
     * Adds a list of custom middlewares to the config.
     *
     * @param {MiddlewareConfig[]} middlewares - the list of custom middlewares
     * @param {NodeComment<MiddlewareConfig>[]} [comments] - a list of comments
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addCustomMiddleware(
        middlewares: CustomMiddleware<any>[],
        comments?: NodeComment<CustomMiddleware<any>>[]
    ): UI5Config {
        for (const mw of middlewares) {
            this.document.appendTo({ path: 'server.customMiddleware', value: mw, comments });
        }
        return this;
    }

    /**
     * Adds a instance of the Fiori tools app-reload middleware to the config.
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
     * Adds a instance of the mockserver middleware to the config.
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
     * Returns a string representation of the config.
     *
     * @returns {string} the string representation
     * @memberof UI5Config
     */
    public toString(): string {
        return this.document.toString();
    }
}
