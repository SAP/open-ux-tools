import { FeatureService } from '../../cpe/feature-service';
import type { QuickActionDefinitionRegistry } from '../../cpe/quick-actions/registry';
import type { ApplicationType } from '../../utils/application';

/**
 * Loads the appropriate Quick Action registries for the given application type.
 *
 * @param appType - Application type.
 * @returns Quick Action registries.
 */
export async function loadDefinitions(appType: ApplicationType): Promise<QuickActionDefinitionRegistry<string>[]> {
    if (FeatureService.isFeatureEnabled('cpe.beta.quick-actions') === false) {
        return [];
    }
    if (appType === 'fe-v2') {
        const FEV2QuickActionRegistry = (await import('open/ux/preview/client/adp/quick-actions/fe-v2/registry'))
            .default;

        return [new FEV2QuickActionRegistry()];
    }
    if (appType === 'fe-v4') {
        const FEV4QuickActionRegistry = (await import('open/ux/preview/client/adp/quick-actions/fe-v4/registry'))
            .default;
        return [new FEV4QuickActionRegistry()];
    }
    return [];
}
