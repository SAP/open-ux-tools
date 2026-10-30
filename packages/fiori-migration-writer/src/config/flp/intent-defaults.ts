/**
 * Helper functions for determining default FLP intents based on floor plan
 */
import { TemplateType, ODataVersion } from '../../types.js';

/**
 * Determine default FLP intents (flpSandboxFlpIntent and flpSandboxMockFlpIntent)
 * based on floor plan and whether it's a SAP app
 *
 * @param floorPlan - The floor plan type (TemplateType value: 'lrop', 'worklist', 'alp', 'ovp')
 * @param isSAPApp - Whether this is a SAP application
 * @param odataVersion - OData version to distinguish V2 vs V4
 * @param existingFlpIntent - Existing FLP intent (if any)
 * @param existingMockIntent - Existing mock FLP intent (if any)
 * @returns Object with flpSandboxFlpIntent and flpSandboxMockFlpIntent
 */
export function determineDefaultFlpIntents(
    floorPlan: string | undefined,
    isSAPApp: boolean,
    odataVersion: ODataVersion | undefined,
    existingFlpIntent?: string,
    existingMockIntent?: string
): {
    flpSandboxFlpIntent: string;
    flpSandboxMockFlpIntent: string;
} {
    const masterDetail = 'masterDetail-display';
    const ovpDisplay = 'OVP-display';

    let flpSandboxFlpIntent = existingFlpIntent;

    if (!isSAPApp) {
        // For V4 ListReportObjectPage, use FE-specific intent
        if (floorPlan === TemplateType.ListReportObjectPage && odataVersion === ODataVersion.v4) {
            flpSandboxFlpIntent = flpSandboxFlpIntent ?? 'fe-lrop';
        } else {
            switch (floorPlan) {
                case TemplateType.ListReportObjectPage:
                case TemplateType.AnalyticalListPage:
                case TemplateType.Worklist:
                    flpSandboxFlpIntent = flpSandboxFlpIntent ?? masterDetail;
                    break;
                case TemplateType.OverviewPage:
                    flpSandboxFlpIntent = flpSandboxFlpIntent ?? ovpDisplay;
                    break;
                default:
                    // For unknown floor plans (e.g., freestyle apps), use masterDetail as fallback
                    flpSandboxFlpIntent = flpSandboxFlpIntent ?? masterDetail;
                    break;
            }
        }
    } else {
        flpSandboxFlpIntent = flpSandboxFlpIntent ?? 'app-tile';
    }

    const flpSandboxMockFlpIntent = existingMockIntent ?? flpSandboxFlpIntent;

    return {
        flpSandboxFlpIntent: flpSandboxFlpIntent,
        flpSandboxMockFlpIntent
    };
}
