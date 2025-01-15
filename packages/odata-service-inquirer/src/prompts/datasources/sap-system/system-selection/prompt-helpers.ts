import type { Destination, ServiceInfo } from '@sap-ux/btp-utils';
import {
    getDisplayName,
    isAbapODataDestination,
    isAppStudio,
    isFullUrlDestination,
    isGenericODataDestination,
    isPartialUrlDestination,
    listDestinations
} from '@sap-ux/btp-utils';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BackendSystem } from '@sap-ux/store';
import { SystemService } from '@sap-ux/store';
import type { ListChoiceOptions } from 'inquirer';
import { ERROR_TYPE } from '@sap-ux/inquirer-common';
import { t } from '../../../../i18n';
import {
    type DestinationFilters,
    type SelectedSystemType,
    NewSystemChoice,
    CfAbapEnvServiceChoice
} from '../../../../types';
import { convertODataVersionType, PromptState } from '../../../../utils';
import type { ConnectionValidator, ValidationResult } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';

/**
 * Connects to the specified backend system and validates the connection.
 * Note this will return true in the case of basic auth validation failure to defer validation to the credentials prompt.
 *
 * @param backendSystem the backend system to connect to
 * @param connectionValidator the connection validator to use for the connection
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @returns the validation result of the backend system connection
 */
export async function connectWithBackendSystem(
    backendSystem: BackendSystem,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<ValidationResult> {
    // Create a new connection with the selected system
    let connectValResult: ValidationResult = false;
    if (backendSystem) {
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
                convertODataVersionType(requiredOdataVersion),
                backendSystem.refreshToken
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
                    t('errors.storedSystemConnectionError', { systemName: backendSystem.name, error: connectValResult })
                );
                return true;
            }
        }
        // If the connection is successful, we will return the connected system from the inquirer
        if (connectValResult === true && connectionValidator.serviceProvider) {
            PromptState.odataService.connectedSystem = {
                serviceProvider: connectionValidator.serviceProvider,
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
            serviceProvider: connectionValidator.serviceProvider,
            destination
        };
    }

    // Deal with all destination errors here
    return connectValResult;
}

/**
 * Creates and returns a display name for the system, appending the system type and user display name if available.
 *
 * @param system the backend system to create a display name for
 * @returns the display name for the system
 */
export function getBackendSystemDisplayName(system: BackendSystem): string {
    const userDisplayName = system.userDisplayName ? ` [${system.userDisplayName}]` : '';
    let systemTypeName = '';
    if (system.authenticationType === 'reentranceTicket') {
        systemTypeName = ` (${t('texts.systemTypeS4HC')})`;
    }
    if (system.serviceKeys) {
        systemTypeName = ` (${t('texts.systemTypeBTP')})`;
    }
    return `${system.name}${systemTypeName}${userDisplayName}`;
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
): Promise<ListChoiceOptions<SelectedSystemType>[]> {
    let systemChoices: ListChoiceOptions<SelectedSystemType>[] = [];
    let newSystemChoice: ListChoiceOptions<SelectedSystemType> | undefined;

    // If this is BAS, return destinations, otherwise return stored backend systems
    if (isAppStudio()) {
        const destinations = await listDestinations({ stripS4HCApiHosts: true });
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
                    } as SelectedSystemType
                };
            });
        if (includeCloudFoundryAbapEnvChoice) {
            newSystemChoice = {
                name: t('prompts.newSystemType.choiceCFAbapEnvServiceOnBtp'),
                value: {
                    type: CfAbapEnvServiceChoice,
                    system: CfAbapEnvServiceChoice
                } as SelectedSystemType
            };
        }
    } else {
        const backendSystems = await new SystemService(LoggerHelper.logger).getAll();
        systemChoices = backendSystems.map((system) => {
            return {
                name: getBackendSystemDisplayName(system),
                value: {
                    system,
                    type: 'backendSystem'
                } as SelectedSystemType
            };
        });
        newSystemChoice = {
            name: t('prompts.systemSelection.newSystemChoiceLabel'),
            value: { type: 'newSystemChoice', system: NewSystemChoice } as SelectedSystemType
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
    systemChoices: ListChoiceOptions<SelectedSystemType>[],
    defaultChoice: string | undefined
): number {
    if (!defaultChoice) {
        return -1;
    }
    const defaultChoiceIndex = systemChoices.findIndex((choice) => {
        const { type: systemType, system } = choice.value as SelectedSystemType;
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
