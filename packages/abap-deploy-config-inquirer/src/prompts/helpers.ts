import type { UrlAbapTarget } from '@sap-ux/system-access';
import { t } from '../i18n';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS } from '../constants';
import { queryPackages } from '../utils';
import { PromptState } from './prompt-state';
import LoggerHelper from '../logger-helper';
import { getDisplayName, isAbapEnvironmentOnBtp, type Destinations } from '@sap-ux/btp-utils';
import {
    ClientChoiceValue,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions,
    type BackendTarget
} from '../types';
import { AuthenticationType, type BackendSystem } from '@sap-ux/store';
import type { AbapSystemChoice } from '../types';
import type { ChoiceOptions, ListChoiceOptions } from 'inquirer';
import { getSystemDisplayName } from '@sap-ux/fiori-generator-shared';

/**
 * Returns a list of destination choices.
 *
 * @param destinations destinations retrieved from BTP
 * @returns choices for destinations
 */
function getDestinationChoices(destinations: Destinations = {}): AbapSystemChoice[] {
    const systemChoices: AbapSystemChoice[] = Object.values(destinations).map((destination) => {
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
 * Returns the display name for the backend system.
 *
 * @param options options for display name
 * @param options.backendSystem backend system
 * @param options.includeUserName include user name in the display name
 * @returns backend display name
 */
function getBackendDisplayName({
    backendSystem,
    includeUserName = true
}: {
    backendSystem: BackendSystem;
    includeUserName?: boolean;
}): string {
    const userDisplayName =
        includeUserName && backendSystem.userDisplayName ? ` [${backendSystem.userDisplayName}]` : '';
    const systemDisplayName = getSystemDisplayName(
        backendSystem.name,
        userDisplayName,
        !!backendSystem.serviceKeys,
        backendSystem.authenticationType === AuthenticationType.ReentranceTicket
    );

    return systemDisplayName + userDisplayName;
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
    let target: UrlAbapTarget | undefined;
    let targetExists = false;

    const choices: AbapSystemChoice[] = [
        {
            name: t('choices.targetSystemUrl'),
            value: TargetSystemType.Url
        }
    ];

    if (backendTarget?.abapTarget) {
        target = (backendTarget.abapTarget as UrlAbapTarget) ?? {};
    }

    Object.values(backendSystems).forEach((system) => {
        targetExists = system.url === target?.url && (system.client ?? '') === (target?.client ?? '');
        choices.push({
            name: targetExists
                ? `${getBackendDisplayName({ backendSystem: system })} (Source system)`
                : getBackendDisplayName({ backendSystem: system }) ?? '',
            value: system.url,
            isDefault: targetExists,
            scp: !!system.serviceKeys,
            isS4HC: system.authenticationType === AuthenticationType.ReentranceTicket,
            client: system.client
        });
    });

    if (!targetExists && target?.url) {
        const systemName = backendTarget?.name ?? target.url;
        const user = await backendTarget?.abapServiceProvider?.user();
        // add the target system to the list if it does not exist in the store yet
        choices.splice(1, 0, {
            name: `${getSystemDisplayName(
                systemName,
                user,
                target.scp,
                target.authenticationType === AuthenticationType.ReentranceTicket
            )} (Source system)`,
            value: target.url,
            isDefault: true,
            scp: target.scp,
            isS4HC: target.authenticationType === AuthenticationType.ReentranceTicket,
            client: target.client
        });
    }
    return choices;
}

/**
 * Returns a list of the aba system choices comprising of either destinations or backend systems.
 *
 * @param backendTarget - backend target
 * @param destinations - destinations retrieved from BTP
 * @param backendSystems - backend systems retrieved from store
 * @returns choices for ABAP systems
 */
export async function getAbapSystemChoices(
    backendTarget?: BackendTarget,
    destinations?: Destinations,
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
        LoggerHelper.logger.error('errors.abapSystemChoices');
    }
    return choices;
}

/**
 * Returns a list of the client choice prompt options.
 *
 * @param options abap deploy config prompt options
 * @returns list of client choice options
 */
export function getClientChoicePromptChoices(options: AbapDeployConfigPromptOptions): ChoiceOptions[] {
    return [
        {
            name: t('choices.clientChoice.existing', {
                client: options.backendTarget?.abapTarget?.client
            }),
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
 * @returns list of transport choices
 */
export function getTransportChoices(): ListChoiceOptions[] {
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

    return [manualChoice, listExistingChoice, createDuringDeployChoice, createNewChoice];
}

/**
 * Ensures the URL in the state is update accordingly.
 *
 * @param options - abap deploy config prompt options
 * @param previousAnswers - previous answers
 * @param destinations - destinations retrieved from BTP
 */
export function updateGeneratorUrl(
    options: AbapDeployConfigPromptOptions,
    previousAnswers: AbapDeployConfigAnswers,
    destinations?: Destinations
): void {
    let destinationUrl: string | undefined;
    if (previousAnswers.destination && destinations) {
        destinationUrl = destinations[previousAnswers.destination].Host;
    }

    const targetSystemChoice =
        previousAnswers?.targetSystem && previousAnswers.targetSystem !== TargetSystemType.Url
            ? previousAnswers.targetSystem
            : undefined;

    if (PromptState?.abapDeployConfig) {
        PromptState.abapDeployConfig.url =
            destinationUrl ?? targetSystemChoice ?? options.backendTarget?.abapTarget.url ?? '';
    }
}

/**
 * Queries the packages based on the input provided.
 *
 * @param isCli - is running in CLI
 * @param input - package input
 * @param previousAnswers - previous answers
 * @param options - abap deploy config prompt options
 * @returns results of query and message based on number of results
 */
export async function getPackageChoices(
    isCli: boolean,
    input: string,
    previousAnswers: AbapDeployConfigAnswers,
    options: AbapDeployConfigPromptOptions
): Promise<{ results: string[]; morePackageResultsMsg: string }> {
    const results: string[] = [];
    let morePackageResultsMsg = '';
    // For YUI we need to ensure input is provided so the prompt is not re-rendered with no input
    if (isCli || input) {
        const results = await queryPackages(input, options, {
            url: PromptState.abapDeployConfig.url,
            client: PromptState.abapDeployConfig.client,
            destination: PromptState.abapDeployConfig.destination
        });
        morePackageResultsMsg =
            results && results.length === ABAP_PACKAGE_SEARCH_MAX_RESULTS
                ? t('prompts.config.package.packageAutocomplete.sourceMessage', { numResults: results.length })
                : morePackageResultsMsg;
        if (previousAnswers.packageAutocomplete) {
            const index = results.indexOf(previousAnswers.packageAutocomplete);
            if (index !== -1) {
                results.splice(0, 0, results.splice(index, 1)[0]); // move previous answer to top of choices list
            }
        }
    }
    return {
        results,
        morePackageResultsMsg
    };
}
