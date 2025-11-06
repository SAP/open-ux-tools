import type { ListReportAnalysis } from './list-report';
import type { ObjectPageAnalysis } from './object-page';

export interface ManifestAnalysis {
    readonly listReport?: ListReportAnalysis;
    readonly objectPage?: ObjectPageAnalysis;
}

export interface AnnotationAnalysis {
    readonly listReport?: ListReportAnalysis;
    readonly objectPage?: ObjectPageAnalysis;
}
