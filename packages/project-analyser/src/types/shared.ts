import type { AppType, ProjectType } from '@sap-ux/project-access';

export type AnalysisStatus = 'not-implemented' | 'success' | 'unsupported-template';

export interface AnalyseAppOptions {
    readonly appPath: string;
    readonly templateId?: string;
}

export interface UsageDimensions {
    readonly templateId?: string;
    readonly templateVersion?: string;
    readonly projectType?: ProjectType;
    readonly appType?: AppType;
}

export interface BillOfMaterialsSummary {
    readonly listReport?: string;
    readonly objectPage?: string;
}
