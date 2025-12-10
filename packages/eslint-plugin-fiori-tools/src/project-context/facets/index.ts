import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type FoundFioriArtifacts, type Manifest } from '@sap-ux/project-access';
import { parse } from '@humanwhocodes/momoa';

import { DocumentType } from '../types';
import type { IndexedManifest } from './manifest';
import { indexManifest } from './manifest';
import { indexCachedServiceWithLocalData, indexCdsService, reIndexCdsService, type ServiceIndex } from './services';

export interface ProjectIndex {
    apps: { [name: string]: AppIndex };
    services: { [name: string]: ServiceIndex };
    documents: { [uri: string]: DocumentType };
}

export interface AppIndex {
    manifest: IndexedManifest;
    /**
     * Prefer using manifest index
     */
    manifestObject: Manifest;
    projectRootPath: string;
}

/**
 *
 * @param artifacts
 */
export function buildIndex(
    artifacts: FoundFioriArtifacts,
    fileCache: Map<string, string>,
    invalidateCdsCache = false
): ProjectIndex {
    performance.mark('project-index-build-start');
    const index: ProjectIndex = { apps: {}, services: {}, documents: {} };
    const serviceRoots = new Set<string>();
    for (const app of artifacts.applications ?? []) {
        try {
            const manifestUri = pathToFileURL(app.manifestPath).toString();
            const manifestContent = fileCache.get(manifestUri) ?? '';
            const manifestAst = parse(manifestContent, {
                mode: 'json',
                ranges: true,
                tokens: true,
                allowTrailingCommas: false
            });
            index.documents[manifestUri] = manifestAst;
            const manifest = JSON.parse(manifestContent) as Manifest;
            const webappPath = dirname(app.manifestPath);
            const manifestIndex = indexManifest(webappPath, manifestUri, manifest);
            const appRootUri = pathToFileURL(app.appRoot).toString();
            index.apps[appRootUri] = {
                manifest: manifestIndex,
                manifestObject: manifest,
                projectRootPath: app.projectRoot
            };
            for (const [, service] of Object.entries(manifestIndex.services)) {
                const indexedService = indexCachedServiceWithLocalData(
                    app.projectRoot,
                    service,
                    index.documents,
                    fileCache
                );
                if (service.metadata === undefined) {
                    // assume cap service
                    serviceRoots.add(app.projectRoot);
                }
                if (indexedService) {
                    index.services[indexedService.path] = indexedService;
                }
            }
        } catch {}
    }

    for (const projectRoot of serviceRoots.values()) {
        const services = indexCdsService(projectRoot, index.documents, fileCache, invalidateCdsCache);
        for (const service of services) {
            index.services[service.path] = service;
        }
    }

    performance.mark('project-index-build-end');
    performance.measure('project-index-build', 'project-index-build-start', 'project-index-build-end');
    console.log('ProjectContext.buildIndex - index built', performance.getEntriesByName('project-index-build'));
    performance.clearMarks();
    performance.clearMeasures();
    return index;
}

export function reindex(
    uri: string,
    index: ProjectIndex,
    artifacts: FoundFioriArtifacts,
    fileCache: Map<string, string>
): void {
    performance.mark('project-reindex-build-start');

    if (uri.endsWith('.cds')) {
        console.log('Re-indexing CDS file:', uri);
        const newIndex: { [name: string]: ServiceIndex } = {};
        const servicesToUpdate: ServiceIndex[] = [];
        const updatedRoots = new Set<string>();
        for (const [path, service] of Object.entries(index.services)) {
            if (service.sourceKind === 'local-cap') {
                servicesToUpdate.push(service);
            } else {
                newIndex[path] = service;
            }
        }
        for (const service of servicesToUpdate) {
            if (updatedRoots.has(service.projectRoot)) {
                continue;
            }
            console.log('Re-indexing CDS service for project root:', service.projectRoot);
            updatedRoots.add(service.projectRoot);
            const services = reIndexCdsService(uri, service, index.documents, fileCache, true);
            for (const service of services) {
                newIndex[service.path] = service;
            }
        }
        console.log('Re-indexed CDS services:', Object.keys(newIndex));
        index.services = newIndex;
        return;
    }

    for (const [appRootUri, app] of Object.entries(index.apps)) {
        if (uri.startsWith(appRootUri)) {
            try {
                const manifestUri = app.manifest.manifestUri;
                let manifestIndex = app.manifest;
                if (manifestUri === uri) {
                    const manifestContent = fileCache.get(manifestUri) ?? '';
                    const manifestAst = parse(manifestContent, {
                        mode: 'json',
                        ranges: true,
                        tokens: true,
                        allowTrailingCommas: false
                    });
                    index.documents[manifestUri] = manifestAst;
                    const manifest = JSON.parse(manifestContent) as Manifest;

                    manifestIndex = indexManifest(app.manifest.webappPath, manifestUri, manifest);
                    index.apps[appRootUri] = {
                        manifest: manifestIndex,
                        manifestObject: manifest,
                        projectRootPath: app.projectRootPath
                    };
                }
                for (const [, service] of Object.entries(manifestIndex.services)) {
                    const indexedService = indexCachedServiceWithLocalData(
                        app.projectRootPath,
                        service,
                        index.documents,
                        fileCache
                    );
                    if (indexedService) {
                        index.services[indexedService.path] = indexedService;
                    }
                }
            } catch {}
        }
    }

    performance.mark('project-reindex-build-end');
    performance.measure('project-reindex-build', 'project-reindex-build-start', 'project-reindex-build-end');
    console.log('reindex', performance.getEntriesByName('project-reindex-build'));
    performance.clearMarks();
    performance.clearMeasures();
}
