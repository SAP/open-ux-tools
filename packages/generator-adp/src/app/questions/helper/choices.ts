import type { CFApp, FDCService, SourceApplication } from '@sap-ux/adp-tooling';
import { AppRouterType } from '../../types';

interface Choice {
    name: string;
    value: SourceApplication;
}

/**
 * Creates a list of choices from a list of applications, formatted for display or selection in a UI.
 * Each choice consists of an application's title (or ID if no title), followed by its registration IDs and ACH, formatted for easy reading.
 *
 * @param {SourceApplication[]} apps - An array of applications to be transformed into display choices.
 * @returns {Choice[]} An array of objects each containing a value (the full application object) and a name (a formatted string).
 */
export const getApplicationChoices = (apps: SourceApplication[]): Choice[] => {
    return Array.isArray(apps)
        ? apps.map((app) => {
              const name = app.title
                  ? `${app.title} (${app.id}, ${app.registrationIds}, ${app.ach})`
                  : `${app.id} (${app.registrationIds}, ${app.ach})`;
              return {
                  value: app,
                  name: name.replace('(, )', '').replace(', , ', ', ').replace(', )', ')').replace('(, ', '(')
              };
          })
        : apps;
};

/**
 * Get the choices for the base app.
 *
 * @param {CFApp[]} apps - The apps to get the choices for.
 * @param {FDCService} fdcService - The FDC service instance.
 * @returns {Array<{ name: string; value: CFApp }>} The choices for the base app.
 */
export const getCFAppChoices = (apps: CFApp[], fdcService: FDCService): { name: string; value: CFApp }[] => {
    return apps.map((result: CFApp) => ({
        name: fdcService.formatDiscovery?.(result) ?? `${result.title} (${result.appId}, ${result.appVersion})`,
        value: result
    }));
};

/**
 * Get the choices for the approuter.
 *
 * @param {boolean} isInternalUsage - Whether the user is using internal features.
 * @returns {Array<{ name: AppRouterType; value: AppRouterType }>} The choices for the approuter.
 */
export const getAppRouterChoices = (isInternalUsage: boolean): { name: AppRouterType; value: AppRouterType }[] => {
    const options: { name: AppRouterType; value: AppRouterType }[] = [
        {
            name: AppRouterType.MANAGED,
            value: AppRouterType.MANAGED
        }
    ];
    if (isInternalUsage) {
        options.push({
            name: AppRouterType.STANDALONE,
            value: AppRouterType.STANDALONE
        });
    }
    return options;
};
