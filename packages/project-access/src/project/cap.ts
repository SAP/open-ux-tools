import { join } from 'path';
import { FileName } from '../constants';
import type { CapCustomPaths, csn, Package } from '../types';
import { fileExists, readJSON } from '../file';
import { loadModuleFromProject } from './moduleLoader';

/**
 * Returns true if the project is either a CAP Node.js or a CAP Java project.
 *
 * @param projectRoot - the root path of the project
 * @param [packageJson] - optional: the parsed package.json object
 * @returns - true if the project is a CAP project; false otherwise
 */
export async function isCapProject(projectRoot: string, packageJson?: Package): Promise<boolean> {
    if ((await isCapNodeJsProject(projectRoot, packageJson)) || (await isCapJavaProject(projectRoot))) {
        return true;
    }
    return false;
}

/**
 * Returns true if the project is a CAP Node.js project.
 *
 * @param projectRoot - the root path of the project
 * @param [packageJson] - the parsed package.json object
 * @returns - true if the project is a CAP Node.js project
 */
export async function isCapNodeJsProject(projectRoot: string, packageJson?: Package): Promise<boolean> {
    // Parse package.json file if not provided
    if (!packageJson) {
        try {
            packageJson = await readJSON<Package>(join(projectRoot, FileName.Package));
        } catch {
            // Ignore errors while reading the package.json file
        }
    }
    return !!(packageJson?.cds || packageJson?.dependencies?.['@sap/cds']);
}

/**
 * Returns true if the project is a CAP Java project.
 *
 * @param projectRoot - the root path of the project
 * @returns - true if the project is a CAP project
 */
export async function isCapJavaProject(projectRoot: string): Promise<boolean> {
    return fileExists(join(projectRoot, 'srv', 'src', 'main', 'resources', 'application.yaml'));
}

/**
 * Get CAP CDS project custom paths for project root.
 *
 * @param capProjectPath - project root of cap project
 * @returns - Cap Custom Paths
 */
export async function getCapCustomPaths(capProjectPath: string): Promise<CapCustomPaths> {
    const result: CapCustomPaths = {
        app: 'app/',
        db: 'db/',
        srv: 'srv/'
    };
    try {
        const cds = await loadModuleFromProject<any>(capProjectPath, '@sap/cds');
        const cdsCustomPaths = cds.env.for('cds', capProjectPath);
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
 * Returns the project specific values for cds.env.folders.
 *
 * @param projectRoot - root of the project, where the package.json is
 * @returns - folder mappings for app, src, db, ...
 */
async function getCdsEnvFolders(projectRoot: string): Promise<CapCustomPaths> {
    const capCustomPaths = await getCapCustomPaths(projectRoot);
    return { ...capCustomPaths };
}

/**
 * Return the CAP model and all services.
 *
 * @param projectRoot - CAP project root where package.json resides
 */
export async function getCapModelAndServices(
    projectRoot: string
): Promise<{ model: csn; services: { name: string; urlPath: string }[] }> {
    const cds = await loadModuleFromProject<any>(projectRoot, '@sap/cds');
    const capProjectPaths = await getCdsEnvFolders(projectRoot);
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
