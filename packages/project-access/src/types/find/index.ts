import type { Manifest } from '../webapp';

export interface AllAppResults {
    appRoot: string;
    projectRoot: string;
    manifestPath: string;
    manifest: Manifest;
}
