import { spawn } from 'child_process';
import { basename, dirname, join, normalize, relative, sep } from 'path';
import type { Logger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import { FileName, MinCdsVersionUi5Plugin } from '../constants';
import type {
    CapCustomPaths,
    CapProjectType,
    CdsEnvironment,
    csn,
    LinkedModel,
    Package,
    ServiceDefinitions,
    ServiceInfo,
    CdsVersionInfo,
    CdsUi5PluginInfo
} from '../types';
import {
    deleteDirectory,
    deleteFile,
    fileExists,
    findBy,
    readDirectory,
    readFile,
    readJSON,
    updatePackageJSON,
    writeFile
} from '../file';
import { loadModuleFromProject } from './module-loader';
import { findCapProjectRoot } from './search';
import { coerce, gte, satisfies } from 'semver';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { hasDependency } from './dependencies';

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
 * @param memFs - optional mem-fs-editor instance
 * @returns - true if the project is a CAP project
 */
export async function isCapJavaProject(
    projectRoot: string,
    capCustomPaths?: CapCustomPaths,
    memFs?: Editor
): Promise<boolean> {
    const srv = capCustomPaths?.srv ?? (await getCapCustomPaths(projectRoot)).srv;
    return fileExists(join(projectRoot, srv, 'src', 'main', 'resources', FileName.CapJavaApplicationYaml), memFs);
}

/**
 * Checks if there are files in the `srv` folder, using node fs or mem-fs.
 *
 * @param {string} srvFolderPath - The path to the `srv` folder to check for files.
 * @param {Editor} [memFs] - An optional `mem-fs-editor` instance. If provided, the function checks files within the in-memory file system.
 * @returns {Promise<boolean>} - Resolves to `true` if files are found in the `srv` folder; otherwise, `false`.
 */
async function checkFilesInSrvFolder(srvFolderPath: string, memFs?: Editor): Promise<boolean> {
    try {
        return (await findBy({ root: srvFolderPath, memFs })).length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Returns the CAP project type, undefined if it is not a CAP project.
 *
 * @param projectRoot - root of the project, where the package.json resides.
 * @param memFs - optional mem-fs-editor instance
 * @returns - CAPJava for Java based CAP projects; CAPNodejs for node.js based CAP projects; undefined if it is no CAP project
 */
export async function getCapProjectType(projectRoot: string, memFs?: Editor): Promise<CapProjectType | undefined> {
    const capCustomPaths = await getCapCustomPaths(projectRoot);
    if (!(await checkFilesInSrvFolder(join(projectRoot, capCustomPaths.srv), memFs))) {
        return undefined;
    }
    if (await isCapJavaProject(projectRoot, capCustomPaths, memFs)) {
        return 'CAPJava';
    }
    let packageJson;
    try {
        packageJson = await readJSON<Package>(join(projectRoot, FileName.Package), memFs);
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
 * Filters service endpoints to include only OData endpoints.
 *
 * @param endpoint The endpoint object to check.
 * @param endpoint.kind The type of the endpoint.
 * @returns `true` if the endpoint is of kind 'odata' or 'odata-v4'.
 */
function filterCapServiceEndpoints(endpoint: { kind: string }) {
    return endpoint.kind === 'odata' || endpoint.kind === 'odata-v4';
}

/**
 * Return the CAP model and all services. The cds.root will be set to the provided project root path.
 *
 * @param projectRoot - CAP project root where package.json resides or object specifying project root and optional logger to log additional info
 * @returns {Promise<{ model: csn; services: ServiceInfo[]; cdsVersionInfo: CdsVersionInfo }>} - CAP Model and Services
 */
export async function getCapModelAndServices(
    projectRoot: string | { projectRoot: string; logger?: Logger; pathSelection?: Set<'app' | 'srv' | 'db'> }
): Promise<{ model: csn; services: ServiceInfo[]; cdsVersionInfo: CdsVersionInfo }> {
    let _projectRoot: string;
    let _logger: Logger | undefined;
    let _pathSelection: Set<string> | undefined;
    const defaultPathSelection = new Set(['app', 'srv', 'db']);
    if (typeof projectRoot === 'object') {
        _projectRoot = projectRoot.projectRoot;
        _logger = projectRoot.logger;
        _pathSelection = projectRoot.pathSelection ? projectRoot.pathSelection : defaultPathSelection;
    } else {
        _pathSelection = defaultPathSelection;
        _projectRoot = projectRoot;
    }

    const cds = await loadCdsModuleFromProject(_projectRoot, true);
    const capProjectPaths = await getCapCustomPaths(_projectRoot);
    const modelPaths: string[] = [];
    _pathSelection?.forEach((path: string) => {
        modelPaths.push(join(_projectRoot, capProjectPaths[path as keyof CapCustomPaths]));
    });

    const model = await cds.load(modelPaths, { root: _projectRoot });

    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'cds.home': ${cds.home}`);
    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'cds.version': ${cds.version}`);
    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'cds.root': ${cds.root}`);
    _logger?.info(`@sap-ux/project-access:getCapModelAndServices - Using 'projectRoot': ${_projectRoot}`);

    let services = cds.compile.to.serviceinfo(model, { root: _projectRoot }) ?? [];
    // filter services that have ( urlPath defined AND no endpoints) OR have endpoints with kind 'odata'
    // i.e. ignore services for websockets and other unsupported protocols
    if (services.filter) {
        services = services.filter(
            (service) =>
                (service.urlPath && service.endpoints === undefined) ||
                service.endpoints?.find(filterCapServiceEndpoints)
        );
    }
    if (services.map) {
        services = services.map((value) => {
            const { endpoints, urlPath } = value;
            const odataEndpoint = endpoints?.find(filterCapServiceEndpoints);
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
                model = e.model as csn;
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
function uniformUrl(url: string): string {
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
        loadProjectError = error as Error;
    }
    if (!module) {
        try {
            // Second approach, load @sap/cds from @sap/cds-dk
            module = await loadGlobalCdsModule();
        } catch (error) {
            loadError = error as Error;
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
        const path = normalize(baseUri + '/' + relativeUri + '/' + FileName.Package);
        const content = await readJSON<Package>(path);
        if (typeof content?.name === 'string') {
            packageName = content.name;
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
export function clearGlobalCdsModulePromiseCache(): void {
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

/**
 * Method cleans up cds files after deletion of passed appName.
 *
 * @param cdsFilePaths - cds files to cleanup
 * @param appName - CAP application name
 * @param memFs - optional mem-fs-editor instance
 * @param logger - function to log messages (optional)
 */
async function cleanupCdsFiles(
    cdsFilePaths: string[],
    appName: string,
    memFs?: Editor,
    logger?: Logger
): Promise<void> {
    const usingEntry = `using from './${appName}/annotations';`;
    for (const cdsFilePath of cdsFilePaths) {
        if (await fileExists(cdsFilePath, memFs)) {
            try {
                let cdsFile = await readFile(cdsFilePath, memFs);
                if (cdsFile.indexOf(usingEntry) !== -1) {
                    logger?.info(`Removing using statement for './${appName}/annotations' from '${cdsFilePath}'.`);
                    cdsFile = cdsFile.replace(usingEntry, '');
                    if (cdsFile.replace(/\n/g, '').trim() === '') {
                        logger?.info(`File '${cdsFilePath}' is now empty, removing it.`);
                        await deleteFile(cdsFilePath, memFs);
                    } else {
                        await writeFile(cdsFilePath, cdsFile, memFs);
                    }
                }
            } catch (error) {
                logger?.error(`Could not modify file '${cdsFilePath}'. Skipping this file.`);
            }
        }
    }
}

/**
 * Delete application from CAP project.
 *
 * @param appPath - path to the application in a CAP project
 * @param [memFs] - optional mem-fs-editor instance
 * @param [logger] - function to log messages (optional)
 */
export async function deleteCapApp(appPath: string, memFs?: Editor, logger?: Logger): Promise<void> {
    const appName = basename(appPath);
    const projectRoot = await findCapProjectRoot(appPath);
    if (!projectRoot) {
        const message = `Project root was not found for CAP application with path '${appPath}'`;
        logger?.error(message);
        throw Error(message);
    }
    const packageJsonPath = join(projectRoot, FileName.Package);
    const packageJson = await readJSON<Package>(packageJsonPath, memFs);
    const cdsFilePaths = [join(dirname(appPath), FileName.ServiceCds), join(dirname(appPath), FileName.IndexCds)];

    logger?.info(`Deleting app '${appName}' from CAP project '${projectRoot}'.`);
    // Update `sapux` array if presented in package.json
    if (Array.isArray(packageJson.sapux)) {
        const posixAppPath = appPath.replace(/\\/g, '/');
        packageJson.sapux = packageJson.sapux.filter((a) => !posixAppPath.endsWith(a.replace(/\\/g, '/')));
        if (packageJson.sapux.length === 0) {
            logger?.info(
                `This was the last app in this CAP project. Deleting property 'sapux' from '${packageJsonPath}'.`
            );
            delete packageJson.sapux;
        }
    }
    if (packageJson.scripts?.[`watch-${appName}`]) {
        delete packageJson.scripts[`watch-${appName}`];
    }
    await updatePackageJSON(packageJsonPath, packageJson, memFs);
    logger?.info(`File '${packageJsonPath}' updated.`);
    await deleteDirectory(appPath, memFs);
    logger?.info(`Directory '${appPath}' deleted.`);

    // Cleanup app/service.cds and app/index.cds files
    await cleanupCdsFiles(cdsFilePaths, appName, memFs, logger);
    // Check if app folder is now empty
    if ((await readDirectory(dirname(appPath))).length === 0) {
        logger?.info(`Directory '${dirname(appPath)}' is now empty. Deleting it.`);
        await deleteDirectory(dirname(appPath), memFs);
    }
}

/**
 * Check if cds-plugin-ui5 is enabled on a CAP project. Checks also all prerequisites, like minimum @sap/cds version.
 * Overloaded function that returns detailed CAP plugin info.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param [fs] - optional: the memfs editor instance
 * @returns true: cds-plugin-ui5 and all prerequisites are fulfilled; false: cds-plugin-ui5 is not enabled or not all prerequisites are fulfilled
 */
export async function checkCdsUi5PluginEnabled(basePath: string, fs?: Editor): Promise<boolean>;

/**
 * Check if cds-plugin-ui5 is enabled on a CAP project. Checks also all prerequisites, like minimum @sap/cds version.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param [fs] - optional: the memfs editor instance
 * @param [moreInfo] if true return an object specifying detailed info about the cds and workspace state
 * @returns false if package.json is not found at specified path or {@link CdsUi5PluginInfo} with additional info
 */
export async function checkCdsUi5PluginEnabled(
    basePath: string,
    fs?: Editor,
    moreInfo?: boolean
): Promise<boolean | CdsUi5PluginInfo>;

/**
 * Check if cds-plugin-ui5 is enabled on a CAP project. Checks also all prerequisites, like minimum @sap/cds version.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param [fs] - optional: the memfs editor instance
 * @param [moreInfo] if true return an object specifying detailed info about the cds and workspace state
 * @param {CdsVersionInfo} [cdsVersionInfo] - If provided will be used instead of parsing the package.json file to determine the cds version.
 * @returns false if package.json is not found at specified path or {@link CdsUi5PluginInfo} with additional info
 */
export async function checkCdsUi5PluginEnabled(
    basePath: string,
    fs?: Editor,
    moreInfo?: boolean,
    cdsVersionInfo?: CdsVersionInfo
): Promise<boolean | CdsUi5PluginInfo>;

/**
 * Implementation of the overloaded function.
 * Check if cds-plugin-ui5 is enabled on a CAP project. Checks also all prerequisites, like minimum @sap/cds version.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param [fs] - optional: the memfs editor instance
 * @param [moreInfo] if true return an object specifying detailed info about the cds and workspace state
 * @param {CdsVersionInfo} [cdsVersionInfo] - If provided will be used instead of parsing the package.json file to determine the cds version.
 * @returns false if package.json is not found at specified path or {@link CdsUi5PluginInfo} with additional info or true if
 * cds-plugin-ui5 and all prerequisites are fulfilled
 */
export async function checkCdsUi5PluginEnabled(
    basePath: string,
    fs?: Editor,
    moreInfo?: boolean,
    cdsVersionInfo?: CdsVersionInfo
): Promise<boolean | CdsUi5PluginInfo> {
    if (!fs) {
        fs = create(createStorage());
    }
    const packageJsonPath = join(basePath, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        return false;
    }
    const packageJson = fs.readJSON(packageJsonPath) as Package;
    const { workspaceEnabled } = await getWorkspaceInfo(basePath, packageJson);
    const cdsInfo: CdsUi5PluginInfo = {
        // Below line checks if 'cdsVersionInfo' is available and contains version information.
        // If it does, it uses that version information to determine if it satisfies the minimum CDS version required.
        // If 'cdsVersionInfo' is not available or does not contain version information,it falls back to check the version specified in the package.json file.
        hasMinCdsVersion: cdsVersionInfo?.version
            ? satisfies(cdsVersionInfo?.version, `>=${MinCdsVersionUi5Plugin}`)
            : satisfiesMinCdsVersion(packageJson),
        isWorkspaceEnabled: workspaceEnabled,
        hasCdsUi5Plugin: hasDependency(packageJson, 'cds-plugin-ui5'),
        isCdsUi5PluginEnabled: false
    };
    cdsInfo.isCdsUi5PluginEnabled = cdsInfo.hasMinCdsVersion && cdsInfo.isWorkspaceEnabled && cdsInfo.hasCdsUi5Plugin;
    return moreInfo ? cdsInfo : cdsInfo.isCdsUi5PluginEnabled;
}

/**
 * Get information about the workspaces in the CAP project.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param packageJson - the parsed package.json
 * @returns - appWorkspace containing the path to the appWorkspace including wildcard; workspaceEnabled: boolean that states whether workspace for apps are enabled
 */
export async function getWorkspaceInfo(
    basePath: string,
    packageJson: Package
): Promise<{ appWorkspace: string; workspaceEnabled: boolean; workspacePackages: string[] }> {
    const capPaths = await getCapCustomPaths(basePath);
    const appWorkspace = capPaths.app.endsWith('/') ? `${capPaths.app}*` : `${capPaths.app}/*`;
    const workspacePackages = getWorkspacePackages(packageJson) ?? [];
    const workspaceEnabled = workspacePackages.includes(appWorkspace);
    return { appWorkspace, workspaceEnabled, workspacePackages };
}

/**
 * Return the reference to the array of workspace packages or undefined if not defined.
 * The workspace packages can either be defined directly as workspaces in package.json
 * or in workspaces.packages, e.g. in yarn workspaces.
 *
 * @param packageJson - the parsed package.json
 * @returns ref to the packages in workspaces or undefined
 */
function getWorkspacePackages(packageJson: Package): string[] | undefined {
    let workspacePackages: string[] | undefined;
    if (Array.isArray(packageJson.workspaces)) {
        workspacePackages = packageJson.workspaces;
    } else if (Array.isArray(packageJson.workspaces?.packages)) {
        workspacePackages = packageJson.workspaces?.packages;
    }
    return workspacePackages;
}

/**
 * Check if package.json has version or version range that satisfies the minimum version of @sap/cds.
 *
 * @param packageJson  - the parsed package.json
 * @returns - true: cds version satisfies the min cds version; false: cds version does not satisfy min cds version
 */
export function satisfiesMinCdsVersion(packageJson: Package): boolean {
    return (
        hasMinCdsVersion(packageJson) ||
        satisfies(MinCdsVersionUi5Plugin, packageJson.dependencies?.['@sap/cds'] ?? '0.0.0')
    );
}

/**
 * Check if package.json has dependency to the minimum min version of @sap/cds,
 * that is required to enable cds-plugin-ui.
 *
 * @param packageJson - the parsed package.json
 * @returns - true: min cds version is present; false: cds version needs update
 */
export function hasMinCdsVersion(packageJson: Package): boolean {
    return gte(coerce(packageJson.dependencies?.['@sap/cds']) ?? '0.0.0', MinCdsVersionUi5Plugin);
}
