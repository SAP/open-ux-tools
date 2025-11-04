import type { AnalysisStatus, BillOfMaterialsSummary, TelemetryDimensions } from './shared';
import type { ListReportAnalysis } from './list-report';
import type { ObjectPageAnalysis } from './object-page';

export * from './shared';
export * from './list-report';
export * from './object-page';
export * from './analyzers';
export * from './resources';

export interface BillOfMaterials {
    readonly template: 'ListReportObjectPageV4' | string;
    readonly listReport?: ListReportAnalysis;
    readonly objectPage?: ObjectPageAnalysis;
    readonly summary?: BillOfMaterialsSummary;
}

export interface AnalysisResult {
    readonly status: AnalysisStatus;
    readonly billOfMaterials?: BillOfMaterials;
    readonly telemetryDimensions?: TelemetryDimensions;
    readonly warnings?: readonly string[];
}
