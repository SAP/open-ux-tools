import type { AnnotationAnalysis, ManifestAnalysis } from '../types/analyzers';
import type { BillOfMaterials, ListReportAnalysis, ObjectPageAnalysis } from '../types';

export { analyzeAnnotations } from './annotations';
export { analyzeManifest } from './manifest';

/**
 * Merge partial insights from manifest and annotation analysers.
 *
 * @param manifestInsights - insights derived from the manifest.json file
 * @param annotationInsights - insights derived from UI annotations
 * @returns merged insights or undefined if both inputs are empty
 */
function mergeInsights<T extends object>(manifestInsights?: T, annotationInsights?: T): T | undefined {
    if (!manifestInsights && !annotationInsights) {
        return undefined;
    }
    return {
        ...(manifestInsights ?? {}),
        ...(annotationInsights ?? {})
    } as T;
}

/**
 * Compose the final bill of materials by combining manifest and annotation analyses.
 *
 * @param manifestAnalysis - output of the manifest analyser
 * @param annotationAnalysis - output of the annotation analyser
 * @returns composed bill of materials when any insights are available
 */
export function composeBillOfMaterials(
    manifestAnalysis?: ManifestAnalysis,
    annotationAnalysis?: AnnotationAnalysis
): BillOfMaterials | undefined {
    const listReport = mergeInsights<ListReportAnalysis>(manifestAnalysis?.listReport, annotationAnalysis?.listReport);
    const objectPage = mergeInsights<ObjectPageAnalysis>(manifestAnalysis?.objectPage, annotationAnalysis?.objectPage);

    if (!listReport && !objectPage) {
        return undefined;
    }

    return {
        template: 'ListReportObjectPageV4',
        listReport,
        objectPage
    };
}
