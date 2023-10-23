import { isAppStudio } from '@sap-ux/btp-utils';
import { PLATFORMS } from '../types/constants';
import { Separator, type ListChoiceOptions } from 'inquirer';
import * as fuzzy from 'fuzzy';
import { t } from '../i18n';
import type { UI5Version } from '@sap-ux/ui5-info';
import type { UI5VersionChoice } from '../types/types';

/**
 * Determine if the current environment is Yo cli or YUI (app studio or vscode).
 *
 * @returns the current platform
 */
export function getPlatform(): { name: string; technical: string } {
    if ((process.mainModule && process.mainModule.filename.includes('yo')) || process.stdin.isTTY) {
        return PLATFORMS.CLI;
    } else {
        return isAppStudio() ? PLATFORMS.SBAS : PLATFORMS.VSCODE;
    }
}

/**
 * Finds the search value in the provided list using `fuzzy` search.
 *
 * @param searchVal - the string to search for
 * @param searchList - the list in which to search by fuzzy matching the choice name
 * @returns Inquirer choices filtered by the search value
 */
export function searchChoices(searchVal: string, searchList: ListChoiceOptions[]): ListChoiceOptions[] {
    return searchVal && searchList
        ? fuzzy
              .filter(searchVal, searchList, {
                  extract: (choice: ListChoiceOptions) => choice.name || choice.toString()
              })
              .map((el) => el.original)
        : searchList;
}

/**
 * Creates a list of UI5 Versions prompt choices, adding additional maintenance info for use in prompts
 * and grouping according to maintenance status.
 *
 * @param versions ui5Versions
 * @returns Array of ui5 version choices and separators if applicable, grouped by maintenance state
 */
export function ui5VersionsGrouped(versions?: UI5Version[]): (UI5VersionChoice | Separator)[] {
    if (!versions) {
        return [];
    }
    const isCli = getPlatform() === PLATFORMS.CLI;

    const maintChoices = versions
        .filter((v) => v.maintained === true)
        .map(
            (mainV) =>
                ({
                    version: mainV,
                    name: isCli
                        ? `${mainV.version} - (${t('ui5VersionLabels.maintained')} ${t('ui5VersionLabels.version', {
                              count: 1
                          })})`
                        : mainV.version,
                    value: mainV.version
                } as UI5VersionChoice)
        );
    const notMaintChoices = versions
        .filter((v) => v.maintained === false)
        .map(
            (mainV) =>
                ({
                    version: mainV,
                    name: isCli
                        ? `${mainV.version} - (${t('ui5VersionLabels.outOfMaintenance')} ${t(
                              'ui5VersionLabels.version',
                              { count: 1 }
                          )})`
                        : mainV.version,
                    value: mainV.version
                } as UI5VersionChoice)
        );

    // Add separators for non-CLI UI
    if (!isCli) {
        (maintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('ui5VersionLabels.maintained')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
        (notMaintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('i5VersionLabels.outOfMaintenance')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
    }

    return [...maintChoices, ...notMaintChoices];
}
