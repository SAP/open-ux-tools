import type { FioriToolsProxyConfigBackend as ProxyBackend } from '@sap-ux/ui5-config';

export enum OdataVersion {
    v2 = '2',
    v4 = '4'
}

export interface NamespaceAlias {
    namespace: string;
    alias: string;
}

export interface OdataService {
    url?: string;
    client?: string;
    destination?: {
        name: string;
        instance?: string;
    };
    path?: string;
    version: OdataVersion;
    name?: string;
    model?: string;
    metadata?: string;
    annotations?: {
        technicalName: string;
        xml: string;
    };
    localAnnotationsName?: string; // The name used in the manifest.json and as the filename for local annotations
    previewSettings?: Partial<ProxyBackend>;
}
