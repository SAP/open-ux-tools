import type { Destination, Destinations, ServiceInfo } from '@sap-ux/btp-utils';
import {
    getDisplayName,
    isAbapODataDestination,
    isAppStudio,
    isFullUrlDestination,
    isGenericODataDestination,
    isPartialUrlDestination,
    listDestinations
} from '@sap-ux/btp-utils';
import { ERROR_TYPE } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { type BackendSystemKey, type BackendSystem, SystemService } from '@sap-ux/store';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../../../../i18n';
import type { ConnectedSystem, DestinationFilters } from '../../../../types';
import { convertODataVersionType, PromptState, removeCircularFromServiceProvider } from '../../../../utils';
import type { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import type { ValidationResult } from '../../../types';
import { getBackendSystemDisplayName } from '@sap-ux/fiori-generator-shared';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const NewSystemChoice = '!@£*&937newSystem*X~qy^';
export type NewSystemChoice = typeof NewSystemChoice;
export const CfAbapEnvServiceChoice = 'cfAbapEnvService';
export type CfAbapEnvServiceChoice = typeof CfAbapEnvServiceChoice;

export type SystemSelectionAnswerType = {
    type: 'destination' | 'backendSystem' | 'newSystemChoice' | CfAbapEnvServiceChoice;
    system: Destination | BackendSystem | NewSystemChoice | CfAbapEnvServiceChoice;
};

/**
 * Connects to the specified backend system and validates the connection.
 * Note this will return true in the case of basic auth validation failure to defer validation to the credentials prompt.
 *
 * @param backendKey the key {url, client} of the backend system
 * @param connectionValidator the connection validator to use for the connection
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @param cachedConnectedSystem - if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns the validation result of the backend system connection
 */
export async function connectWithBackendSystem(
    backendKey: BackendSystemKey,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion,
    cachedConnectedSystem?: ConnectedSystem
): Promise<ValidationResult> {
    // Create a new connection with the selected system
    PromptState.resetConnectedSystem();
    let connectValResult: ValidationResult = false;
    const backendSystem = await new SystemService(LoggerHelper.logger).read(backendKey);

    if (backendSystem) {
        // Backend systems validation supports using a cached service provider to prevent re-authentication (e.g. re-opening a browser window)
        // In case the user has changed the URL, do not use the cached service provider.
        if (cachedConnectedSystem && cachedConnectedSystem.backendSystem?.url === backendSystem.url) {
            connectionValidator.setConnectedSystem(cachedConnectedSystem);
        }
        // Assumption: non-BAS systems are BackendSystems
        if (backendSystem.authenticationType === 'reentranceTicket') {
            connectValResult = await connectionValidator.validateUrl(backendSystem.url, {
                isSystem: true,
                odataVersion: convertODataVersionType(requiredOdataVersion),
                systemAuthType: 'reentranceTicket'
            });
        } else if (backendSystem.serviceKeys) {
            connectValResult = await connectionValidator.validateServiceInfo(
                backendSystem.serviceKeys as ServiceInfo,
                convertODataVersionType(requiredOdataVersion)
            );
        } else if (backendSystem.authenticationType === 'basic' || !backendSystem.authenticationType) {
            let errorType;
            ({ valResult: connectValResult, errorType } = await connectionValidator.validateAuth(
                backendSystem.url,
                backendSystem.username,
                backendSystem.password,
                {
                    isSystem: true,
                    odataVersion: convertODataVersionType(requiredOdataVersion),
                    sapClient: backendSystem.client
                }
            ));
            // If authentication failed with existing credentials the user will be prompted to enter new credentials.
            // We log the error in case there is another issue (unresolveable) with the stored backend configuration.
            if (
                errorType === ERROR_TYPE.AUTH &&
                typeof backendSystem.username === 'string' &&
                typeof backendSystem.password === 'string'
            ) {
                LoggerHelper.logger.error(
                    t('errors.storedSystemConnectionError', {
                        systemName: backendSystem.name,
                        error: connectValResult
                    })
                );
                return true;
            }
        }
        // If the connection is successful, we will return the connected system from the inquirer
        if (connectValResult === true && connectionValidator.serviceProvider) {
            PromptState.odataService.connectedSystem = {
                serviceProvider: removeCircularFromServiceProvider(connectionValidator.serviceProvider),
                backendSystem
            };
        }
    }
    return connectValResult;
}

/**
 * Connects to the specified destination and validates the connection.
 * Note that a destination may be a system or a service connection.
 *
 * @param destination the destination specifying the connection details
 * @param connectionValidator the connection validator to use for the connection
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @param addServicePath the service path to add to the destination URL
 * @returns the validation result of the destination connection attempt
 */
export async function connectWithDestination(
    destination: Destination,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion,
    addServicePath?: string
): Promise<ValidationResult> {
    PromptState.resetConnectedSystem();
    const { valResult: connectValResult, errorType } = await connectionValidator.validateDestination(
        destination,
        convertODataVersionType(requiredOdataVersion),
        addServicePath
    );

    // If authentication failed with an auth error, and the system connection auth type is basic, we will defer validation to the credentials prompt.
    if (errorType === ERROR_TYPE.AUTH && connectionValidator.systemAuthType === 'basic') {
        LoggerHelper.logger.error(
            t('errors.destination.authError', { systemName: destination.Name, error: connectValResult })
        );
        return true;
    }

    // If the connection is successful, we will return the connected system from the inquirer
    if (connectValResult === true && connectionValidator.serviceProvider) {
        PromptState.odataService.connectedSystem = {
            serviceProvider: removeCircularFromServiceProvider(connectionValidator.serviceProvider),
            destination
        };
    }

    // Deal with all destination errors here
    return connectValResult;
}

/**
 * Matches the destination against the provided filters. Returns true if the destination matches any filters, false otherwise.
 *
 * @param destination the destination to match against the filters
 * @param filters the filters to match against
 * @returns true if the destination matches any filters, false otherwise
 */
function matchesFilters(destination: Destination, filters?: Partial<DestinationFilters>): boolean {
    if (!filters) {
        return true;
    }
    if (filters.odata_abap && isAbapODataDestination(destination)) {
        return true;
    }

    if (filters.odata_generic && isGenericODataDestination(destination)) {
        return true;
    }

    if (filters.full_service_url && isFullUrlDestination(destination)) {
        return true;
    }

    if (filters.partial_service_url && isPartialUrlDestination(destination)) {
        return true;
    }
    LoggerHelper.logger.debug(
        `Destination: ${
            destination.Name
        } does not match any filters and will be excluded as a prompt choice. Destination configuration: ${JSON.stringify(
            destination
        )}`
    );
    return false;
}

/**
 * Creates a list of choices for the system selection prompt using destinations or stored backend systems, depending on the environment.
 *
 * @param destinationFilters the filters to apply to the destination choices
 * @param includeCloudFoundryAbapEnvChoice whether to include the Cloud Foundry ABAP environment choice in the list
 * @returns a list of choices for the system selection prompt
 */
export async function createSystemChoices(
    destinationFilters?: Partial<DestinationFilters>,
    includeCloudFoundryAbapEnvChoice = false
): Promise<ListChoiceOptions<SystemSelectionAnswerType>[]> {
    let systemChoices: ListChoiceOptions<SystemSelectionAnswerType>[] = [];
    let newSystemChoice: ListChoiceOptions<SystemSelectionAnswerType> | undefined;

    // If this is BAS, return destinations, otherwise return stored backend systems
    if (isAppStudio()) {
        let destinations: Destinations = {};
        try {
            destinations = await listDestinations({ stripS4HCApiHosts: true });
        } catch (e) {
            LoggerHelper.logger.error(
                t('errors.destination.listDestinations', {
                    error: e.message
                })
            );
        }
        systemChoices = Object.values(destinations)
            .filter((destination) => {
                return matchesFilters(destination, destinationFilters);
            })
            .map((destination) => {
                return {
                    name: getDisplayName(destination),
                    value: {
                        type: 'destination',
                        system: destination
                    } as SystemSelectionAnswerType
                };
            });
        if (includeCloudFoundryAbapEnvChoice) {
            newSystemChoice = {
                name: t('prompts.newSystemType.choiceCFAbapEnvServiceOnBtp'),
                value: {
                    type: CfAbapEnvServiceChoice,
                    system: CfAbapEnvServiceChoice
                } as SystemSelectionAnswerType
            };
        }
    } else {
        const backendSystems = await new SystemService(LoggerHelper.logger).getAll({ includeSensitiveData: false });
        // Cache the backend systems
        PromptState.backendSystemsCache = backendSystems;

        systemChoices = backendSystems.map((system) => {
            return {
                name: getBackendSystemDisplayName(system),
                value: {
                    system,
                    type: 'backendSystem'
                } as SystemSelectionAnswerType
            };
        });
        newSystemChoice = {
            name: t('prompts.systemSelection.newSystemChoiceLabel'),
            value: { type: 'newSystemChoice', system: NewSystemChoice } as SystemSelectionAnswerType
        };
    }
    systemChoices.sort(({ name: nameA }, { name: nameB }) =>
        nameA!.localeCompare(nameB!, undefined, { numeric: true, caseFirst: 'lower' })
    );
    if (newSystemChoice) {
        systemChoices.unshift(newSystemChoice);
    }
    return systemChoices;
}

/**
 * Find the default selection index based on the default choice value.
 *
 * @param systemChoices the list of system choices
 * @param defaultChoice the default choice value
 * @returns the index of the default choice in the system choices list
 */
export function findDefaultSystemSelectionIndex(
    systemChoices: ListChoiceOptions<SystemSelectionAnswerType>[],
    defaultChoice: string | undefined
): number {
    if (!defaultChoice) {
        return -1;
    }
    const defaultChoiceIndex = systemChoices.findIndex((choice) => {
        const { type: systemType, system } = choice.value as SystemSelectionAnswerType;
        if (systemType === 'destination') {
            return (system as Destination).Name === defaultChoice;
        }
        if (systemType === 'backendSystem') {
            return (system as BackendSystem).name === defaultChoice;
        }
        if (systemType === 'newSystemChoice') {
            return defaultChoice === NewSystemChoice;
        }
        if (systemType === 'cfAbapEnvService') {
            return defaultChoice === CfAbapEnvServiceChoice;
        }
    });
    return defaultChoiceIndex;
}
