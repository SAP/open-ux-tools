import { join } from 'path';
import * as fs from 'fs';
import yaml, { dump } from 'js-yaml';
import type { Mta, mta } from '@sap/mta-lib';

// Cannot directly use the `Mta` class as interface
// We'll need to "implement" private properties and methods as well
// Which means that we'll effectively need to extend the class
// Extending means having to call the super constructor and we
// don't want that, extract the interface instead.
type MtaInterface = Pick<Mta, keyof Mta>;

/**
 * Mocks Mta for testing.
 *
 * @class MockMta
 * @implements {Mta}
 */
export class MockMta implements Partial<MtaInterface> {
    private readonly contents: mta.MtaDescriptor;
    public readonly mtaDirPath: string;
    private readonly mtaPath: string;

    constructor(mtaDirPath: string) {
        this.mtaDirPath = mtaDirPath;
        this.mtaPath = join(mtaDirPath, 'mta.yaml');
        this.contents = yaml.load(fs.readFileSync(this.mtaPath).toString()) as mta.MtaDescriptor;
    }
    create(_descriptor: mta.MtaDescriptor): Promise<void> {
        throw new Error('Method not implemented.');
    }
    getMtaFilePath(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    getMtaID(): Promise<string> {
        return Promise.resolve(this.contents.ID);
    }
    addModule(module: mta.Module): Promise<void> {
        if (!this.contents.modules) {
            this.contents.modules = [];
        }
        this.contents.modules.push(module);
        return Promise.resolve();
    }
    addResource(resource: mta.Resource): Promise<void> {
        if (!this.contents.modules) {
            this.contents.modules = [];
        }
        this.contents?.resources?.push(resource);
        return Promise.resolve();
    }
    getModules(): Promise<mta.Module[]> {
        return Promise.resolve(this.contents?.modules ?? []);
    }
    getResources(): Promise<mta.Resource[]> {
        return Promise.resolve(this.contents.resources ?? []);
    }
    updateModule(module: mta.Module): Promise<void> {
        if (!this.contents.modules) {
            throw new Error('No modules');
        }
        const moduleIndex = this.contents.modules.findIndex((m) => m.name === module.name);
        if (moduleIndex === -1) {
            throw new Error(`Module [${module.name} does not exist]`);
        }
        this.contents.modules[moduleIndex] = module;
        return Promise.resolve();
    }
    updateResource(resource: mta.Resource): Promise<void> {
        if (!this.contents.resources) {
            throw new Error('No resources');
        }
        const resourceIndex = this.contents.resources.findIndex((m) => m.name === resource.name);
        if (resourceIndex === -1) {
            throw new Error(`Resource [${resource.name} does not exist]`);
        }
        this.contents.resources[resourceIndex] = resource;
        return Promise.resolve();
    }
    updateBuildParameters(_buildParameters: mta.ProjectBuildParameters): Promise<void> {
        throw new Error('Method not implemented.');
    }
    doesNameExist(_name: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    save(): Promise<void> {
        fs.writeFileSync(this.mtaPath, dump(this.contents));
        return Promise.resolve();
    }
    clean(): Promise<void> {
        return Promise.resolve();
    }
    resolveModuleProperties(): Promise<{ properties: Record<string, string>; messages: string[] }> {
        throw new Error('Method not implemented.');
    }
    getParameters(): Promise<mta.Parameters> {
        return Promise.resolve(this.contents.parameters ? this.contents.parameters : {});
    }
    updateParameters(parameters: mta.Parameters): Promise<void> {
        this.contents.parameters = parameters;
        return Promise.resolve();
    }
}
