import { spawn } from 'child_process';
import { dirname, join, normalize, relative, sep } from 'path';
import { FileName } from '../constants';
import type {
    CapCustomPaths,
    CapProjectType,
    CdsEnvironment,
    csn,
    LinkedModel,
    Package,
    ServiceDefinitions,
    ServiceInfo,
    CdsVersionInfo
} from '../types';
import { fileExists, readFile, readJSON } from '../file';
import { loadModuleFromProject } from './module-loader';
import type { Logger } from '@sap-ux/logger';

interface CdsFacade {
    env: { for: (mode: string, path: string) => CdsEnvironment };
    linked: (model: csn) => LinkedModel;
    load: (paths: string | string[], options?: { root?: string }) => Promise<csn>;
    compile: {
        to: {
            serviceinfo: (model: csn, options?: { root?: string }) => ServiceInfo[];
            edmx: (model: csn, options?: { service?: string; version?: 'v2' | 'v4' }) => Promise<string>;
        };
    };
    resolve: ResolveWithCache;
    root: string; // cds.root
    version: string; // cds.version
    home: string; // cds.home
}

interface ResolveWithCache {
    (files: string | string[], options?: { skipModelCache: boolean }): string[];
    cache: Record<string, { cached: Record<string, string[]>; paths: string[] }>;
}

/**
 * Returns true if the project is a CAP Node.js project.
 *
 * @param packageJson - the parsed package.json object
 * @returns - true if the project is a CAP Node.js project
 */
export function isCapNodeJsProject(packageJson: Package): boolean {
    return !!(packageJson.cds ?? packageJson.dependencies?.['@sap/cds']);
}

/**
 * Returns true if the project is a CAP Java project.
 *
 * @param projectRoot - the root path of the project
 * @param [capCustomPaths] - optional, relative CAP paths like app, db, srv
 * @returns - true if the project is a CAP project
 */
export async function isCapJavaProject(projectRoot: string, capCustomPaths?: CapCustomPaths): Promise<boolean> {
    const srv = capCustomPaths?.srv ?? (await getCapCustomPaths(projectRoot)).srv;
    return fileExists(join(projectRoot, srv, 'src', 'main', 'resources', FileName.CapJavaApplicationYaml));
}

/**
 * Returns the CAP project type, undefined if it is not a CAP project.
 *
 * @param projectRoot - root of the project, where the package.json resides.
 * @returns - CAPJava for Java based CAP projects; CAPNodejs for node.js based CAP projects; undefined if it is no CAP project
 */
export async function getCapProjectType(projectRoot: string): Promise<CapProjectType | undefined> {
    const capCustomPaths = await getCapCustomPaths(projectRoot);
    if (!(await fileExists(join(projectRoot, capCustomPaths.srv)))) {
        return undefined;
    }
    if (await isCapJavaProject(projectRoot, capCustomPaths)) {
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
 * Returns true if the project is either a CAP Node.js or a CAP Java project.
 *
 * @param projectRoot - the root path of the project
 * @returns - true if the project is a CAP project
 */
export async function isCapProject(projectRoot: string): Promise<boolean> {
    return !!(await getCapProjectType(projectRoot));
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
 * Return the CAP model and all services. The cds.root will be set to the provided project root path.
 *
 * @param projectRoot - CAP project root where package.json resides or object specifying project root and optional logger to log additional info
 * @returns {Promise<{ model: csn; services: ServiceInfo[]; cdsVersionInfo: CdsVersionInfo }>} - CAP Model and Services
 */
export async function getCapModelAndServices(
    projectRoot: string | { projectRoot: string; logger?: Logger }
): Promise<{ model: csn; services: ServiceInfo[]; cdsVersionInfo: CdsVersionInfo }> {
    let _projectRoot;
    let _logger;
    if (typeof projectRoot === 'object') {
        _projectRoot = projectRoot.projectRoot;
        _logger = projectRoot.logger;
    } else {
        _projectRoot = projectRoot;
    }

    const cds = await loadCdsModuleFromProject(_projectRoot, true);
    const capProjectPaths = await getCapCustomPaths(_projectRoot);
    const modelPaths = [
        join(_projectRoot, capProjectPaths.app),
        join(_projectRoot, capProjectPaths.srv),
        join(_projectRoot, capProjectPaths.db)
    ];
    const model = await cds.load(modelPaths, { root: _projectRoot });

    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'cds.home': ${cds.home}`);
    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'cds.version': ${cds.version}`);
    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'cds.root': ${cds.root}`);
    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'projectRoot': ${_projectRoot}`);

    let services = cds.compile.to.serviceinfo(model, { root: _projectRoot }) ?? [];
    if (services.map) {
        services = services.map((value) => {
            const { endpoints, urlPath } = value;
            const odataEndpoint = endpoints?.find((endpoint) => endpoint.kind === 'odata');
            const endpointPath = odataEndpoint?.path ?? urlPath;
            return {
                name: value.name,
                urlPath: uniformUrl(endpointPath),
                runtime: value.runtime
            };
        });
    }
    return {
        model,
        services,
        cdsVersionInfo: {
            home: cds.home,
            version: cds.version,
            root: cds.root
        }
    };
}

/**
 * Returns a list of cds file paths (layers). By default return list of all, but you can also restrict it to one envRoot.
 *
 * @param projectRoot - root of the project, where the package.json is
 * @param [ignoreErrors] - optionally, default is false; if set to true the thrown error will be checked for CDS file paths in model and returned
 * @param [envRoot] - optionally, the root folder or CDS file to get the layer files
 * @returns - array of strings containing cds file paths
 */
export async function getCdsFiles(
    projectRoot: string,
    ignoreErrors = false,
    envRoot?: string | string[]
): Promise<string[]> {
    let cdsFiles: string[] = [];
    try {
        let csn;
        envRoot ??= await getCdsRoots(projectRoot);
        try {
            const cds = await loadCdsModuleFromProject(projectRoot);
            csn = await cds.load(envRoot, { root: projectRoot });
            cdsFiles = [...(csn['$sources'] ?? [])];
        } catch (e) {
            if (ignoreErrors && e.model?.sources && typeof e.model.sources === 'object') {
                cdsFiles.push(...extractCdsFilesFromMessage(e.model.sources));
            } else {
                throw e;
            }
        }
    } catch (error) {
        throw Error(
            `Error while retrieving the list of cds files for project ${projectRoot}, envRoot ${envRoot}. Error was: ${error}`
        );
    }
    return cdsFiles;
}

/**
 * Returns a list of filepaths to CDS files in root folders. Same what is done if you execute cds.resolve('*') on command line in a project.
 *
 * @param projectRoot - root of the project, where the package.json is
 * @param [clearCache] - optionally, clear the cache, default false
 * @returns - array of root paths
 */
export async function getCdsRoots(projectRoot: string, clearCache = false): Promise<string[]> {
    const roots = [];
    const capCustomPaths = await getCapCustomPaths(projectRoot);
    const cdsEnvRoots = [capCustomPaths.db, capCustomPaths.srv, capCustomPaths.app, 'schema', 'services'];
    // clear cache is enforced to also resolve newly created cds file at design time
    const cds = await loadCdsModuleFromProject(projectRoot);
    if (clearCache) {
        clearCdsResolveCache(cds);
    }
    for (const cdsEnvRoot of cdsEnvRoots) {
        const resolvedRoots =
            cds.resolve(join(projectRoot, cdsEnvRoot), {
                skipModelCache: true
            }) || [];
        for (const resolvedRoot of resolvedRoots) {
            roots.push(resolvedRoot);
        }
    }
    return roots;
}

/**
 * Return a list of services in a CAP project.
 *
 * @param projectRoot - root of the CAP project, where the package.json is
 * @param ignoreErrors - in case loading the cds model throws an error, try to use the model from the exception object
 * @returns - array of service definitions
 */
export async function getCdsServices(projectRoot: string, ignoreErrors = true): Promise<ServiceDefinitions[]> {
    let cdsServices: ServiceDefinitions[] = [];
    try {
        const cds = await loadCdsModuleFromProject(projectRoot);
        const roots: string[] = await getCdsRoots(projectRoot);
        let model;
        try {
            model = await cds.load(roots, { root: projectRoot });
        } catch (e) {
            if (ignoreErrors && e.model) {
                model = e.model;
            } else {
                throw e;
            }
        }
        const linked = cds.linked(model);
        if (Array.isArray(linked.services)) {
            cdsServices = linked.services;
        } else {
            Object.keys(linked.services).forEach((service) => {
                cdsServices.push(linked.services[service] as ServiceDefinitions);
            });
        }
    } catch (error) {
        throw Error(`Error while resolving cds roots for '${projectRoot}'. ${error}`);
    }
    return cdsServices;
}

/**
 * When an error occurs while trying to read cds files, the error object contains the source file
 * information. This function extracts this file paths.
 *
 * @param sources - map containing the file name
 * @returns - array of strings containing cds file paths
 */
function extractCdsFilesFromMessage(sources: Record<string, { filename?: string }>): string[] {
    const cdsFiles: string[] = [];
    for (const source in sources) {
        let filename = sources[source].filename;
        if (typeof filename === 'string' && !filename.startsWith(sep)) {
            filename = join(sep, filename);
        }
        if (filename) {
            cdsFiles.push(filename);
        }
    }
    return cdsFiles;
}

/**
 * Remove rogue '\\' - cds windows if needed.
 * Replaces all backslashes with forward slashes, removes double slashes, and trailing slashes.
 *
 * @param url - url to uniform
 * @returns - uniform url
 */
function uniformUrl(url: string) {
    return url
        .replace(/\\/g, '/')
        .replace(/\/\//g, '/')
        .replace(/(?:^\/)/g, '');
}

/**
 * Return the EDMX string of a CAP service.
 *
 * @param root - CAP project root where package.json resides
 * @param uri - service path, e.g 'incident/'
 * @param version - optional OData version v2 or v4
 * @returns - string containing the edmx
 */
export async function readCapServiceMetadataEdmx(
    root: string,
    uri: string,
    version: 'v2' | 'v4' = 'v4'
): Promise<string> {
    try {
        const { model, services } = await getCapModelAndServices(root);
        const service = findServiceByUri(services, uri);
        if (!service) {
            throw Error(`Service for uri: '${uri}' not found. Available services: ${JSON.stringify(services)}`);
        }
        const cds = await loadCdsModuleFromProject(root);
        const edmx = cds.compile.to.edmx(model, { service: service.name, version });
        return edmx;
    } catch (error) {
        throw Error(
            `Error while reading CAP service metadata. Path: '${root}', service uri: '${uri}', error: '${error.toString()}'}`
        );
    }
}

/**
 * Find a service in a list of services ignoring leading and trailing slashes.
 *
 * @param services - list of services from cds.compile.to['serviceinfo'](model)
 * @param uri - search uri (usually from data source in manifest.json)
 * @returns - name and uri of the service, undefined if service not found
 */
function findServiceByUri(
    services: { name: string; urlPath: string }[],
    uri: string
): { name: string; urlPath: string } | undefined {
    const searchUri = uniformUrl(uri).replace(/(?:^\/)|(?:\/$)/g, '');
    return services.find((srv) => srv.urlPath.replace(/(?:^\/)|(?:\/$)/g, '') === searchUri);
}

/**
 * Get CAP CDS project environment config for project root.
 *
 * @param capProjectPath - project root of a CAP project
 * @returns - environment config for a CAP project
 */
export async function getCapEnvironment(capProjectPath: string): Promise<CdsEnvironment> {
    const cds = await loadCdsModuleFromProject(capProjectPath);
    return cds.env.for('cds', capProjectPath);
}

/**
 * To fix issues when switching different cds versions dynamically, we need to set global.cds, see end of function loadCdsModuleFromProject()
 */
declare const global: {
    cds: CdsFacade;
};

/**
 * Load CAP CDS module. First attempt loads @sap/cds for a project based on its root.
 * Second attempt loads @sap/cds from global installed @sap/cds-dk.
 * Throws error if module could not be loaded or strict mode is true and there is a version mismatch.
 *
 * @param capProjectPath - project root of a CAP project
 * @param [strict] - optional, when set true an error is thrown, if global loaded cds version does not match the cds version from package.json dependency. Default is false.
 * @returns - CAP CDS module for a CAP project
 */
async function loadCdsModuleFromProject(capProjectPath: string, strict: boolean = false): Promise<CdsFacade> {
    let module: CdsFacade | { default: CdsFacade } | undefined;
    let loadProjectError;
    let loadError;
    try {
        // First approach, load @sap/cds from project
        module = await loadModuleFromProject<CdsFacade | { default: CdsFacade }>(capProjectPath, '@sap/cds');
    } catch (error) {
        loadProjectError = error;
    }
    if (!module) {
        try {
            // Second approach, load @sap/cds from @sap/cds-dk
            module = await loadGlobalCdsModule();
        } catch (error) {
            loadError = error;
        }
    }
    if (!module) {
        throw Error(
            `Could not load cds module. Attempt to load module @sap/cds from project threw error '${loadProjectError}', attempt to load module @sap/cds from @sap/cds-dk threw error '${loadError}'`
        );
    }
    const cds = 'default' in module ? module.default : module;

    // In case strict is true and there was a fallback to global cds installation for a project that has a cds dependency, check if major versions match
    if (strict && loadProjectError) {
        const cdsDependencyVersion = await getCdsVersionFromPackageJson(join(capProjectPath, FileName.Package));
        if (typeof cdsDependencyVersion === 'string') {
            const globalCdsVersion = cds.version;
            if (getMajorVersion(cdsDependencyVersion) !== getMajorVersion(globalCdsVersion)) {
                const error = new Error(
                    `The @sap/cds major version (${cdsDependencyVersion}) specified in your CAP project is different to the @sap/cds version you have installed globally (${globalCdsVersion}). Please run 'npm install' on your CAP project to ensure that the correct CDS version is loaded.`
                ) as Error & { code: string };
                error.code = 'CDS_VERSION_MISMATCH';
                throw error;
            }
        }
    }

    // Fix when switching cds versions dynamically
    if (global) {
        global.cds = cds;
    }
    // correct cds.env for current project root. Especially needed CAP Java projects loading cds dependency from jar file
    cds.env = cds.env.for('cds', capProjectPath) as typeof cds.env;
    return cds;
}

/**
 * Method to clear CAP CDS module cache for passed project path.
 *
 * @param projectRoot root of a CAP project.
 * @returns True if cache cleared successfully.
 */
export async function clearCdsModuleCache(projectRoot: string): Promise<boolean> {
    let result = false;
    try {
        const cds = await loadCdsModuleFromProject(projectRoot);
        if (cds) {
            clearCdsResolveCache(cds);
            result = true;
        }
    } catch (e) {
        // ignore exception
    }
    return result;
}

/**
 * Method to clear CAP CDS module cache for passed cds module.
 *
 * @param cds CAP CDS module
 */
function clearCdsResolveCache(cds: CdsFacade): void {
    cds.resolve.cache = {};
}

/**
 * Get absolute path to a resource.
 *
 * @param projectRoot - project root of a CAP project
 * @param relativeUri - relative resource path.
 * @returns {string} - absolute path.
 */
export const toAbsoluteUri = (projectRoot: string, relativeUri: string): string => join(projectRoot, relativeUri);

/**
 * Converts to referenced uri to be used in using statements.
 *
 * @param projectRoot - project root of a CAP project
 * @param relativeUriFrom - relative uri of from directory
 * @param relativeUriTo - relative uri of to directory
 * @returns {Promise<string>} - reference uri
 */
export const toReferenceUri = async (
    projectRoot: string,
    relativeUriFrom: string,
    relativeUriTo: string
): Promise<string> => {
    let relativeUri = '';
    const indexNodeModules = relativeUriTo.lastIndexOf('node_modules');
    if (indexNodeModules >= 0) {
        // extract module name from fileUri - e.g. '@sap/cds/common' from '../../node_modules/@sap/cds/common.cds'
        const indexLastDot = relativeUriTo.lastIndexOf('.');
        if (indexLastDot > indexNodeModules + 13) {
            relativeUri = relativeUriTo.slice(indexNodeModules + 13, indexLastDot);
        } else {
            relativeUri = relativeUriTo.slice(indexNodeModules + 13);
        }
    } else if (relativeUriTo.startsWith('../') || relativeUriTo.startsWith('..\\')) {
        // file outside current project (e.g. mono repo)
        const result = await getPackageNameInFolder(projectRoot, relativeUriTo);
        if (result.packageName) {
            relativeUri = result.packageName + relativeUriTo.slice(result.packageFolder.length);
        }
    }
    if (!relativeUri) {
        // build relative path
        const fromDir = dirname(toAbsoluteUri(projectRoot, relativeUriFrom));
        relativeUri = relative(fromDir, toAbsoluteUri(projectRoot, relativeUriTo));
        if (!relativeUri.startsWith('.')) {
            relativeUri = './' + relativeUri;
        }
    }
    // remove file extension
    const fileExtension = relativeUri.lastIndexOf('.') > 0 ? relativeUri.slice(relativeUri.lastIndexOf('.') + 1) : '';
    if (['CDS', 'JSON'].includes(fileExtension.toUpperCase())) {
        relativeUri = relativeUri.slice(0, relativeUri.length - fileExtension.length - 1);
    }

    // always use '/' instead of platform specific separator
    return relativeUri.split(sep).join('/');
};

/**
 * Gets package name from the folder.
 *
 * @param baseUri - base uri of the cap project
 * @param relativeUri - relative uri to the resource folder
 * @returns {Promise<{ packageName: string; packageFolder: string }>} - package name and folder
 */
async function getPackageNameInFolder(
    baseUri: string,
    relativeUri: string
): Promise<{ packageName: string; packageFolder: string }> {
    const refUriParts = relativeUri.split(sep);
    const result = { packageName: '', packageFolder: relativeUri };
    for (let i = refUriParts.length - 1; i >= 0 && !result.packageName; i--) {
        const currentFolder = refUriParts.slice(0, i).join(sep);
        result.packageName = await readPackageNameForFolder(baseUri, currentFolder);
        if (result.packageName) {
            result.packageFolder = currentFolder;
        }
    }
    return result;
}

/**
 * Reads package name from package json of the folder.
 *
 * @param baseUri - base uri of the cap project
 * @param relativeUri - relative uri to the resource folder
 * @returns {Promise<string>} - package name
 */
async function readPackageNameForFolder(baseUri: string, relativeUri: string): Promise<string> {
    let packageName = '';
    try {
        const path = normalize(baseUri + '/' + relativeUri + '/' + 'package.json');
        const content = await readFile(path);
        if (content) {
            const parsed = JSON.parse(content);
            packageName = parsed.name;
        }
    } catch (e) {
        packageName = '';
    }
    return packageName;
}

// Cache for request to load global cds. Cache the promise to avoid starting multiple identical requests in parallel.
let globalCdsModulePromise: Promise<CdsFacade> | undefined;

/**
 * Try to load global installation of @sap/cds, usually child of @sap/cds-dk.
 *
 * @returns - module @sap/cds from global installed @sap/cds-dk
 */
async function loadGlobalCdsModule(): Promise<CdsFacade> {
    globalCdsModulePromise =
        globalCdsModulePromise ??
        new Promise<CdsFacade>((resolve, reject) => {
            return getCdsVersionInfo().then((versions) => {
                if (versions.home) {
                    resolve(loadModuleFromProject<CdsFacade>(versions.home, '@sap/cds'));
                } else {
                    reject(
                        new Error(
                            'Can not find global installation of module @sap/cds, which should be part of @sap/cds-dk'
                        )
                    );
                }
            }, reject);
        });
    return globalCdsModulePromise;
}

/**
 * Clear cache of request to load global cds module.
 */
export function clearGlobalCdsModulePromiseCache() {
    globalCdsModulePromise = undefined;
}

/**
 * Get cds information, which includes versions and also the home path of cds module.
 *
 * @param [cwd] - optional folder in which cds --version should be executed
 * @returns - result of call 'cds --version'
 */
async function getCdsVersionInfo(cwd?: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
        let out = '';
        const cdsVersionInfo = spawn('cds', ['--version'], { cwd, shell: true });
        cdsVersionInfo.stdout.on('data', (data) => {
            out += data.toString();
        });
        cdsVersionInfo.on('close', () => {
            if (out) {
                const versions: Record<string, string> = {};
                for (const line of out.split('\n').filter((v) => v)) {
                    const [key, value] = line.split(': ');
                    versions[key] = value;
                }
                resolve(versions);
            } else {
                reject(new Error('Module path not found'));
            }
        });
        cdsVersionInfo.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Read the version string of the @sap/cds module from the package.json file.
 *
 * @param packageJsonPath - path to package.json
 * @returns - version of @sap/cds from package.json or undefined
 */
async function getCdsVersionFromPackageJson(packageJsonPath: string): Promise<string | undefined> {
    let version: string | undefined;
    try {
        if (await fileExists(packageJsonPath)) {
            const packageJson = await readJSON<Package>(packageJsonPath);
            version = packageJson?.dependencies?.['@sap/cds'];
        }
    } catch {
        // If we can't read or parse the package.json we return undefined
    }
    return version;
}

/**
 * Get major version from version string.
 *
 * @param versionString - version string
 * @returns - major version as number
 */
function getMajorVersion(versionString: string): number {
    return parseInt(/\d+/.exec(versionString.split('.')[0])?.[0] ?? '0', 10);
}

/**
 * Method resolves cap service name for passed project root and service uri.
 *
 * @param projectRoot - project root
 * @param datasourceUri - service uri
 * @returns - found cap service name
 */
export async function getCapServiceName(projectRoot: string, datasourceUri: string): Promise<string> {
    const services = (await getCapModelAndServices(projectRoot)).services;
    const service = findServiceByUri(services, datasourceUri);
    if (!service?.name) {
        const errorMessage = `Service for uri: '${datasourceUri}' not found. Available services: ${JSON.stringify(
            services
        )}`;
        throw Error(errorMessage);
    }
    return service.name;
}
