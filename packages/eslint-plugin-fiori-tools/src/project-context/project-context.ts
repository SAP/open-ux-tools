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
 *
 * @param name
 * @returns
 */
function getWorkerPath(name: string): string {
    // Create sync function to call the working draft-toggle-worker
    const currentDir = __dirname;

    // Try multiple possible worker locations
    const workerPaths = [
        join(currentDir, name) // src location
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
 *
 */
export class ProjectContext {
    private artifacts: FoundFioriArtifacts;
    private _index: ParsedProject;

    /**
     *
     */
    public get index(): ParsedProject {
        return this._index;
    }
    private _linkedModel: LinkedModel;
    /**
     *
     */
    public get linkedModel(): LinkedModel {
        return this._linkedModel;
    }

    public readonly documents: Record<string, DocumentType> = {};

    /**
     *
     * @param artifacts
     * @param index
     * @param linkedModel
     */
    private constructor(artifacts: FoundFioriArtifacts, index: ParsedProject, linkedModel: LinkedModel) {
        this._index = index;
        this._linkedModel = linkedModel;
        this.artifacts = artifacts;
    }

    /**
     *
     * @param appIndex
     * @param serviceName
     */
    public getIndexedServiceForMainService(appIndex: ParsedApp, serviceName?: string): ParsedService | undefined {
        const name = serviceName ?? appIndex.manifest.mainServiceName;
        return appIndex.services[name];
    }

    /**
     *
     * @param app
     */
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
     * @param uri
     * @param content
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

    private static parser = new ApplicationParser();
    /**
     * Project file mapping to artifacts. Used to find out to which project the file belongs.
     * It should only be used by `findProjectRoot` method.
     */
    private static projectArtifactCache = new Map<string, WorkerResult>();

    /**
     *
     * @param _uri
     */
    private static findFioriArtifacts(_uri: string): WorkerResult {
        // potential issue when called from application modeler or via ESLint API
        const root = normalizePath(process.cwd()); // TODO: check if root detection is needed? seems to work also with workspaces
        try {
            const cachedValue = this.projectArtifactCache.get(root);
            if (cachedValue) {
                return cachedValue;
            }
            const artifacts = getArtifactWorker()(root);
            this.projectArtifactCache.set(root, artifacts);
            return artifacts;
        } catch {
            return { artifacts: {}, projectType: 'EDMXBackend' };
        }
    }

    private static instanceCache = new Map<string, ProjectContext>();
    private static updateCache = new Map<string, number>();
    private static appRoots = new Set<string>();

    /**
     * Creates a ProjectContext for the given file path.
     *
     * @param uri
     * @returns A ProjectContext instance.
     */
    public static getInstanceForFile(uri: string): ProjectContext {
        const cachedValue = this.instanceCache.get(uri);
        if (cachedValue) {
            return cachedValue;
        }
        return this.createForFile(uri);
    }

    /**
     *
     * @param uri
     * @param content
     */
    public static updateFile(uri: string, content: string): ProjectContext {
        this.fileCache.set(uri, content);
        const numberOfUpdates = this.updateCache.get(uri) ?? 0;
        this.updateCache.set(uri, numberOfUpdates + 1);
        const context = this.getInstanceForFile(uri);
        console.log('ProjectContext.updateFile - updates for', uri, ':', numberOfUpdates + 1);
        if (numberOfUpdates === 0) {
            // assume that first time check is called the file content is the same as in file system/cache
            return context;
        }

        context.reindex(uri, content);

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
     * Creates a ProjectContext for the given file path.
     *
     * @param uri
     * @returns A ProjectContext instance.
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
