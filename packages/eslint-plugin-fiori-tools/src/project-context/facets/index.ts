import { pathToFileURL } from 'node:url';
import type { FoundFioriArtifacts, Manifest } from '@sap-ux/project-access';
import { parse } from '@humanwhocodes/momoa';

import { DocumentType } from '../types';
import type { IndexedManifest } from './manifest';
import { indexManifest } from './manifest';
import { indexCachedService, type ServiceIndex } from './services';

export interface ProjectIndex {
    apps: { [name: string]: AppIndex };
    services: { [name: string]: ServiceIndex };
    documents: { [filePath: string]: DocumentType };
}

export interface AppIndex {
    manifest: IndexedManifest;
    /**
     * Prefer using manifest index
     */
    manifestObject: Manifest;
}

/**
 *
 * @param artifacts
 */
export function buildIndex(artifacts: FoundFioriArtifacts, fileCache: Map<string, string>): ProjectIndex {
    const index: ProjectIndex = { apps: {}, services: {}, documents: {} };
    for (const app of artifacts.applications ?? []) {
        try {
            const manifestUri = pathToFileURL(app.manifestPath).toString(); // TODO: handle windows paths
            const manifestContent = fileCache.get(manifestUri) ?? '';
            const manifestAst = parse(manifestContent, {
                mode: 'json',
                ranges: true,
                tokens: true,
                allowTrailingCommas: false
            });
            index.documents[manifestUri] = manifestAst;
            const manifest = JSON.parse(manifestContent) as Manifest;
            const manifestIndex = indexManifest(app.manifestPath, manifest);
            index.apps[app.appRoot] = { manifest: manifestIndex, manifestObject: manifest };
            for (const [, service] of Object.entries(manifestIndex.services)) {
                if (service.metadata) {
                    const indexedService = indexCachedService(service, index.documents, fileCache);
                    index.services[indexedService.path] = indexedService;
                }
            }
        } catch {}
    }

    return index;
}
