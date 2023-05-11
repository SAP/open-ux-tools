import type { Manifest } from '../webapp';

export type FioriArtifactTypes = 'applications' | 'adaptations' | 'extensions' | 'libraries';

export interface AllAppResults {
    appRoot: string;
    projectRoot: string;
    manifestPath: string;
    manifest: Manifest;
}

export interface AllAdaptationResults {
    appRoot: string;
}

export interface AllExtensionResults {
    appRoot: string;
}

export interface AllLibraryResults {
    manifestPath: string;
    manifest: Manifest;
}

export interface FoundFioriArtifacts {
    applications?: AllAppResults[];
    adaptations?: AllAdaptationResults[];
    extensions?: AllExtensionResults[];
    libraries?: AllLibraryResults[];
}
