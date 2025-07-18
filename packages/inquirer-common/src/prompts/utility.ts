import { getUi5Themes, type UI5Theme, type UI5Version } from '@sap-ux/ui5-info';
import * as fuzzy from 'fuzzy';
import type { ListChoiceOptions } from 'inquirer';
import { coerce, eq, lte, type SemVer } from 'semver';
import { t } from '../i18n';
import type { UI5VersionChoice } from '../types';
import { Separator } from './separator';

/**
 * Get the UI5 themes as prompt choices applicable for the specified UI5 version.
 *
 * @param ui5Version - UI5 semantic version
 * @returns UI5 themes as list choice options
 */
export async function getUI5ThemesChoices(ui5Version?: string): Promise<ListChoiceOptions[]> {
    const themes = await getUi5Themes(ui5Version);
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
 * @param versions - ui5Versions
 * @param includeSeparators - Include a separator to visually identify groupings, if false then grouping info is included in each entry as additional name text
 * @param defaultChoice - optional, provides an additional version choice entry that is added as the first entry in the version choices (if it does not already exist in the version list) and sets as the default
 * @param useDefaultChoiceLabel - optional, if true the specified `defaultChoice` label will replace the `maintained` label. e.g. when `source system version` has been appended
 * @returns Array of ui5 version choices and separators if applicable, grouped by maintenance state
 */
export function ui5VersionsGrouped(
    versions: UI5Version[],
    includeSeparators = false,
    defaultChoice?: UI5VersionChoice,
    useDefaultChoiceLabel = false
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
        const index = versionChoices.findIndex((choice) => choice.value === defaultChoice.value);
        if (index === -1) {
            // adds default choice to the top of the list
            versionChoices.unshift(defaultChoice);
        } else if (useDefaultChoiceLabel) {
            // Use the specified `defaultChoice` label instead of the maintenance label
            versionChoices[index].name = defaultChoice.name;
        }
    }
    return versionChoices;
}

/**
 * Will either return the UI5 version that is the closest to the default choice version or simply the version that is passed to it.
 *
 * @param ui5Versions - UI5 versions ordered by version descending latest first
 * @param useClosestVersion - whether to use the closest available version to the default choice
 * @param defaultChoiceVersion - default version chosen
 * @returns - ui5 version to be used as default
 */
function findDefaultUI5Version(
    ui5Versions: UI5Version[],
    useClosestVersion: boolean,
    defaultChoiceVersion: SemVer
): UI5Version | undefined {
    let version;
    if (useClosestVersion) {
        version = ui5Versions.find((ui5Ver) => lte(ui5Ver.version, defaultChoiceVersion));
    } else {
        version = {
            version: defaultChoiceVersion.version
        };
    }
    return version;
}

/**
 * Get the default UI5 version choice that should be selected based on the provided default choice.
 * Note, if the provided version is a snapshot version, the closest provided version is returned.
 * Otherwise if the default choice is not found in the provided versions, it will still be returned.
 *
 * @param ui5Versions - UI5 versions ordered by version descending latest first
 * @param defaultChoice - optional default choice to be used
 * @returns The default UI5 version choice or the latest provided version
 */
export function getDefaultUI5VersionChoice(
    ui5Versions: UI5Version[],
    defaultChoice?: UI5VersionChoice
): UI5VersionChoice | undefined {
    let useClosestVersion = false;
    if (defaultChoice) {
        if (defaultChoice.value.toLowerCase().endsWith('snapshot')) {
            useClosestVersion = true;
        }
        const defaultChoiceVersion = coerce(defaultChoice.value);
        if (defaultChoiceVersion !== null) {
            const version = findDefaultUI5Version(ui5Versions, useClosestVersion, defaultChoiceVersion);
            if (version) {
                // if the versions are an exact match use the name (UI label) from the default choice as this may use a custom name
                return {
                    name: eq(version.version, defaultChoice.value) ? defaultChoice.name : version.version,
                    value: version.version
                };
            }
        }
    }
    // defaultChoice was not coercable, not found or not provided, return the latest version from the ui5 versions provided
    const defaultVersion = ui5Versions.find((ui5Ver) => ui5Ver.default && ui5Ver.version)?.version;

    if (defaultVersion) {
        return {
            name: defaultVersion,
            value: defaultVersion
        };
    }
    return undefined;
}
