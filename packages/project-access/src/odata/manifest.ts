import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { findEntitySetByName } from './entity-set';
import { hasRecursiveHierarchyForEntitySet } from './hierarchy';
import { hasAggregateTransformations, shouldUseAnalyticalTable } from './aggregation';
import { OdataVersion, type TableType, type TemplateType } from '../types';

/**
 * Required transformations for analytical table support.
 * NOTE: This constant is primarily used by odata-service-inquirer but is exported
 * here to maintain backward compatibility with external packages that import it.
 */
export const transformationsRequiredForAnalyticalTable = [
    'filter',
    'identity',
    'orderby',
    'skip',
    'top',
    'groupby',
    'aggregate',
    'concat'
] as const;

/**
 * Get the default table type based on the template type and entity capabilities.
 *
 * @param templateType the template type of the application to be generated
 * @param metadata the metadata (edmx) string of the service
 * @param odataVersion the OData version of the service
 * @param isCapService whether the service is a CAP service or not
 * @param mainEntitySetName the name of the main entity set
 * @returns the optimal table type for the given entity
 */
export function getDefaultTableType(
    templateType: TemplateType,
    metadata: ConvertedMetadata,
    odataVersion: OdataVersion,
    isCapService: boolean,
    mainEntitySetName?: string
): TableType {
    // Find the entity set once for all annotation checks
    const entitySet = mainEntitySetName ? findEntitySetByName(metadata, mainEntitySetName) : undefined;

    // Handle ALP template with OData v2 - always use AnalyticalTable
    if (templateType === 'alp' && odataVersion === OdataVersion.v2) {
        return 'AnalyticalTable';
    }

    // Handle OData v4 specific logic
    if (odataVersion === OdataVersion.v4 && entitySet) {
        const canUseAnalytical = templateType === 'lrop' || templateType === 'worklist' || templateType === 'alp';
        const hasHierarchy = hasRecursiveHierarchyForEntitySet(entitySet);
        const hasAnalyticalData = hasAggregateTransformations(entitySet);

        // Check for analytical capabilities first (highest priority)
        if (canUseAnalytical && hasAnalyticalData) {
            // For CAP services, any analytical data is sufficient
            // For non-CAP services, require complete transformations
            const hasAnalyticalCapabilities = shouldUseAnalyticalTable(entitySet, !isCapService);
            if (hasAnalyticalCapabilities) {
                return 'AnalyticalTable';
            }
        }

        // Check for hierarchical data only (no analytical data or analytical requirements not met)
        if ((templateType === 'lrop' || templateType === 'worklist') && hasHierarchy) {
            return 'TreeTable';
        }
    }

    // Default fallback to ResponsiveTable
    return 'ResponsiveTable';
}
