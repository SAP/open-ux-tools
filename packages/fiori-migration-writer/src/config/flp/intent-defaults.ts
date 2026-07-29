/**
 * Helper functions for determining default FLP intents based on floor plan
 */
import { FLOOR_PLAN } from '../../types.js';

/**
 * Determine default FLP intents (flpSandboxFlpIntent and flpSandboxMockFlpIntent)
 * based on floor plan and whether it's a SAP app
 *
 * @param floorPlan - The floor plan type (e.g. FLOOR_PLAN.ListReportObjectPageV4)
 * @param isSAPApp - Whether this is a SAP application
 * @param existingFlpIntent - Existing FLP intent (if any)
 * @param existingMockIntent - Existing mock FLP intent (if any)
 * @returns Object with flpSandboxFlpIntent and flpSandboxMockFlpIntent
 */
export function determineDefaultFlpIntents(
    floorPlan: string | undefined,
    isSAPApp: boolean,
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
        switch (floorPlan) {
            case FLOOR_PLAN.ListReportObjectPageV2:
            case FLOOR_PLAN.AnalyticalListPageV2:
            case FLOOR_PLAN.WorklistV2:
                flpSandboxFlpIntent = flpSandboxFlpIntent ?? masterDetail;
                break;
            case FLOOR_PLAN.OverviewPageV2:
                flpSandboxFlpIntent = flpSandboxFlpIntent ?? ovpDisplay;
                break;
            case FLOOR_PLAN.ListReportObjectPageV4:
                flpSandboxFlpIntent = flpSandboxFlpIntent ?? 'fe-lrop';
                break;
            default:
                // For unknown floor plans (e.g., freestyle apps), use masterDetail as fallback
                flpSandboxFlpIntent = flpSandboxFlpIntent ?? masterDetail;
                break;
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
