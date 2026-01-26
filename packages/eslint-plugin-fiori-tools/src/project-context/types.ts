import type { XMLDocument } from '@xml-tools/ast';
import type { AnnotationFile } from '@sap-ux/odata-annotation-core';
import type { DocumentNode } from '@humanwhocodes/momoa';
import type { FoundFioriArtifacts, ProjectType } from '@sap-ux/project-access';

export interface RemoteSourceFileWithToolsCache {
    type: 'remote';
    cacheType: 'fiori-tools';
    kind: 'source';
    backendUrl: string;
    cachePath: string;
    uri: string;
}

export interface RemoteServiceFileWithToolsCache {
    type: 'remote';
    cacheType: 'fiori-tools';
    kind: 'service';
    backendUrl: string;
    relativeBackendPath: string;
    cachePath: string;
    uri: string;
}

export type RemoteFileWithToolsCache = RemoteSourceFileWithToolsCache | RemoteServiceFileWithToolsCache;

export interface RemoteFileWithLocalServiceCache {
    type: 'remote';
    cacheType: 'local-service';
    relativeBackendPath: string;
    cachePath: string;
    uri: string;
}

export interface LocalFile {
    type: 'local';
    uri: string;
}

export type RemoteFile = RemoteFileWithToolsCache | RemoteFileWithLocalServiceCache;
export type File = RemoteFile | LocalFile;

export type DocumentType = AnnotationFile | XMLDocument | DocumentNode;

export interface WorkerResult {
    artifacts: FoundFioriArtifacts;
    projectType: ProjectType;
}
