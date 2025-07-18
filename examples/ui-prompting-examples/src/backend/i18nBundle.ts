import { join } from 'path';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { I18nBundle, NewI18nEntry } from '@sap-ux/i18n';

/**
 * Method retrieves i18n bundles for passed application.
 *
 * @param root Project root
 * @param appName Application name
 * @returns i18n bundle.
 */
export const getI18nBundle = async (root: string, appName?: string): Promise<I18nBundle | undefined> => {
    const appAccess = await createApplicationAccess(join(root, appName ?? ''));
    const bundles = await appAccess.getI18nBundles();
    return bundles.models['i18n'] ?? bundles['sap.app'];
};

/**
 * Method writes new i18n entries for passed application.
 *
 * @param newEntries New i18n entries to write
 * @param root Project root
 * @param appName Application name
 */
export const createI18nEntry = async (newEntries: NewI18nEntry[], root: string, appName?: string): Promise<void> => {
    const appAccess = await createApplicationAccess(join(root, appName ?? ''));
    await appAccess.createUI5I18nEntries(newEntries, 'i18n');
};
