import { getUi5Themes, type UI5Theme, type UI5Version } from '@sap-ux/ui5-info';
import fuzzy from 'fuzzy';
import { coerce, eq, lte, type SemVer } from 'semver';
import { t } from '../i18n.js';
import type { Answers, ChoiceOptions, ListQuestion, SearchQuestion, UI5VersionChoice } from '../types.js';
import { Separator } from './separator.js';

/**
 * Get the UI5 themes as prompt choices applicable for the specified UI5 version.
 *
 * @param ui5Version - UI5 semantic version
 * @returns UI5 themes as list choice options
 */
export async function getUI5ThemesChoices(ui5Version?: string): Promise<ChoiceOptions[]> {
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
export function searchChoices(searchVal: string, searchList: ChoiceOptions[]): ChoiceOptions[] {
    return searchVal && searchList
        ? fuzzy
              .filter(searchVal, searchList, {
                  // Only `choice.name` searching is supported, as this is what is presented to the user by Inquirer
                  extract: (choice: ChoiceOptions) => choice.name ?? ''
              })
              .map((el) => el.original)
        : searchList;
}

/**
 * A selectable choice or a visual {@link Separator}, as accepted by the `select`/`search` arms.
 */
type ChoiceOrSeparator = ChoiceOptions | Separator;

/**
 * Resolves the choices for the `search`/`select` arms, accepting either a static array or a thunk
 * (some call sites compute choices lazily, e.g. after a `when` condition has run).
 *
 * @param choices - the choices array or a function returning it
 * @returns the resolved choices array
 */
function resolveChoices(choices: ChoiceOrSeparator[] | (() => ChoiceOrSeparator[])): ChoiceOrSeparator[] {
    return typeof choices === 'function' ? choices() : choices;
}

/**
 * Narrows a choice-or-separator list to the selectable choices, dropping {@link Separator} entries.
 *
 * @param choices - the mixed choice/separator list
 * @returns only the selectable choices
 */
function selectableChoices(choices: ChoiceOrSeparator[]): ChoiceOptions[] {
    return choices.filter((choice): choice is ChoiceOptions => Separator.exclude(choice as { type: string }));
}

/**
 * Builds either a `search` (filterable) or `select` (static list) prompt from a common base, replacing
 * the former `inquirer-autocomplete-prompt` / `list` dual-shape object. inquirer 13 cannot express both
 * on one object: the `select` arm rejects `source` and the `search` arm rejects `choices`.
 *
 * The `search` arm's `source` is adapted from {@link searchChoices}, which returns the full list when the
 * search term is empty. inquirer 13's `select`/`search` `default` is a choice *value* (not the inquirer 8
 * list index), so a caller that still has an index supplies `defaultIndex` and it is resolved to the value
 * at that position (separators excluded); callers that already hold a value simply pass it on `base.default`.
 *
 * @param base - the shared question fields (name, message, guiOptions, validate, and an optional value `default`)
 * @param choices - the selectable choices (and optional separators), or a thunk returning them
 * @param useSearch - when true, emit a `search` arm; otherwise a `select` arm
 * @param defaultIndex - optional index into the selectable choices to pre-select; mapped to the choice value and, when provided, takes precedence over `base.default`
 * @returns a {@link SearchQuestion} when `useSearch`, otherwise a {@link ListQuestion}
 */
export function searchableListPrompt<A extends Answers = Answers>(
    base: Omit<SearchQuestion<A>, 'type' | 'source'>,
    choices: ChoiceOrSeparator[] | (() => ChoiceOrSeparator[]),
    useSearch: boolean,
    defaultIndex?: number
): SearchQuestion<A> | ListQuestion<A> {
    const defaultValue =
        defaultIndex !== undefined ? selectableChoices(resolveChoices(choices))[defaultIndex]?.value : base.default;
    if (useSearch) {
        return {
            ...base,
            type: 'search',
            source: (term: string | undefined): ChoiceOptions[] =>
                searchChoices(term ?? '', selectableChoices(resolveChoices(choices))),
            ...(defaultValue !== undefined ? { default: defaultValue } : {})
        } satisfies SearchQuestion<A>;
    }
    return {
        ...base,
        type: 'select',
        choices,
        ...(defaultValue !== undefined ? { default: defaultValue } : {})
    } satisfies ListQuestion<A>;
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
                }) as UI5VersionChoice
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
                }) as UI5VersionChoice
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
