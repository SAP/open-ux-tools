import Log from 'sap/base/Log';
import Element from 'sap/ui/core/Element';
import type DTElement from 'sap/ui/dt/Element';

import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import { getError } from '../utils/error';
import { sendInfoCenterMessage } from '../utils/info-center-message';
import { isLowerThanMinimalUi5Version, Ui5VersionInfo } from '../utils/version';

const syncViews = new Set<string>();
let warningShown = false;

/**
 * Get Ids for all sync views
 *
 * @param ui5VersionInfo UI5 Version Information
 *
 * @returns array of Ids for application sync views
 */
export async function updateSyncViewsIds(ui5VersionInfo: Ui5VersionInfo): Promise<void> {
    try {
        if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 120, patch: 2 })) {
            const elements = Element.registry.filter(() => true) as DTElement[];
            elements.forEach((ui5Element) => {
                if (isSyncView(ui5Element)) {
                    syncViews.add(ui5Element.getId());
                }
            });
        } else {
            const ElementRegistry = (await import('sap/ui/core/ElementRegistry')).default;
            const elements = ElementRegistry.all() as Record<string, DTElement>;
            Object.entries(elements).forEach(([key, ui5Element]) => {
                if (isSyncView(ui5Element)) {
                    syncViews.add(key);
                }
            });
        }
    } catch (error) {
        Log.error('Could not get application sync views', getError(error));
    }
}

/**
 * Show warning message if there are sync views in the application and the warning has not been shown yet.
 */
export async function showSyncViewsWarning(): Promise<void> {
    if (warningShown) {
        return;
    }

    if (!syncViews.size) {
        return;
    }

    warningShown = true;

    await sendInfoCenterMessage({
        title: { key: 'ADP_SYNC_VIEWS_TITLE' },
        description: { key: 'ADP_SYNC_VIEWS_MESSAGE' },
        type: MessageBarType.warning
    });
}

/**
 * Check if element is sync view
 *
 * @param element Design time Element
 * @returns boolean if element is sync view or not
 */
export function isSyncView(element: DTElement): boolean {
    return element?.getMetadata()?.getName()?.includes('XMLView') && element?.oAsyncState === undefined;
}

/**
 * Retrieves the set of synchronious view IDs.
 *
 * @returns Cached set containing the IDs of all synchronious views.
 */
export function getSyncViewIds(): Set<string> {
    return syncViews;
}

/**
 * Resets the cached synchronious views and warning state.
 * Needed for testing purposes to ensure a clean state.
 */
export function resetSyncViews(): void {
    syncViews.clear();
    warningShown = false;
}
