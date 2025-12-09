import type { ManifestNamespace } from '@sap-ux/project-access';
import type { FioriToolsProxyConfigBackend as ProxyBackend } from '@sap-ux/ui5-config';
import type { ExternalService } from '@sap-ux/axios-extension';

export interface ExternalServiceCollectionOptions {
    valueListReferences: boolean;
    codeLists: boolean;
}

export enum OdataVersion {
    v2 = '2',
    v4 = '4'
}

export interface NamespaceAlias {
    namespace: string;
    alias: string;
}

export enum ServiceType {
    EDMX = 'edmx',
    CDS = 'cds'
}

/**
 * Interface representing information for EDMX annotations.
 */
export interface EdmxAnnotationsInfo {
    /**
     * Optional name for the annotations.
     */
    name?: string;
    /**
     * Technical name of the annotations.
     */
    technicalName: string;
    /**
     * XML content of the annotations.
     */
    xml: string;
}

/**
 * Interface representing information for CDS annotations.
 */
export interface CdsAnnotationsInfo {
    /**
     * The contents to be written into the annotation cds file.
     */
    cdsFileContents: string;
    /**
     * The path to the cap project.
     */
    projectPath: string;
    /**
     * The relative path to the app folder within the cap project.
     */
    appPath: string;
    /**
     * The name of the project.
     */
    projectName: string;
}

export interface OdataService {
    url?: string;
    client?: string;
    destination?: {
        name: string;
        instance?: string;
    };
    type?: ServiceType;
    path?: string;
    version: OdataVersion;
    name?: string;
    model?: string;
    metadata?: string;
    externalServices?: ExternalService[];
    /**
     * Annotations can either be EDMX annotations or CDS annotations.
     */
    annotations?: EdmxAnnotationsInfo | EdmxAnnotationsInfo[] | CdsAnnotationsInfo | CdsAnnotationsInfo[];
    localAnnotationsName?: string | string[]; // The name or names used in the manifest.json and as the filenames for local annotations
    previewSettings?: Partial<ProxyBackend>;
    /**
     * Indicates whether certificate errors should be ignored.
     */
    ignoreCertError?: boolean;
}

export type EdmxOdataService = Omit<OdataService, 'annotations'> & {
    annotations: EdmxAnnotationsInfo | EdmxAnnotationsInfo[];
};

export interface ProjectPaths {
    packageJson?: string;
    ui5Yaml?: string;
    ui5LocalYaml?: string;
    ui5MockYaml?: string;
}

export type DataSources = { [k: string]: ManifestNamespace.DataSource };
