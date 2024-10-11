import type { Destination, ServiceInfo } from '@sap-ux/btp-utils';
import { isAppStudio, WebIDEUsage } from '@sap-ux/btp-utils';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import type { BackendSystem } from '@sap-ux/store';
import { convertODataVersionType, PromptState } from '../../../../utils';
import type { ValidationResult } from '../../../connectionValidator';
import type { ConnectionValidator } from '../../../connectionValidator';
import { t } from '../../../../i18n';
import LoggerHelper from '../../../logger-helper';
import { ERROR_TYPE } from '../../../../error-handler/error-handler';

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
    if (!isAppStudio() && backendSystem) {
        // Assumption: non-BAS systems are BackendSystems
        if (backendSystem.authenticationType === 'reentranceTicket') {
            connectValResult = await connectionValidator.validateUrl(backendSystem.url, {
                isSystem: true,
                odataVersion: convertODataVersionType(requiredOdataVersion),
                systemAuthType: 'reentranceTicket'
            });
        } else if (backendSystem.serviceKeys) {
            connectValResult = await connectionValidator.validateServiceInfo(backendSystem.serviceKeys as ServiceInfo);
        } else if (
            (backendSystem.authenticationType === 'basic' || !backendSystem.authenticationType) &&
            backendSystem.username &&
            backendSystem.password
        ) {
            connectValResult = await connectionValidator.validateAuth(
                backendSystem.url,
                backendSystem.username,
                backendSystem.password,
                {
                    isSystem: true,
                    odataVersion: convertODataVersionType(requiredOdataVersion),
                    sapClient: backendSystem.client
                }
            );
            // If authentication failed with existing credentials the user will be prompted to enter new credentials.
            // Returning true will effectively defer validation to the credentials prompt.
            // We log the error in case there is another issue (unresolveable) with the stored backend configuration.
            if (connectValResult !== true) {
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
 * @returns the validation result of the destination connection attempt
 */
export async function connectWithDestination(
    destination: Destination,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<ValidationResult> {
    const { valResult: connectValResult, errorType } = await connectionValidator.validateDestination(
        destination,
        convertODataVersionType(requiredOdataVersion)
    );

    // If authentication failed with an auth error, and the system connection auth type is basic, we will defer validation to the credentials prompt.
    if (errorType === ERROR_TYPE.AUTH && connectionValidator.systemAuthType === 'basic') {
        LoggerHelper.logger.error(
            t('errors.destinationAuthError', { systemName: destination.Name, error: connectValResult })
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

    return connectValResult;
}

/**
 * Creates and returns a display name for the system, appending the system type and user display name if available.
 *
 * @param system the backend system to create a display name for
 * @returns the display name for the system
 */
export function getSystemDisplayName(system: BackendSystem): string {
    const userDisplayName = system.userDisplayName ? ` [${system.userDisplayName}]` : '';
    const systemTypeName =
        system.authenticationType === 'reentranceTicket' || system.authenticationType === 'oauth2'
            ? ` (${t('texts.systemTypeBTP')})`
            : '';

    return `${system.name}${systemTypeName}${userDisplayName}`;
}

// TODO: Replace with the function from btp-utils
/**
 *
 * @param destination
 * @returns true if the destination is an ABAP OData destination
 */
export function isAbapODataDestination(destination: Destination): boolean {
    return (
        !!destination.WebIDEUsage?.includes(WebIDEUsage.ODATA_ABAP) &&
        !destination.WebIDEUsage?.includes(WebIDEUsage.ODATA_GENERIC)
    );
}
