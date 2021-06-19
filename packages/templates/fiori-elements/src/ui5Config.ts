import { MiddlewareConfig } from 'data/middlewareConfig';
import yaml from 'js-yaml';

class UI5Config {
    private config: any;
    constructor(serializedYaml: string) {
        this.config = yaml.load(serializedYaml);
    }

    public addLibraries(libraries: string[]): UI5Config {
        this.config.framework = this.config.framework || {};
        this.config.framework.libraries = this.config.framework.libraries || [];

        libraries.forEach((l) => this.config.framework.libraries.push(l));
        return this;
    }

    public addCustomMiddleware(middleware: MiddlewareConfig[]): UI5Config {
        this.config.customMiddleware = this.config.customMiddleware || {};
        this.config.customMiddleware.server = this.config.customMiddleware.server || [];
        this.config.customMiddleware.server.concat(middleware);
        return this;
    }
}
