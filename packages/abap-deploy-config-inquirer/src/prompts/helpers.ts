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
    let target: UrlAbapTarget | undefined;
    let targetExistsInStore = false;

    const choices: AbapSystemChoice[] = [
        {
            name: t('choices.targetSystemUrl'),
            value: TargetSystemType.Url
        }
    ];

    if (backendTarget?.abapTarget) {
        target = (backendTarget.abapTarget as UrlAbapTarget) ?? {};
    }

    const systemChoices: AbapSystemChoice[] = Object.values(backendSystems)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, caseFirst: 'lower' }))
        .map((system) => {
            let isDefault = false;
            if (!targetExistsInStore && target?.url) {
                isDefault = targetExistsInStore =
                    system.url.trim().replace(/\/$/, '') === target.url.trim().replace(/\/$/, '') &&
                    (system.client ?? '') === (target?.client ?? '');
            }
            return {
                name: isDefault
                    ? `${getBackendSystemDisplayName(system)} (Source system)`
                    : getBackendSystemDisplayName(system) ?? '',
                value: system.url,
                isDefault,
                scp: !!system.serviceKeys, // legacy service key store entries
                isAbapCloud: system.authenticationType === AuthenticationType.ReentranceTicket,
                client: system.client
            };
        });

    choices.push(...systemChoices);

    // the backend system may have been added during generation but not yet saved in the store
    // in this case we need to add it to the choices
    if (!targetExistsInStore && target?.url && backendTarget?.systemName) {
        const systemName = backendTarget.systemName;
        const user = await (backendTarget.serviceProvider as AbapServiceProvider)?.user();
        choices.splice(1, 0, {
            name: `${getSystemDisplayName(
                systemName,
                user,
                target.scp || target.authenticationType === AuthenticationType.ReentranceTicket
                    ? 'ABAPCloud'
                    : undefined // scp is retained for legacy apps yamls that contain this value
            )} (Source system)`,
            value: target.url,
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
        LoggerHelper.logger.error('errors.abapSystemChoices');
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

    const targetSystemChoice =
        previousAnswers?.targetSystem && previousAnswers.targetSystem !== TargetSystemType.Url
            ? previousAnswers.targetSystem
            : undefined;

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
            packages && packages.length === ABAP_PACKAGE_SEARCH_MAX_RESULTS
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
