import type { AbapTarget } from '@sap-ux/ui5-config';
import { t } from '../i18n';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS } from '../constants';
import { queryPackages } from '../utils';
import { PromptState } from './prompt-state';
import LoggerHelper from '../logger-helper';
import { getDisplayName, isAbapEnvironmentOnBtp, type Destinations } from '@sap-ux/btp-utils';
import {
    promptNames,
    ClientChoiceValue,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type AbapSystemChoice,
    type AbapDeployConfigAnswersInternal,
    type BackendTarget,
    type SystemConfig
} from '../types';
import { AuthenticationType, type BackendSystem } from '@sap-ux/store';
import type { ChoiceOptions, ListChoiceOptions } from 'inquirer';
import { getBackendSystemDisplayName, getSystemDisplayName } from '@sap-ux/fiori-generator-shared';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

/**
 * Normalizes a URL by trimming whitespace and removing any trailing slash.
 *
 * @param url - the URL to normalize
 * @returns the normalized URL
 */
function normalizeUrl(url: string): string {
    return url.trim().replace(/\/$/, '');
}

/**
 * Resolve the effective URL from an ABAP target, accounting for an optional connect path.
 *
 * @param target - the ABAP target containing the base URL and optional connect path
 * @returns the resolved URL to be used for system matching, or undefined if no base URL is provided
 */
function resolveTargetUrl(target: AbapTarget): string | undefined {
    try {
        return target.connectPath ? new URL(target.connectPath, target.url).href : target.url;
    } catch {
        return target.url;
    }
}

/**
 * Returns a list of destination choices.
 *
 * @param destinations destinations retrieved from BTP
 * @returns choices for destinations
 */
function getDestinationChoices(destinations: Destinations = {}): AbapSystemChoice[] {
    const systemChoices: AbapSystemChoice[] = Object.values(destinations)
        .sort((a, b) => a.Name.localeCompare(b.Name, undefined, { numeric: true, caseFirst: 'lower' }))
        .map((destination) => {
            return {
                name: `${getDisplayName(destination)} - ${destination.Host}`,
                value: destination.Name,
                scp: isAbapEnvironmentOnBtp(destination),
                url: destination.Host
            };
        });
    return systemChoices;
}

/**
 * Returns a list of backend system choices.
 *
 * @param backendTarget backend target
 * @param backendSystems backend systems retrieved from store
 * @returns choices for backend systems
 */
async function getBackendTargetChoices(
    backendTarget?: BackendTarget,
    backendSystems: BackendSystem[] = []
): Promise<AbapSystemChoice[]> {
    const choices: AbapSystemChoice[] = [
        {
            name: t('choices.targetSystemUrl'),
            value: TargetSystemType.Url
        }
    ];

    const target = backendTarget?.abapTarget;
    const targetUrl = target ? resolveTargetUrl(target) : undefined;

    const sorted = [...backendSystems].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, caseFirst: 'lower' })
    );

    // Identify the stored system that matches the current target (by normalized URL + client)
    const matchedSystem = targetUrl
        ? sorted.find(
              (system) =>
                  normalizeUrl(system.url) === normalizeUrl(targetUrl) &&
                  (system.client ?? '') === (target?.client ?? '')
          )
        : undefined;

    const systemChoices: AbapSystemChoice[] = sorted.map((system) => {
        const isDefault = system === matchedSystem;
        return {
            name: isDefault
                ? `${getBackendSystemDisplayName(system)} (Source system)`
                : (getBackendSystemDisplayName(system) ?? ''),
            value: system.url,
            isDefault,
            scp: !!system.serviceKeys, // legacy service key store entries
            isAbapCloud: system.authenticationType === AuthenticationType.ReentranceTicket,
            client: system.client
        };
    });

    choices.push(...systemChoices);

    // The backend system may have been added during generation but not yet saved in the store.
    // Insert it as the first real choice (after the "Enter URL" option).
    if (!matchedSystem && targetUrl && target && backendTarget?.systemName) {
        const user = await (backendTarget.serviceProvider as AbapServiceProvider)?.user();
        const isAbapCloud = target.scp || target.authenticationType === AuthenticationType.ReentranceTicket;
        choices.splice(1, 0, {
            name: `${getSystemDisplayName(
                backendTarget.systemName,
                user,
                isAbapCloud ? 'ABAPCloud' : undefined // scp is retained for legacy app yaml entries
            )} (Source system)`,
            value: targetUrl,
            isDefault: true,
            scp: target.scp,
            isAbapCloud: target.authenticationType === AuthenticationType.ReentranceTicket,
            client: target.client
        });
    }

    return choices;
}

/**
 * Returns a list of the aba system choices comprising of either destinations or backend systems.
 *
 * @param destinations - destinations retrieved from BTP
 * @param backendTarget - backend target used previously (may not be saved in store)
 * @param backendSystems - backend systems retrieved from store
 * @returns choices for ABAP systems
 */
export async function getAbapSystemChoices(
    destinations?: Destinations,
    backendTarget?: BackendTarget,
    backendSystems?: BackendSystem[]
): Promise<AbapSystemChoice[]> {
    let choices: AbapSystemChoice[] = [];
    try {
        if (destinations) {
            choices = getDestinationChoices(destinations);
        } else if (backendSystems) {
            choices = await getBackendTargetChoices(backendTarget, backendSystems);
        }
    } catch {
        LoggerHelper.logger.error(t('errors.abapSystemChoices'));
    }
    return choices;
}

/**
 * Returns a list of the client choice prompt options.
 *
 * @param client - client from backend target
 * @returns list of client choice options
 */
export function getClientChoicePromptChoices(client?: string): ChoiceOptions[] {
    return [
        {
            name: t('choices.clientChoice.existing', { client }),
            value: ClientChoiceValue.Base
        },
        { name: t('choices.clientChoice.new'), value: ClientChoiceValue.New },
        { name: t('choices.clientChoice.blank'), value: ClientChoiceValue.Blank }
    ];
}

/**
 * Returns a list of package input choices.
 *
 * @returns list of package input choices
 */
export function getPackageInputChoices(): ListChoiceOptions[] {
    const manualChoice = {
        name: t('choices.transport.enterManually'),
        value: PackageInputChoices.EnterManualChoice
    };
    const listExistingChoice = {
        name: t('choices.common.listExisting'),
        value: PackageInputChoices.ListExistingChoice
    };
    return [manualChoice, listExistingChoice];
}

/**
 * Returns a list of transport choices.
 *
 * @param showCreateDuringDeploy - show createDuringDeploy choice, defaults to true
 * @returns list of transport choices
 */
export function getTransportChoices(showCreateDuringDeploy = true): ListChoiceOptions[] {
    const manualChoice = {
        name: t('choices.transport.enterManually'),
        value: TransportChoices.EnterManualChoice
    };
    const listExistingChoice = {
        name: t('choices.common.listExisting'),
        value: TransportChoices.ListExistingChoice
    };
    const createDuringDeployChoice = {
        name: t('choices.transport.createDuringDeploy'),
        value: TransportChoices.CreateDuringDeployChoice
    };
    const createNewChoice = { name: t('choices.transport.createNew'), value: TransportChoices.CreateNewChoice };

    return [
        manualChoice,
        listExistingChoice,
        ...(showCreateDuringDeploy ? [createDuringDeployChoice] : []),
        createNewChoice
    ];
}

/**
 * Ensures the URL in the state is update accordingly.
 *
 * @param previousAnswers - previous answers
 * @param destinations - destinations retrieved from BTP
 * @param backendTarget - backend target from abap deploy config prompt options
 */
export function updatePromptStateUrl(
    previousAnswers: AbapDeployConfigAnswersInternal,
    destinations?: Destinations,
    backendTarget?: BackendTarget
): void {
    let destinationUrl: string | undefined;
    if (previousAnswers.destination && destinations) {
        destinationUrl = destinations[previousAnswers.destination]?.Host;
    }

    let targetSystemChoice: string | undefined;
    if (previousAnswers?.targetSystem && previousAnswers.targetSystem !== TargetSystemType.Url) {
        try {
            targetSystemChoice = new URL(previousAnswers.targetSystem).origin;
        } catch {
            targetSystemChoice = previousAnswers.targetSystem; // if it's not a valid URL, use the raw value
        }
    }

    PromptState.abapDeployConfig.url = destinationUrl ?? targetSystemChoice ?? backendTarget?.abapTarget.url ?? '';
}

/**
 * Queries the packages based on the input provided.
 *
 * @param isCli - is running in CLI
 * @param input - package input
 * @param systemConfig - system configuration
 * @param previousAnswers - previous answers
 * @param backendTarget - backend target from abap deploy config prompt options
 * @returns results of query and message based on number of results
 */
export async function getPackageChoices(
    isCli: boolean,
    input: string,
    systemConfig: SystemConfig,
    previousAnswers: AbapDeployConfigAnswersInternal,
    backendTarget?: BackendTarget
): Promise<{ packages: string[]; morePackageResultsMsg: string }> {
    let packages;
    let morePackageResultsMsg = '';

    // For YUI we need to ensure input is provided so the prompt is not re-rendered with no input
    if (isCli || input) {
        packages = await queryPackages(input, systemConfig, backendTarget);

        morePackageResultsMsg =
            packages?.length === ABAP_PACKAGE_SEARCH_MAX_RESULTS
                ? t('prompts.config.package.packageAutocomplete.sourceMessage', { numResults: packages.length })
                : morePackageResultsMsg;

        if (previousAnswers.packageAutocomplete) {
            const index = packages.indexOf(previousAnswers.packageAutocomplete);
            if (index !== -1) {
                packages.splice(0, 0, packages.splice(index, 1)[0]); // move previous answer to top of choices list
            }
        }
    }
    return {
        packages: packages ?? [],
        morePackageResultsMsg
    };
}

/**
 * Simple utility to get the keys which have different values between two answer objects.
 *
 * @param prevAnswers - previous answers
 * @param newAnswers - new answers
 * @returns - list of keys which have different values
 */
function getKeysWithDifferentValues(
    prevAnswers: AbapDeployConfigAnswersInternal,
    newAnswers: AbapDeployConfigAnswersInternal
): string[] {
    const keys = new Set<keyof AbapDeployConfigAnswersInternal>([
        ...(Object.keys(prevAnswers) as (keyof AbapDeployConfigAnswersInternal)[]),
        ...(Object.keys(newAnswers) as (keyof AbapDeployConfigAnswersInternal)[])
    ]);

    return [...keys].filter((key) => prevAnswers[key] !== newAnswers[key]);
}

/**
 * Determines whether to run the validation based on changed answers.
 * The description change does not require re-validation.
 *
 * @param prevAnswers - previous answers
 * @param newAnswers - new answers
 * @returns - whether to validate the package again
 */
export function shouldRunValidation(
    prevAnswers: AbapDeployConfigAnswersInternal,
    newAnswers: AbapDeployConfigAnswersInternal
): boolean {
    if (Object.keys(prevAnswers).length === 0) {
        // first time validation if no cache
        return true;
    }

    const keys = getKeysWithDifferentValues(prevAnswers, newAnswers);
    // if no value has change or only the description has changed, no need to validate the package
    if (keys.length === 0 || (keys.length === 1 && keys[0] === promptNames.description)) {
        return false;
    }

    return true;
}
