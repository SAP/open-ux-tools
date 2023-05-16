import { join } from 'path';
import { FileName } from '../constants';
import type { CapCustomPaths, CapProjectType, CdsEnvironment, csn, Package } from '../types';
import { fileExists, readJSON } from '../file';
import { loadModuleFromProject } from './module-loader';

interface CdsFacade {
    env: { for: (mode: string, path: string) => CdsEnvironment };
    load: (paths: string | string[]) => Promise<csn>;
    compile: {
        to: {
            serviceinfo: (model: csn, options?: { root?: string }) => ServiceInfo[];
        };
    };
}

interface ServiceInfo {
    name: string;
    urlPath: string;
}

/**
 * Returns true if the project is a CAP Node.js project.
 *
 * @param packageJson - the parsed package.json object
 * @returns - true if the project is a CAP Node.js project
 */
export function isCapNodeJsProject(packageJson: Package): boolean {
    return !!(packageJson.cds || packageJson.dependencies?.['@sap/cds']);
}

/**
 * Returns true if the project is a CAP Java project.
 *
 * @param projectRoot - the root path of the project
 * @returns - true if the project is a CAP project
 */
export async function isCapJavaProject(projectRoot: string): Promise<boolean> {
    const { srv } = await getCapCustomPaths(projectRoot);
    return fileExists(join(projectRoot, srv, 'src', 'main', 'resources', 'application.yaml'));
}

/**
 * Returns the CAP project type, undefined if it is not a CAP project.
 *
 * @param projectRoot - root of the project, where the package.json resides.
 * @returns - CAPJava for Java based CAP projects; CAPNodejs for node.js based CAP projects; undefined if it is no CAP project
 */
export async function getCapProjectType(projectRoot: string): Promise<CapProjectType | undefined> {
    if (await isCapJavaProject(projectRoot)) {
        return 'CAPJava';
    }
    let packageJson;
    try {
        packageJson = await readJSON<Package>(join(projectRoot, FileName.Package));
    } catch {
        // Ignore errors while reading the package.json file
    }
    if (packageJson && isCapNodeJsProject(packageJson)) {
        return 'CAPNodejs';
    }
    return undefined;
}

/**
 * Get CAP CDS project custom paths for project root.
 *
 * @param capProjectPath - project root of cap project
 * @returns - paths to app, db, and srv for CAP project
 */
export async function getCapCustomPaths(capProjectPath: string): Promise<CapCustomPaths> {
    const result: CapCustomPaths = {
        app: 'app/',
        db: 'db/',
        srv: 'srv/'
    };
    try {
        const cdsCustomPaths = await getCapEnvironment(capProjectPath);
        if (cdsCustomPaths.folders) {
            result.app = cdsCustomPaths.folders.app;
            result.db = cdsCustomPaths.folders.db;
            result.srv = cdsCustomPaths.folders.srv;
        }
    } catch (error) {
        // In case of issues, fall back to the defaults
    }
    return result;
}

/**
 * Return the CAP model and all services.
 *
 * @param projectRoot - CAP project root where package.json resides
 */
export async function getCapModelAndServices(projectRoot: string): Promise<{ model: csn; services: ServiceInfo[] }> {
    const cds = await loadModuleFromProject<CdsFacade>(projectRoot, '@sap/cds');
    const capProjectPaths = await getCapCustomPaths(projectRoot);
    const modelPaths = [
        join(projectRoot, capProjectPaths.app),
        join(projectRoot, capProjectPaths.srv),
        join(projectRoot, capProjectPaths.db)
    ];
    const model = await cds.load(modelPaths);
    const services = cds.compile.to['serviceinfo'](model, { root: projectRoot });

    return {
        model,
        services
    };
}

/**
 * Get CAP CDS project environment config for project root.
 *
 * @param capProjectPath - project root of a CAP project
 * @returns - environment config for CAP project
 */
export async function getCapEnvironment(capProjectPath: string): Promise<CdsEnvironment> {
    const cds = await loadModuleFromProject<CdsFacade>(capProjectPath, '@sap/cds');
    return cds.env.for('cds', capProjectPath);
}
