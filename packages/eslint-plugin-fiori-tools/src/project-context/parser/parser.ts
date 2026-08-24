import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseJson } from '@humanwhocodes/momoa';
import type { FoundFioriArtifacts, Manifest, ProjectType } from '@sap-ux/project-access';
import type { ODataVersionType } from '@sap-ux/odata-annotation-core';
import { getMainService, normalizePath } from '@sap-ux/project-access';
import {
    CdsAnnotationProvider,
    getXmlServiceArtifacts,
    type ServiceArtifacts,
    type V2Annotation
} from '@sap-ux/fiori-annotation-api';
import type { LocalFile, RemoteFileWithLocalServiceCache } from '../types.js';
import type { Diagnostic } from '../../language/diagnostics.js';
import { buildServiceIndex } from './service.js';
import type {
    ParsedProject,
    ParsedApp,
    ParsedManifest,
    FoundODataService,
    CustomViews,
    MinUI5Version,
    FlexChange
} from './types.js';
import { uniformUrl } from '@sap-ux/fiori-annotation-api';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { collectFlexChanges, getAppForPath, isFlexChange } from '../utils.js';

export interface ParseResult {
    index: ParsedProject;
    diagnostics: Diagnostic[];
}

interface ParseContext {
    projectType: ProjectType;
    fileCache: Map<string, string>;
}

/**
 *
 */
export class ApplicationParser {
    private context: ParseContext;
    private index: ParsedProject;
    private diagnostics: Diagnostic[];
    /**
     * Resets the parser state with new project type and file cache.
     *
     * @param projectType - The type of project being parsed
     * @param fileCache - Map of file URIs to their contents
     */
    private reset(projectType: ProjectType, fileCache: Map<string, string>): void {
        this.index = { projectType, apps: {}, documents: {} };
        this.diagnostics = [];
        this.context = { projectType, fileCache };
    }

    /**
     *
     * @param projectType
     * @param artifacts
     * @param fileCache
     */
    public parse(
        projectType: ProjectType,
        artifacts: FoundFioriArtifacts,
        fileCache: Map<string, string>
    ): ParseResult {
        this.reset(projectType, fileCache);

        for (const app of artifacts.applications ?? []) {
            try {
                const manifestUri = pathToFileURL(app.manifestPath).toString();
                const manifestContent = fileCache.get(manifestUri) ?? '';
                const manifestAst = parseJson(manifestContent, {
                    mode: 'json',
                    ranges: true,
                    tokens: true,
                    allowTrailingCommas: false
                });
                this.index.documents[manifestUri] = manifestAst;
                const manifest = JSON.parse(manifestContent) as Manifest;
                const webappPath = dirname(app.manifestPath);
                const [parsedManifest, services] = this.parseManifest(webappPath, manifestUri, manifest);
                const appRootUri = pathToFileURL(app.appRoot).toString();
                const changes: FlexChange[] = [];
                const mainServiceName = getMainService(manifest) ?? '';
                const mainService = services.find((service) => service.name === mainServiceName);
                if (mainService?.version === '2.0' && existsSync(join(webappPath, 'changes'))) {
                    const changeFiles = readdirSync(join(webappPath, 'changes'))
                        .filter((file) => file.endsWith('propertyChange.change'))
                        .map((file) => normalizePath(join(webappPath, 'changes', file)));
                    changes.push(...collectFlexChanges(changeFiles));
                }
                const parsedApp: ParsedApp = {
                    manifest: parsedManifest,
                    manifestObject: manifest,
                    projectRootPath: app.projectRoot,
                    changes,
                    services: {}
                };
                this.index.apps[appRootUri] = parsedApp;

                for (const service of services) {
                    const result = this.parseService(app.projectRoot, service);
                    if (result) {
                        const [artifacts, v2Annotations] = result;
                        const index = buildServiceIndex(artifacts, this.index.documents, v2Annotations);
                        parsedApp.services[service.name] = { config: service, artifacts, index };
                    }
                }
            } catch {
                // skip faulty apps for now
            }
        }
        return {
            index: this.index,
            diagnostics: this.diagnostics
        };
    }

    /**
     * Reparses CDS files and updates the project index.
     *
     * @param index - The current parsed project index
     * @param fileCache - Map of file URIs to their contents
     */
    private reparseCDS(index: ParsedProject, fileCache: Map<string, string>): void {
        // there is assumption that only one eslint config exists in CAP project and its run for the whole project
        const projectRoot = index.apps[Object.keys(index.apps)[0]]?.projectRootPath;
        if (projectRoot) {
            CdsAnnotationProvider.resetCache(projectRoot, fileCache);
        }
        for (const app of Object.values(index.apps)) {
            for (const service of Object.values(app.services)) {
                if (service.config.type === 'cap') {
                    const result = this.parseService(app.projectRootPath, service.config);
                    if (result) {
                        const [artifacts, v2Annotations] = result;
                        service.artifacts = artifacts;
                        service.index = buildServiceIndex(artifacts, index.documents, v2Annotations);
                    }
                }
            }
        }
    }

    /**
     * Reparses a manifest.json file and updates the associated app in the project index.
     *
     * @param uri - The URI of the manifest.json file to reparse
     * @param index - The current parsed project index
     * @param fileCache - Map of file URIs to their contents
     */
    private reparseJSON(uri: string, index: ParsedProject, fileCache: Map<string, string>): void {
        for (const [key, previousApp] of Object.entries(index.apps)) {
            if (previousApp.manifest.manifestUri !== uri) {
                continue;
            }
            const manifestContent = fileCache.get(uri) ?? '';
            const manifestAst = parseJson(manifestContent, {
                mode: 'json',
                ranges: true,
                tokens: true,
                allowTrailingCommas: false
            });
            index.documents[uri] = manifestAst;
            const manifest = JSON.parse(manifestContent) as Manifest;
            const webappPath = dirname(fileURLToPath(uri));
            const [parsedManifest, services] = this.parseManifest(webappPath, uri, manifest);
            index.documents[uri] = manifestAst;
            const parsedApp: ParsedApp = {
                manifest: parsedManifest,
                manifestObject: manifest,
                projectRootPath: previousApp.projectRootPath,
                services: {},
                changes: previousApp.changes
            };

            const previouslyFoundServices = Object.values(previousApp.services).map((service) => service.config);
            if (JSON.stringify(previouslyFoundServices) === JSON.stringify(services)) {
                // keep existing services
                parsedApp.services = previousApp.services;
            } else {
                // services have changed, reset existing services
                parsedApp.services = {};
                for (const service of services) {
                    const result = this.parseService(parsedApp.projectRootPath, service);
                    if (result) {
                        const [artifacts, v2Annotations] = result;
                        const serviceIndex = buildServiceIndex(artifacts, index.documents, v2Annotations);
                        parsedApp.services[service.name] = { config: service, artifacts, index: serviceIndex };
                    }
                }
            }
            index.apps[key] = parsedApp;
            break;
        }
    }

    /**
     * Reparses .change property change files and updates the associated app in the project index.
     *
     * @param uri - The URI of the property change file to reparse
     * @param index - The current parsed project index
     * @param fileCache - Map of file URIs to their contents
     */
    private reparseChange(uri: string, index: ParsedProject, fileCache: Map<string, string>): void {
        const path = fileURLToPath(uri);
        const app = getAppForPath(index.apps, path);
        if (!app) {
            return;
        }
        // Remove deleted files
        app.changes = app.changes.filter((change) => existsSync(fileURLToPath(change.changeFileUri)));
        const existingChangeIndex = app.changes.findIndex((change) => change.changeFileUri === uri);
        try {
            const content = fileCache.get(uri) ?? readFileSync(path, { encoding: 'utf8', flag: 'r' });
            // Create and save the ast tree
            const ast = parseJson(content, {
                mode: 'json',
                ranges: true,
                tokens: true,
                allowTrailingCommas: false
            });
            index.documents[uri] = ast;
            // Create new change object
            const jsonContent = JSON.parse(content);
            if (isFlexChange(jsonContent)) {
                const newChange: FlexChange = {
                    changeType: jsonContent.changeType,
                    content: jsonContent.content,
                    selector: jsonContent.selector,
                    changeFileUri: uri
                };
                // Replace the existing entry for this URI, or append if new
                if (existingChangeIndex >= 0) {
                    app.changes[existingChangeIndex] = newChange;
                } else {
                    app.changes.push(newChange);
                }
            } else if (existingChangeIndex >= 0) {
                // Remove existing change object for updated file
                app.changes.splice(existingChangeIndex, 1);
            }
        } catch {
            // Remove existing change object for unreadable or malformed change file
            if (existingChangeIndex >= 0) {
                app.changes.splice(existingChangeIndex, 1);
            }
        }
    }

    /**
     * Reparses an XML annotation file and updates the affected services in the project index.
     *
     * @param uri - The URI of the XML file to reparse
     * @param index - The current parsed project index
     */
    private reparseXML(uri: string, index: ParsedProject): void {
        for (const app of Object.values(index.apps)) {
            for (const service of Object.values(app.services)) {
                if (service.config.type === 'local') {
                    const annotationFile = service.config.annotationFiles.find((file) => file.uri === uri);
                    if (annotationFile) {
                        const result = this.parseService(app.projectRootPath, service.config);
                        if (result) {
                            const [artifacts, v2Annotations] = result;
                            service.artifacts = artifacts;
                            service.index = buildServiceIndex(artifacts, index.documents, v2Annotations);
                        }
                        break;
                    }
                }
            }
        }
    }

    /**
     * Reparses a specific file and updates the project index based on file type.
     *
     * @param uri - The URI of the file to reparse
     * @param index - The current parsed project index
     * @param fileCache - Map of file URIs to their contents
     */
    public reparse(uri: string, index: ParsedProject, fileCache: Map<string, string>): ParseResult {
        this.reset(index.projectType, fileCache);
        if (uri.endsWith('.cds')) {
            this.reparseCDS(index, fileCache);
        } else if (uri.endsWith('manifest.json')) {
            this.reparseJSON(uri, index, fileCache);
        } else if (uri.endsWith('.xml')) {
            this.reparseXML(uri, index);
        } else if (uri.endsWith('.change')) {
            this.reparseChange(uri, index, fileCache);
        }
        return { index: index, diagnostics: [] };
    }

    /**
     * Parses a manifest.json file to extract app configuration and OData services.
     *
     * @param webappPath - The absolute path to the webapp directory
     * @param manifestUri - The URI of the manifest.json file
     * @param manifest - The parsed manifest object
     */
    private parseManifest(
        webappPath: string,
        manifestUri: string,
        manifest: Manifest
    ): [ParsedManifest, FoundODataService[]] {
        const customViews: CustomViews = {};
        const services: FoundODataService[] = [];
        const targets = manifest['sap.ui5']?.routing?.targets;
        for (const [, target] of Object.entries((targets ?? {}) as Record<string, RoutingTarget>)) {
            const settings = target.options?.settings;
            if (settings?.entitySet || settings?.contextPath) {
                if (settings.viewName) {
                    customViews[settings.viewName] = {
                        entitySet: settings.entitySet,
                        contextPath: settings.contextPath
                    };
                }
            }
        }

        const mainServiceName = getMainService(manifest) ?? '';

        const manifestDataSources = manifest['sap.app']?.dataSources ?? {};
        for (const [dataSourceName, dataSource] of Object.entries(manifestDataSources)) {
            if (dataSource.type !== 'OData' || !dataSource.uri) {
                continue;
            }
            const localUri = dataSource.settings?.localUri;
            if (!localUri) {
                // no local metadata, assume cap service
                services.push({
                    type: 'cap',
                    name: dataSourceName,
                    path: uniformUrl(dataSource.uri),
                    version: (dataSource.settings?.odataVersion ?? '4.0') as ODataVersionType
                });
                continue;
            }
            const metadataPath = join(webappPath, localUri);
            const metadataUri = pathToFileURL(metadataPath).toString();

            const annotationFiles = getAnnotationFiles(webappPath, dataSource, manifestDataSources);
            services.push({
                type: 'local',
                name: dataSourceName,
                path: uniformUrl(dataSource.uri),
                version: (dataSource.settings?.odataVersion ?? '2.0') as ODataVersionType,
                metadata: {
                    type: 'remote',
                    cacheType: 'local-service',
                    cachePath: metadataPath,
                    relativeBackendPath: `${dataSource.uri}$metadata`,
                    uri: metadataUri
                },
                annotationFiles
            });
        }

        const flexEnabled = getFlexEnabled(manifest);
        const minUI5Version = getMinUI5Version(manifest);
        const parsedManifest: ParsedManifest = {
            manifestUri,
            webappPath,
            flexEnabled,
            minUI5Version,
            customViews,
            appId: manifest['sap.app']?.id ?? '',
            mainServiceName
        };
        return [parsedManifest, services];
    }

    /**
     * Parses an OData service and returns its artifacts (metadata and annotations).
     *
     * @param projectRootPath - The absolute path to the project root
     * @param service - The OData service configuration to parse
     */
    private parseService(
        projectRootPath: string,
        service: FoundODataService
    ): [ServiceArtifacts, V2Annotation[]] | undefined {
        if (service.type === 'cap') {
            const artifacts = CdsAnnotationProvider.getCdsServiceArtifacts(
                projectRootPath,
                service.path,
                this.context.fileCache
            );
            return artifacts ? [artifacts, []] : undefined;
        } else {
            return getXmlServiceArtifacts(
                service.version,
                service.path,
                { uri: service.metadata.uri, isReadOnly: true },
                service.annotationFiles.map((file) => ({ uri: file.uri, isReadOnly: file.type === 'remote' })),
                this.context.fileCache
            );
        }
    }

    /**
     * Checks if the current project is a CAP (Cloud Application Programming) project.
     */
    private isCapProject(): boolean {
        return this.context.projectType === 'CAPJava' || this.context.projectType === 'CAPNodejs';
    }
}

type SapApp = Exclude<Manifest['sap.app'], undefined>;
type DataSources = Exclude<SapApp['dataSources'], undefined>;
type DataSource = DataSources[keyof DataSources];

interface RoutingTarget {
    options?: {
        settings?: {
            entitySet?: string;
            contextPath?: string;
            viewName?: string;
        };
    };
}

/**
 * Retrieves the list of annotation files configured for an OData data source.
 *
 * @param webappPath - The absolute path to the webapp directory
 * @param dataSource - The OData data source configuration
 * @param manifestDataSources - All data sources defined in the manifest
 */
function getAnnotationFiles(
    webappPath: string,
    dataSource: DataSource,
    manifestDataSources: DataSources
): (LocalFile | RemoteFileWithLocalServiceCache)[] {
    const annotationFiles: (LocalFile | RemoteFileWithLocalServiceCache)[] = [];
    for (const id of dataSource.settings?.annotations ?? []) {
        const annotationDataSource = manifestDataSources[id];
        if (annotationDataSource.type !== 'ODataAnnotation') {
            continue;
        }
        const { settings, uri } = annotationDataSource;
        const localUri = settings?.localUri ?? '';
        const filePath = join(webappPath, localUri);
        const annotationFileUri = pathToFileURL(filePath).toString();
        const isReadonly = !(uri && localUri && localUri === uri);
        if (isReadonly) {
            annotationFiles.push({
                type: 'remote',
                cacheType: 'local-service',
                cachePath: filePath,
                relativeBackendPath: uri ?? '',
                uri: annotationFileUri
            });
        } else {
            annotationFiles.push({
                type: 'local',
                uri: annotationFileUri
            });
        }
    }
    return annotationFiles;
}

/**
 * Determines if SAPUI5 flexibility (UI adaptation) is enabled in the manifest.
 *
 * @param manifest - The parsed manifest object
 */
function getFlexEnabled(manifest: Manifest): boolean {
    return manifest['sap.ui5']?.flexEnabled ?? false;
}

/**
 * Extracts and parses the minimum UI5 version required by the application.
 *
 * @param manifest - The parsed manifest object
 */
function getMinUI5Version(manifest: Manifest): MinUI5Version | undefined {
    const value = manifest['sap.ui5']?.dependencies?.minUI5Version;
    if (!value) {
        return undefined;
    }
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (rawValue.startsWith('${') && rawValue.endsWith('}')) {
        // expression, assume latest UI5 version
        return {
            raw: rawValue,
            major: 999,
            minor: 0,
            patch: 0
        };
    }
    const [major, minor, patch] = rawValue.split('.').map((part: string) => Number.parseInt(part, 10));
    return {
        raw: rawValue,
        major: Number.isNaN(major) ? 0 : major,
        minor: Number.isNaN(minor) ? 0 : minor,
        patch: Number.isNaN(patch) ? 0 : patch
    };
}
