import type { SecureStore } from '../../secure-store';
import { text } from '../../i18n';
import type { DataProvider } from '../../data-provider';
import { ApiHubSettings, ApiHubSettingsKey } from '../../entities/api-hub';
import type { Logger } from '@sap-ux/logger';

export const LEGACY_API_HUB_API_SERVICE = 'fiori/system/apiHub';
export const LEGACY_API_HUB_API_KEY = 'API_HUB_API_KEY';

/**
 * Do NOT export to the outside world
 */
export async function migrateToLatestVersion({
    dataProvider,
    secureStore,
    logger
}: {
    dataProvider: DataProvider<ApiHubSettings, ApiHubSettingsKey>;
    secureStore: SecureStore;
    logger: Logger;
}): Promise<void> {
    // Migrates the key from  initial version where the key was written directly to the secure store
    const apiKey = await secureStore.retrieve<string>(LEGACY_API_HUB_API_SERVICE, LEGACY_API_HUB_API_KEY);
    if (!apiKey) {
        logger.debug(text('info.noLegacyApiHubKeyFound'));
        return;
    } else {
        logger.info(text('info.legacyApiHubKeyFound'));
    }

    const apiKeysNewFormat = await dataProvider.read(new ApiHubSettingsKey());
    if (!apiKeysNewFormat) {
        await dataProvider.write(new ApiHubSettings({ apiKey }));
        logger.info(text('info.legacyApiHubKeyMigrated'));
    } else {
        logger.info(text('info.legacyApiHubKeyNotMigrated'));
    }

    await secureStore.delete(LEGACY_API_HUB_API_SERVICE, LEGACY_API_HUB_API_KEY);
    logger.info(text('info.legacyApiHubKeyDeleted'));
}
