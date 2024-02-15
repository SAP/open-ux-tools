import { Separator, type ListChoiceOptions } from 'inquirer';
import * as fuzzy from 'fuzzy';
import { t } from '../i18n';
import { getUi5Themes, type UI5Theme, type UI5Version } from '@sap-ux/ui5-info';
import type { UI5VersionChoice } from '../types';

/**
 * Get the UI5 themes as prompt choices applicable for the specified UI5 version.
 *
 * @param ui5Version - UI5 semantic version
 * @returns UI5 themes as list choice options
 */
export function getUI5ThemesChoices(ui5Version?: string): ListChoiceOptions[] {
    const themes = getUi5Themes(ui5Version);
    return themes.map((theme: UI5Theme) => ({
        name: theme.label,
        value: theme.id
    }));
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
                  // Only `choice.name` searching is supported, as this is what is presented to the user by Inquirer
                  extract: (choice: ListChoiceOptions) => choice.name ?? ''
              })
              .map((el) => el.original)
        : searchList;
}

/**
 * Creates a list of UI5 Versions prompt choices, adding additional maintenance info for use in prompts
 * and grouping according to maintenance status.
 *
 * @param versions ui5Versions
 * @param includeSeparators Include a separator to visually identify groupings, if false then grouping info is included in each entry as additional name text
 * @param defaultChoice optional, provides an additionsl version choice entry and sets as the default
 * @returns Array of ui5 version choices and separators if applicable, grouped by maintenance state
 */
export function ui5VersionsGrouped(
    versions: UI5Version[],
    includeSeparators = false,
    defaultChoice?: UI5VersionChoice
): (UI5VersionChoice | Separator)[] {
    if (!versions || (Array.isArray(versions) && versions.length === 0)) {
        return [];
    }

    const maintChoices = versions
        .filter((v) => v.maintained === true)
        .map(
            (mainV) =>
                ({
                    name: !includeSeparators
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
                    name: !includeSeparators
                        ? `${mainV.version} - (${t('ui5VersionLabels.outOfMaintenance')} ${t(
                              'ui5VersionLabels.version',
                              { count: 1 }
                          )})`
                        : mainV.version,
                    value: mainV.version
                } as UI5VersionChoice)
        );

    if (includeSeparators) {
        (maintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('ui5VersionLabels.maintained')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
        (notMaintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('ui5VersionLabels.outOfMaintenance')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
    }

    const versionChoices = [...maintChoices, ...notMaintChoices];
    if (defaultChoice) {
        versionChoices.unshift(defaultChoice);
    }
    return versionChoices;
}
