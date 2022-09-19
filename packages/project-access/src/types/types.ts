import type { Manifest } from '@sap-ux/project-types';

export interface AllAppResults {
    appRoot: string;
    projectRoot: string;
    manifestPath: string;
    manifest: Manifest;
}
