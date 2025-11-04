export type AnalysisStatus = 'not-implemented' | 'success' | 'unsupported-template';

export interface AnalyseAppOptions {
    readonly appPath: string;
    readonly templateId?: string;
}

export interface TelemetryDimensions {
    readonly templateId: string;
    readonly templateVersion?: string;
    readonly deployTarget?: string;
}

export interface BillOfMaterialsSummary {
    readonly listReport?: string;
    readonly objectPage?: string;
}
