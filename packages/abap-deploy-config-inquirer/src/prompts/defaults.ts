import { DEFAULT_PACKAGE_ABAP } from '../constants';
import { PromptState } from './prompt-state';
import { PackageInputChoices, TargetSystemType, TransportChoices, type AbapSystemChoice } from '../types';

/**
 * Determines the default target system from the abap system choices.
 *
 * @param targetSystems - list of target systems
 * @returns default target system
 */
export function defaultTargetSystem(targetSystems?: AbapSystemChoice[]): string | undefined {
    let defaultTargetSystem;
    const targetSystem = targetSystems?.find((choice) => choice.isDefault === true);
    if (targetSystem) {
        defaultTargetSystem = targetSystem.value;
    }
    return defaultTargetSystem;
}

/**
 * Determines the default url based on the target system or the prompt state.
 *
 * @param targetSystem - chosen target system
 * @returns default url
 */
export function defaultUrl(targetSystem?: string): string {
    return targetSystem === TargetSystemType.Url ? '' : PromptState.abapDeployConfig.url ?? '';
}

/**
 * Determines the default package choice based on the previous package input choice.
 *
 * @param previousPackageInputChoice - previous package choice
 * @returns default package choice
 */
export function defaultPackageChoice(previousPackageInputChoice?: PackageInputChoices): string {
    return previousPackageInputChoice ?? PackageInputChoices.EnterManualChoice;
}

/**
 * Determines the default package based on the previous answers or the existing deploy task config.
 *
 * @param existingPkg - existing package from manual input prompt or backend config
 * @returns default package
 */
export function defaultPackage(existingPkg?: string): string {
    if (PromptState.abapDeployConfig.scp) {
        return existingPkg || '';
    } else {
        let defaultPkg = '';
        // if atoSettings are enabled and operationsType is P (on-premise) we default to $tmp
        if (PromptState.transportAnswers.transportConfig?.getOperationsType() === 'P') {
            defaultPkg = DEFAULT_PACKAGE_ABAP;
        }
        return existingPkg || defaultPkg;
    }
}

/**
 * Determines the default user choice of how to provide transport number.
 *
 * @param previousTransportInputChoice - previous user choice
 * @param createTrDuringDeploy - existing ui5-deploy.yaml config that indicates to create TR during deployment.
 * @returns default choice of transport input choice
 */
export function defaultTransportRequestChoice(
    previousTransportInputChoice?: TransportChoices,
    createTrDuringDeploy = false
): string {
    if (previousTransportInputChoice) {
        return previousTransportInputChoice;
    } else if (createTrDuringDeploy) {
        return TransportChoices.CreateDuringDeployChoice;
    } else {
        return TransportChoices.EnterManualChoice;
    }
}

/**
 * Determines the transport request list choice based on the number of transports i.e if there is only it will be the default.
 *
 * @param numTransportListChoice - number of transport requests
 * @returns default client choice
 */
export function defaultTransportListChoice(numTransportListChoice?: number): number | undefined {
    return numTransportListChoice && numTransportListChoice > 1 ? undefined : 0;
}
