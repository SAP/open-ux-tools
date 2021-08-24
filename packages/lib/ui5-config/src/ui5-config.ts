import { MiddlewareConfig } from './types';
import { YamlDocument, NodeComment } from '@sap/ux-yaml';

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
     * Adds a list of libraries to the config.
     *
     * @param {string[]} libraries - a list of libraries
     * @returns {UI5Config} the UI5Config instance
     * @memberof UI5Config
     */
    public addLibraries(libraries: string[]): UI5Config {
        libraries.forEach((lib) => this.document.appendTo({ path: 'framework.libraries', value: { name: lib } }));
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
    public addCustomMiddleware(middlewares: MiddlewareConfig[], comments?: NodeComment<MiddlewareConfig>[]): UI5Config {
        for (const mw of middlewares) {
            this.document.appendTo({ path: 'server.customMiddleware', value: mw, comments });
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
