import type { ManifestNamespace } from '../webapp';

export type AppProgrammingLanguage = 'JavaScript' | 'TypeScript' | '';

export interface Project {
    root: string;
    apps: { [index: string]: ApplicationStructure };
    type: 'Cap' | 'Edmx'; // backward compatibility, please use detailedType
    detailedType: DetailedProjectType;
}

export interface ApplicationStructure {
    appRoot: string;
    projectRelative: string;
    manifest: string;
    changes: string;
    mainService: string;
    services: { [index: string]: ServiceSpecification };
    annotations?: { [serviceIndex: string]: string[] };
}

export interface ServiceSpecification {
    uri?: string;
    local?: string;
    odataVersion?: ManifestNamespace.Setting['odataVersion'];
    annotations?: {
        uri?: string;
        local?: string;
    };
}

export type DetailedProjectType = 'EDMX Backend' | 'CAP Node.js' | 'CAP Java';
