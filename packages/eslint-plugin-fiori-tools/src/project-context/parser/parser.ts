import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseJson } from '@humanwhocodes/momoa';

import type { FoundFioriArtifacts, Manifest, ProjectType } from '@sap-ux/project-access';
import { getMainService } from '@sap-ux/project-access';
import { CdsAnnotationProvider, getXmlServiceArtifacts, type ServiceArtifacts } from '@sap-ux/fiori-annotation-api';

import type { LocalFile, RemoteFileWithLocalServiceCache } from '../types';
import { uniformUrl } from '../utils';
import type { Diagnostic } from '../../language/diagnostics';
import { buildServiceIndex } from './service';
import type { ParsedProject, ParsedApp, ParsedManifest, FoundODataService, CustomViews, MinUI5Version } from './types';

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
     *
     * @param projectType
     * @param fileCache
     */
    private reset(projectType: ProjectType, fileCache: Map<string, string>) {
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
                const parsedApp: ParsedApp = {
                    manifest: parsedManifest,
                    manifestObject: manifest,
                    projectRootPath: app.projectRoot,
                    services: {}
                };
                this.index.apps[appRootUri] = parsedApp;

                for (const service of services) {
                    const artifacts = this.parseService(app.projectRoot, service);
                    if (artifacts) {
                        const index = buildServiceIndex(artifacts, this.index.documents);
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
     *
     * @param uri
     * @param index
     * @param fileCache
     */
    public reparse(uri: string, index: ParsedProject, fileCache: Map<string, string>): ParseResult {
        this.reset(index.projectType, fileCache);
        if (uri.endsWith('.cds')) {
            // there is assumption that only one eslint config exists in CAP project and its run for the whole project
            const projectRoot = index.apps[Object.keys(index.apps)[0]]?.projectRootPath;
            if (projectRoot) {
                CdsAnnotationProvider.resetCache(projectRoot, fileCache);
            }
            for (const app of Object.values(index.apps)) {
                for (const service of Object.values(app.services)) {
                    if (service.config.type === 'cap') {
                        const artifacts = this.parseService(app.projectRootPath, service.config);
                        if (artifacts) {
                            const serviceIndex = buildServiceIndex(artifacts, index.documents);
                            service.artifacts = artifacts;
                            service.index = serviceIndex;
                        }
                    }
                }
            }
        } else if (uri.endsWith('manifest.json')) {
            for (const [key, previousApp] of Object.entries(index.apps)) {
                if (previousApp.manifest.manifestUri === uri) {
                    const manifestContent = fileCache.get(uri) ?? '';
                    const manifestAst = parseJson(manifestContent, {
                        mode: 'json',
                        ranges: true,
                        tokens: true,
                        allowTrailingCommas: false
                    });
                    index.documents[uri] = manifestAst;
                    const manifest = JSON.parse(manifestContent) as Manifest;
                    const webappPath = dirname(new URL(uri).pathname);
                    const [parsedManifest, services] = this.parseManifest(webappPath, uri, manifest);
                    index.documents[uri] = manifestAst;

                    const parsedApp: ParsedApp = {
                        manifest: parsedManifest,
                        manifestObject: manifest,
                        projectRootPath: previousApp.projectRootPath,
                        services: {}
                    };

                    const previouslyFoundServices = [...Object.values(previousApp.services)].map(
                        (service) => service.config
                    );
                    if (JSON.stringify(previouslyFoundServices) !== JSON.stringify(services)) {
                        // TODO: consider using more sophisticated algorithm like in XML Annotation LSP
                        // services have changed, reset existing services
                        parsedApp.services = {};
                        for (const service of services) {
                            const artifacts = this.parseService(parsedApp.projectRootPath, service);
                            if (artifacts) {
                                const serviceIndex = buildServiceIndex(artifacts, index.documents);
                                parsedApp.services[service.name] = { config: service, artifacts, index: serviceIndex };
                            }
                        }
                    } else {
                        // keep existing services
                        parsedApp.services = previousApp.services;
                    }
                    index.apps[key] = parsedApp;
                    break;
                }
            }
        } else if (uri.endsWith('.xml')) {
            for (const app of Object.values(index.apps)) {
                for (const service of Object.values(app.services)) {
                    if (service.config.type === 'local') {
                        const annotationFile = service.config.annotationFiles.find((file) => file.uri === uri);
                        if (annotationFile) {
                            const artifacts = this.parseService(app.projectRootPath, service.config);
                            if (artifacts) {
                                const serviceIndex = buildServiceIndex(artifacts, index.documents);
                                service.artifacts = artifacts;
                                service.index = serviceIndex;
                            }
                            break;
                        }
                    }
                }
            }
        }
        return { index: index, diagnostics: [] };
    }

    /**
     *
     * @param webappPath
     * @param manifestUri
     * @param manifest
     */
    private parseManifest(
        webappPath: string,
        manifestUri: string,
        manifest: Manifest
    ): [ParsedManifest, FoundODataService[]] {
        const customViews: CustomViews = {};
        const services: FoundODataService[] = [];
        const targets = manifest['sap.ui5']?.routing?.targets;
        for (const [, target] of Object.entries(targets ?? {})) {
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
                    version: dataSource.settings?.odataVersion ?? '2.0'
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
                version: dataSource.settings?.odataVersion ?? '2.0',
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
     *
     * @param projectRootPath
     * @param service
     */
    private parseService(projectRootPath: string, service: FoundODataService): ServiceArtifacts | undefined {
        if (service.type === 'cap') {
            return CdsAnnotationProvider.getCdsServiceArtifacts(projectRootPath, service.path, this.context.fileCache);
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
     *
     */
    private isCapProject(): boolean {
        return this.context.projectType === 'CAPJava' || this.context.projectType === 'CAPNodejs';
    }
}

type DataSources = Exclude<Manifest['sap.app']['dataSources'], undefined>;
type DataSource = DataSources[keyof DataSources];

/**
 *
 * @param webappPath
 * @param dataSource
 * @param manifestDataSources
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
                relativeBackendPath: uri,
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
 *
 * @param manifest
 */
function getFlexEnabled(manifest: Manifest): boolean {
    return manifest['sap.ui5']?.flexEnabled ?? false;
}

/**
 *
 * @param manifest
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
    const [major, minor, patch] = rawValue.split('.').map((part) => parseInt(part, 10));
    return {
        raw: rawValue,
        major: Number.isNaN(major) ? 0 : major,
        minor: Number.isNaN(minor) ? 0 : minor,
        patch: Number.isNaN(patch) ? 0 : patch
    };
}
