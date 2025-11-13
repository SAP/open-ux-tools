export type ProjectType = 'EDMXBackend' | 'CAPJava' | 'CAPNodejs';
export type AppType =
    | 'SAP Fiori elements'
    | 'SAPUI5 freestyle'
    | 'SAPUI5 Extension'
    | 'Fiori Reuse'
    | 'Fiori Adaptation';

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
