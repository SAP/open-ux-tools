import type { Logger } from '@sap-ux/logger';
import { analyzeAnnotations, analyzeManifest, composeBillOfMaterials } from './analyzers';
import { loadAnnotationDocuments } from './io/annotations';
import { loadManifestDocument } from './io/manifest';
import type { AnalyseAppOptions, AnalysisResult } from './types';

export * from './types';
export { analyzeAnnotations, analyzeManifest } from './analyzers';

/**
 * Analyse a Fiori application by delegating to manifest and annotation sub-analysers.
 *
 * @param options - analyser options containing the application path
 * @param logger - optional logger for diagnostic output
 * @returns analysis result including the derived bill of materials, when available
 */
export async function analyzeApp(options: AnalyseAppOptions, logger?: Logger): Promise<AnalysisResult> {
    const manifestDocument = await loadManifestDocument(options, logger);
    const annotationDocuments = await loadAnnotationDocuments(options, logger);

    const manifestAnalysis = await analyzeManifest(manifestDocument, logger);
    const annotationAnalysis = await analyzeAnnotations(annotationDocuments, logger);
    const billOfMaterials = composeBillOfMaterials(manifestAnalysis, annotationAnalysis);

    if (!billOfMaterials) {
        return {
            status: 'not-implemented'
        };
    }

    return {
        status: 'success',
        billOfMaterials
    };
}
