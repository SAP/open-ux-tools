import { MiddlewareConfig } from './types';
import { YamlDocument, NodeComment } from '@sap/ux-yaml';

/**
 * Adds utility methods to deal with UI5 config (ui5(-*).yaml)
 */
export class UI5Config {
    private config: any;
    private document: YamlDocument;
    static async newInstance(serializedYaml: string) {
        const instance = new UI5Config();
        instance.document = await YamlDocument.newInstance(serializedYaml);
        return instance;
    }
    private constructor() {}

    public addLibraries(libraries: string[]): UI5Config {
        libraries.forEach((lib) => this.document.appendTo({ path: 'framework.libraries', value: { name: lib } }));
        return this;
    }

    public addCustomMiddleware(middleware: MiddlewareConfig[], comments?: NodeComment<MiddlewareConfig>[]): UI5Config {
        for (const mw of middleware) {
            this.document.appendTo({ path: 'server.customMiddleware', value: mw, comments });
        }
        return this;
    }

    public toString() {
        return this.document.toString();
    }
}
