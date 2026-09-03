import type { ImportProjectInfo } from '../types.js';
import { FLOOR_PLAN } from '../types.js';
import { MigrationError } from '../utils/common.js';
import { i18nText } from '../i18n.js';

/**
 * Component mappings for different floor plan types
 */
const COMPONENT_MAPPINGS = {
    v2LROP: 'sap/suite/ui/generic/template/lib/AppComponent',
    v2OVP: 'sap/ovp/app/Component',
    v4LROP: 'sap/fe/core/AppComponent'
} as const;

/**
 * Gets the appropriate component path and semantic object for the given floor plan.
 * Returns undefined for SAP apps or UI adaptations.
 *
 * @param projectInfo - Project information containing floor plan and app details
 * @returns Component mapping with appMigratorSrcComponentToReplace and semanticObject, or undefined for SAP apps
 * @throws {MigrationError} If floor plan is not supported
 */
export function getComponentMapping(projectInfo: ImportProjectInfo): {
    appMigratorSrcComponentToReplace?: string;
    semanticObject: string;
} {
    const { isSAPApp, uiAdaptation, floorPlan, flpSandboxMockFlpIntent } = projectInfo;

    // For SAP apps and UI adaptations, only set semantic object
    if (isSAPApp || uiAdaptation) {
        return {
            appMigratorSrcComponentToReplace: undefined,
            semanticObject: flpSandboxMockFlpIntent as string
        };
    }

    // Map floor plan to component
    let appMigratorSrcComponentToReplace: string;

    switch (floorPlan) {
        case FLOOR_PLAN.ListReportObjectPageV2:
        case FLOOR_PLAN.AnalyticalListPageV2:
        case FLOOR_PLAN.WorklistV2:
            appMigratorSrcComponentToReplace = COMPONENT_MAPPINGS.v2LROP;
            break;

        case FLOOR_PLAN.OverviewPageV2:
            appMigratorSrcComponentToReplace = COMPONENT_MAPPINGS.v2OVP;
            break;

        case FLOOR_PLAN.ListReportObjectPageV4:
            appMigratorSrcComponentToReplace = COMPONENT_MAPPINGS.v4LROP;
            break;

        default:
            throw new MigrationError(
                new Error(i18nText('ERROR_FLOOR_PLAN_NOT_SUPPORTED', { floorPlan })),
                undefined,
                true
            );
    }

    return {
        appMigratorSrcComponentToReplace,
        semanticObject: flpSandboxMockFlpIntent as string
    };
}
