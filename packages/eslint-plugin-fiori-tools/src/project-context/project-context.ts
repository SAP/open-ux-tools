import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSyncFn } from 'synckit';
import type { DocumentNode } from '@humanwhocodes/momoa';

import { normalizePath, type FoundFioriArtifacts, type Manifest } from '@sap-ux/project-access';
import type { AnnotationFile } from '@sap-ux/odata-annotation-core';
import type { XMLDocument } from '@xml-tools/ast';

import type { WorkerResult } from './types';
import type { ParsedApp, ParsedProject, ParsedService } from './parser';
import { ApplicationParser } from './parser';
import { DiagnosticCache } from '../language/diagnostic-cache';
import type { LinkedModel } from './linker';
import { linkProject } from './linker';

// Sync function for worker calls
let artifactWorker: (file: string) => WorkerResult;

/**
 * Gets the file system path to the worker script.
 * 
 * @param name - The name of the worker file
 * @returns The absolute path to the worker file
 */
function getWorkerPath(name: string): string {
    // Create sync function to call the working draft-toggle-worker
    const currentDir = __dirname;

    // Try multiple possible worker locations
    const workerPaths = [
        join(currentDir, name), // src location
        join(currentDir, '..', '..', 'lib', 'project-context', name) // dist location
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
 * Gets or creates the artifact worker instance for finding Fiori artifacts.
 * 
 * @returns A synchronous function that takes a file path and returns worker results
 */
function getArtifactWorker(): (file: string) => WorkerResult {
    if (artifactWorker) {
        return artifactWorker;
    }
    const workerPath = getWorkerPath('artifacts.js');

    artifactWorker = createSyncFn(workerPath, { timeout: 10000 });

    return artifactWorker;
}

export type DocumentType = AnnotationFile | XMLDocument | DocumentNode;

/**
 * Manages the project context including parsed artifacts, indexes, and linked models.
 * Provides access to project structure, manifests, and services.
 */
export class ProjectContext {
    private readonly artifacts: FoundFioriArtifacts;
    private readonly _index: ParsedProject;

    /**
     * Gets the parsed project index containing all project information.
     */
    public get index(): ParsedProject {
        return this._index;
    }
    private _linkedModel: LinkedModel;
    /**
     * Gets the linked model containing resolved references between project entities.
     */
    public get linkedModel(): LinkedModel {
        return this._linkedModel;
    }

    public readonly documents: Record<string, DocumentType> = {};

    /**
     * Creates a new ProjectContext instance.
     * 
     * @param artifacts - The found Fiori artifacts in the project
     * @param index - The parsed project index
     * @param linkedModel - The linked model with resolved references
     */
    private constructor(artifacts: FoundFioriArtifacts, index: ParsedProject, linkedModel: LinkedModel) {
        this._index = index;
        this._linkedModel = linkedModel;
        this.artifacts = artifacts;
    }

    /**
     * Gets the indexed service for the main service of an application.
     * 
     * @param appIndex - The parsed application index
     * @param serviceName - Optional service name, defaults to the main service name from manifest
     * @returns The parsed service or undefined if not found
     */
    public getIndexedServiceForMainService(appIndex: ParsedApp, serviceName?: string): ParsedService | undefined {
        const name = serviceName ?? appIndex.manifest.mainServiceName;
        return appIndex.services[name];
    }

    /**
     * Gets the manifest for a specific application.
     * 
     * @param app - Optional application key, defaults to the first application in the index
     * @returns The manifest object or undefined if not found
     */
    public getManifest(app?: string): Manifest | undefined {
        const key = app ?? Object.keys(this.index.apps)[0];
        const appIndex = this.index.apps[key];
        if (!appIndex) {
            return;
        }
        return appIndex.manifestObject;
    }

    /**
     * Re-indexes the project after a file has been updated.
     * 
     * @param uri - The URI of the file to reindex
     * @param content - The updated content of the file
     */
    public reindex(uri: string, content: string): void {
        ProjectContext.fileCache.set(uri, content);
        const { diagnostics, index } = ProjectContext.parser.reparse(uri, this.index, ProjectContext.fileCacheProxy);

        for (const diagnostic of diagnostics) {
            DiagnosticCache.addMessage(diagnostic.type, diagnostic);
        }

        const [linkedModel, linkerDiagnostics] = linkProject(index);

        for (const diagnostic of linkerDiagnostics) {
            DiagnosticCache.addMessage(diagnostic.type, diagnostic);
        }

        this._linkedModel = linkedModel;
    }

    private static readonly parser = new ApplicationParser();
    /**
     * Project file mapping to artifacts. Used to find out to which project the file belongs.
     * It should only be used by `findProjectRoot` method.
     */
    private static readonly projectArtifactCache = new Map<string, WorkerResult>();

    /**
     * Finds Fiori artifacts in the project using a worker process.
     * 
     * @param _uri - The URI to start searching from (currently unused, uses process.cwd())
     * @returns The worker result containing found artifacts and project type
     */
    private static findFioriArtifacts(_uri: string): WorkerResult {
        // potential issue when called from application modeler or via ESLint API
        const root = normalizePath(process.cwd());
        try {
            const cachedValue = this.projectArtifactCache.get(root);
            if (cachedValue) {
                return cachedValue;
            }
            const artifacts = getArtifactWorker()(root);
            this.projectArtifactCache.set(root, artifacts);
            return artifacts;
        } catch (error) {
            console.error('Error finding Fiori artifacts:', error);
            return { artifacts: {}, projectType: 'EDMXBackend' };
        }
    }

    private static readonly instanceCache = new Map<string, ProjectContext>();
    private static readonly updateCache = new Map<string, number>();
    private static readonly appRoots = new Set<string>();

    /**
     * If set to true, forces re-indexing on the first update of a file.
     */
    public static forceReindexOnFirstUpdate = false; // NOSONAR - Property must be mutable for test setup

    /**
     * Creates a ProjectContext for the given file path.
     *
     * @param uri - The URI of the file to get the context for
     * @returns A ProjectContext instance
     */
    public static getInstanceForFile(uri: string): ProjectContext {
        const cachedValue = this.instanceCache.get(uri);
        if (cachedValue) {
            return cachedValue;
        }
        return this.createForFile(uri);
    }

    /**
     * Updates a file in the cache and triggers re-indexing if necessary.
     * 
     * @param uri - The URI of the file to update
     * @param content - The new content of the file
     * @returns The ProjectContext instance for the file
     */
    public static updateFile(uri: string, content: string): ProjectContext {
        this.fileCache.set(uri, content);
        const numberOfUpdates = this.updateCache.get(uri) ?? 0;
        this.updateCache.set(uri, numberOfUpdates + 1);
        const context = this.getInstanceForFile(uri);
        if (numberOfUpdates === 0 && !this.forceReindexOnFirstUpdate) {
            // assume that first time check is called the file content is the same as in file system/cache
            return context;
        }

        context.reindex(uri, content);

        return context;
    }
    private static readonly fileCache = new Map<string, string>();
    private static readonly fileCacheProxy = new Proxy(this.fileCache, {
        get: (target, prop: string) => {
            if (prop === 'get') {
                return (key: string): string | undefined => {
                    if (this.fileCache.has(key)) {
                        return this.fileCache.get(key);
                    }
                    try {
                        const path = fileURLToPath(key);
                        const content = readFileSync(path, 'utf-8');
                        this.fileCache.set(key, content);
                        return content;
                    } catch {
                        return undefined;
                    }
                };
            }
        }
    });

    /**
     * Creates a ProjectContext for the given file path by parsing artifacts and building indexes.
     *
     * @param uri - The URI of the file to create the context for
     * @returns A new ProjectContext instance
     */
    private static createForFile(uri: string): ProjectContext {
        // not all project files might be indexed, but eslint still will pick it up
        // try to assign the file to the closest known app root and avoid re-indexing
        for (const appRoot of this.appRoots.values()) {
            if (uri.startsWith(appRoot)) {
                const cachedValue = this.instanceCache.get(appRoot);
                if (cachedValue) {
                    this.instanceCache.set(uri, cachedValue);
                    return cachedValue;
                }
            }
        }

        if (this.appRoots.size > 0) {
            // uri not is part of the known apps
            // no point trying to reindex
            return new ProjectContext({}, { projectType: 'EDMXBackend', apps: {}, documents: {} }, { apps: {} });
        }

        const { artifacts, projectType } = this.findFioriArtifacts(uri);

        const { diagnostics, index } = this.parser.parse(projectType, artifacts, this.fileCacheProxy);

        for (const diagnostic of diagnostics) {
            DiagnosticCache.addMessage(diagnostic.type, diagnostic);
        }

        const [linkedModel, linkerDiagnostics] = linkProject(index);

        for (const diagnostic of linkerDiagnostics) {
            DiagnosticCache.addMessage(diagnostic.type, diagnostic);
        }

        const context = new ProjectContext(artifacts, index, linkedModel);
        for (const uri of Object.keys(index.documents)) {
            this.instanceCache.set(uri, context);
        }
        for (const appRoot of Object.keys(index.apps)) {
            this.instanceCache.set(appRoot, context);
            this.appRoots.add(appRoot);
        }
        return context;
    }
}
