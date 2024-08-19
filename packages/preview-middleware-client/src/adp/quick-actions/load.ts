import { QuickActionDefinitionRegistry } from '../../cpe/quick-actions/registry';

export async function loadDefinitions(version: string | undefined): Promise<QuickActionDefinitionRegistry<string>> {
    if (version === 'v2') {
        const FEV2QuickActionRegistry = (await import('open/ux/preview/client/adp/quick-actions/fe-v2/registry'))
            .default;

        return new FEV2QuickActionRegistry();
    }
    if (version === 'v4') {
        const FEV4QuickActionRegistry = (await import('open/ux/preview/client/adp/quick-actions/fe-v4/registry'))
            .default;
        return new FEV4QuickActionRegistry();
    }
    return new QuickActionDefinitionRegistry();
}
