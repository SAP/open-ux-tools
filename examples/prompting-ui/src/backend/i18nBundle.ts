import { join } from 'path';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { I18nBundle, NewI18nEntry } from '@sap-ux/i18n';

export const getI18nBundle = async (root: string, appName?: string): Promise<I18nBundle | undefined> => {
    const appAccess = await createApplicationAccess(join(root, appName ?? ''));
    const bundles = await appAccess.getI18nBundles();
    return bundles.models['i18n'] ?? bundles['sap.app'];
};

export const updateI18nBundle = async (newEntries: NewI18nEntry[], root: string, appName?: string): Promise<void> => {
    const appAccess = await createApplicationAccess(join(root, appName ?? ''));
    await appAccess.createUI5I18nEntries(newEntries, 'i18n');
};
