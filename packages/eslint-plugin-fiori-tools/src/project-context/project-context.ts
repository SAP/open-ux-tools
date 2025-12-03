import { existsSync, readFileSync } from 'node:fs';
import path, { dirname, join } from 'node:path';

import { createSyncFn } from 'synckit';
import type { FoundFioriArtifacts, Manifest } from '@sap-ux/project-access';
import type { RawAnnotation, RawMetadata } from '@sap-ux/vocabularies-types';
import { UI_LINE_ITEM } from '../constants';
import { AnnotationFile } from '@sap-ux/odata-annotation-core';
import { XMLDocument } from '@xml-tools/ast';
import { DocumentNode } from '@humanwhocodes/momoa';
import { buildIndex, ProjectIndex } from './facets';
import { AnnotationIndex, buildAnnotationIndexKey, IndexedAnnotation, ServiceIndex } from './facets/services';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Sync function for worker calls
let annotationWorker: (file: string) => [RawMetadata, Manifest];
let artifactWorker: (file: string) => FoundFioriArtifacts;

/**
 *
 * @returns
 */
function getWorkerPath(name: string): string {
    // Create sync function to call the working draft-toggle-worker
    const currentDir = __dirname; //path.dirname(fileURLToPath(import.meta.url));

    // Try multiple possible worker locations
    const workerPaths = [
        path.join(currentDir, name) // src location
    ];

    let workerPath = null;
    for (const tryPath of workerPaths) {
        if (existsSync(tryPath)) {
            workerPath = tryPath;
            break;
        }
    }

    if (!workerPath) {
        throw new Error(`Worker not found in any expected location: ${workerPaths.join(', ')}`);
    }

    return workerPath;
}

/**
 *
 * @returns
 */
function getAnnotationWorker(): (file: string) => [RawMetadata, Manifest] {
    if (annotationWorker) {
        return annotationWorker;
    }
    const workerPath = getWorkerPath('worker.js');

    annotationWorker = createSyncFn(workerPath, { timeout: 10000 });
    return annotationWorker;
}

/**
 *
 * @returns
 */
function getArtifactWorker(): (file: string) => FoundFioriArtifacts {
    if (artifactWorker) {
        return artifactWorker;
    }
    const workerPath = getWorkerPath('artifacts.js');

    artifactWorker = createSyncFn(workerPath, { timeout: 10000 });

    return artifactWorker;
}

export type DocumentType = AnnotationFile | XMLDocument | DocumentNode;

// export interface ProjectContextFacetOptions {
//     manifest: boolean;
//     annotations: boolean;
// }

/**
 *
 */
export class ProjectContext {
    // public manifest: Manifest;
    // public readonly metadata: RawMetadata;
    public index: ProjectIndex;
    public readonly documents: Record<string, DocumentType> = {};

    /**
     *
     * @param index
     */
    private constructor(index: ProjectIndex) {
        this.index = index;
    }

    public getIndexedServiceForMainService(app?: string): ServiceIndex | undefined {
        const key = app ? app : Object.keys(this.index.apps)[0];
        const appIndex = this.index.apps[key];
        if (!appIndex) {
            return;
        }
        const serviceName = appIndex.manifest.mainServiceName;
        const servicePath = appIndex.manifest.services[serviceName]?.path;
        return this.index.services[servicePath];
    }

    public getManifest(app?: string): Manifest | undefined {
        const key = app ? app : Object.keys(this.index.apps)[0];
        const appIndex = this.index.apps[key];
        if (!appIndex) {
            return;
        }
        return appIndex.manifestObject;
    }
    /**
     *
     * @param target
     * @returns
     */
    public getLineItems(target: string): IndexedAnnotation | undefined {
        return undefined;
        // const key = buildKey(target, UI_LINE_ITEM);
        // return this.index[key];
    }

    public lookupAnnotation(target: string, term: string, qualifier?: string): IndexedAnnotation | undefined {
        const key = buildAnnotationIndexKey(target, term);
        return undefined;
        // const byTarget = this.index[key];
        // if (!byTarget) {
        //     return undefined;
        // }
        // const qualifierKey = qualifier ?? 'undefined';
        // return byTarget[qualifierKey];
    }

    /**
     * Project file mapping to artifacts. Used to find out to which project the file belongs.
     * It should only be used by `findProjectRoot` method.
     */
    private static projectArtifactCache = new Map<string, FoundFioriArtifacts>();

    private static findFioriArtifacts(uri: string): FoundFioriArtifacts {
        const filePath = fileURLToPath(uri); // TODO: handle windows paths with mismatching drive letters
        try {
            const cachedValue = this.projectArtifactCache.get(uri);
            if (cachedValue) {
                return cachedValue;
            }
            const artifacts = getArtifactWorker()(filePath);
            this.projectArtifactCache.set(filePath, artifacts);
            return artifacts;
        } catch {
            return {};
        }
    }

    private static instanceCache = new Map<string, ProjectContext>();
    private static updateCache = new Map<string, number>();

    /**
     * Creates a ProjectContext for the given file path.
     *
     * @param path - The file path.
     * @returns A ProjectContext instance.
     */
    public static getInstanceForFile(uri: string): ProjectContext {
        const cachedValue = this.instanceCache.get(uri);
        if (cachedValue) {
            return cachedValue;
        }
        return this.createForFile(uri);
    }

    public static updateFile(uri: string, content: string): ProjectContext {
        this.fileCache.set(uri, content);
        const numberOfUpdates = this.updateCache.get(uri) ?? 0;
        this.updateCache.set(uri, numberOfUpdates + 1);
        const context = this.getInstanceForFile(uri);
        if (numberOfUpdates === 0) {
            // assume that first time check is called the file content is the same as in file system/cache
            return context;
        }

        context.index = buildIndex(this.findFioriArtifacts(uri), this.fileCacheProxy);
        return context;
    }
    private static fileCache = new Map<string, string>();
    private static fileCacheProxy = new Proxy(this.fileCache, {
        get: (target, prop: string) => {
            if (prop === 'get') {
                return (key: string): string | undefined => {
                    if (this.fileCache.has(key)) {
                        return this.fileCache.get(key);
                    }
                    // const content = artifacts.files?.[key];
                    // if (content) {
                    //     this.fileCache.set(key, content);
                    //     return content;
                    // }
                    try {
                        const path = fileURLToPath(key); // TODO: handle windows paths with mismatching drive letters
                        const content = readFileSync(path, 'utf-8');
                        this.fileCache.set(key, content);
                        return content;
                    } catch {
                        return undefined;
                    }
                    // return target.get(key);
                };
            }
            // const content = artifacts.files?.[prop];
            // if (content) {
            //     target.set(prop, content);
            //     return content;
            // }
            // return target[prop] as any;
        }
    });

    /**
     * Creates a ProjectContext for the given file path.
     *
     * @param path - The file path.
     * @returns A ProjectContext instance.
     */
    private static createForFile(uri: string): ProjectContext {
        // TODO: handle other entry points
        // assume path is to manifest.json
        const artifacts = this.findFioriArtifacts(uri);

        const index = buildIndex(artifacts, this.fileCacheProxy);
        const context = new ProjectContext(index);
        for (const uri of Object.keys(index.documents)) {
            this.instanceCache.set(uri, context);
        }
        // const service = getMainService(manifest);
        // if (service) {
        //     const appRoot = dirname(path);

        //     const annotationPaths = getLocalAnnotationsForService(manifest, service, appRoot);
        //     for (const annotationPath of annotationPaths) {
        //         this.instanceCache.set(annotationPath, context);
        //     }

        //     const metadataPath = getLocalMetadataForService(manifest, service, appRoot);
        //     if (metadataPath) {
        //         this.instanceCache.set(metadataPath, context);
        //     }
        // } else {
        //     // TODO: log error
        // }
        return context;
    }
}
