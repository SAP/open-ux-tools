import type { ServiceArtifacts } from '@sap-ux/fiori-annotation-api';
import type { ODataVersionType } from '@sap-ux/odata-annotation-core';
import type { Manifest, ProjectType } from '@sap-ux/project-access';
import type { File, DocumentType, RemoteServiceFileWithToolsCache, RemoteFileWithLocalServiceCache } from '../types';
import type { ServiceIndex } from './service';

export interface ParsedProject {
    projectType: ProjectType;
    apps: { [name: string]: ParsedApp };
    documents: { [uri: string]: DocumentType };
}

export interface ParsedApp {
    manifest: ParsedManifest;
    services: { [name: string]: ParsedService };
    /**
     * Prefer using manifest index
     */
    manifestObject: Manifest;
    projectRootPath: string;
}

export interface ParsedManifest {
    webappPath: string;
    manifestUri: string;
    appId: string;
    flexEnabled: boolean;
    customViews: CustomViews;
    minUI5Version?: string;
    mainServiceName: string;
}

export interface ParsedService {
    config: FoundODataService;
    artifacts: ServiceArtifacts;
    index: ServiceIndex;
}

export interface FoundServices {
    [name: string]: FoundODataService;
}

export interface ODataServiceWithLocalCache {
    type: 'local';
    name: string;
    path: string;
    version: ODataVersionType;
    metadata: RemoteServiceFileWithToolsCache | RemoteFileWithLocalServiceCache;
    annotationFiles: File[];
}

export interface CapODataService {
    type: 'cap';
    name: string;
    path: string;
    version: ODataVersionType;
}

export type FoundODataService = ODataServiceWithLocalCache | CapODataService;

export interface AnnotationSource {
    path: string;
}

export interface CustomViews {
    [name: string]: { entitySet?: string; contextPath?: string };
}
