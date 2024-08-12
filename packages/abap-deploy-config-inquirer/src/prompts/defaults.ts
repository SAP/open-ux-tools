import { DEFAULT_PACKAGE_ABAP } from '../constants';
import { PromptState } from './prompt-state';
import {
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type AbapSystemChoice
} from '../types';

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
 * Determines the default url based on the target system or the backend target.
 *
 * @param options - abap deploy config prompt options
 * @param targetSystem - chosen target system
 * @returns default url
 */
export function defaultUrl(options: AbapDeployConfigPromptOptions, targetSystem?: string): string {
    return targetSystem === TargetSystemType.Url ? '' : PromptState.abapDeployConfig.url ?? '';
}

/**
 * Determines the default repository name based on the previous answers or the existing deploy task config.
 *
 * @param previousAnswers - previous answers
 * @param options - abap deploy config prompt options
 * @returns default repository name
 */
export function defaultAbapRepositoryName(
    previousAnswers: AbapDeployConfigAnswersInternal,
    options: AbapDeployConfigPromptOptions
): string | undefined {
    return previousAnswers.ui5AbapRepo || options.existingDeployTaskConfig?.name;
}

/**
 * Determines the default app description based on the previous answers or the existing deploy task config.
 *
 * @param previousAnswers - previous answers
 * @param options - aba deploy config prompt options
 * @returns default app description
 */
export function defaultAppDescription(
    previousAnswers: AbapDeployConfigAnswersInternal,
    options: AbapDeployConfigPromptOptions
): string | undefined {
    return previousAnswers.description || options.existingDeployTaskConfig?.description;
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
 * @param options - abap deploy config prompt options
 * @param previousAnswers - previous answers
 * @returns default package
 */
export function defaultPackage(
    options: AbapDeployConfigPromptOptions,
    previousAnswers: AbapDeployConfigAnswersInternal
): string {
    if (PromptState.abapDeployConfig.scp) {
        return previousAnswers.packageManual || options.existingDeployTaskConfig?.package || '';
    } else {
        let defaultPkg = '';
        // if atoSettings are enabled and operationsType is P (on-premise) we default to $tmp
        if (PromptState.transportAnswers.transportConfig?.getOperationsType() === 'P') {
            defaultPkg = DEFAULT_PACKAGE_ABAP;
        }
        return previousAnswers.packageManual || options.existingDeployTaskConfig?.package || defaultPkg;
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
export function defaultTransportListChoice(numTransportListChoice?: number) {
    return numTransportListChoice && numTransportListChoice > 1 ? undefined : 0;
}

/**
 * Determines the default transport request based on the previous answers or the existing deploy task config.
 *
 * @param options - abap deploy config prompt options
 * @param previousAnswers - previous answers
 * @returns default transport request number
 */
export function defaultTransportRequestNumber(
    options: AbapDeployConfigPromptOptions,
    previousAnswers: AbapDeployConfigAnswersInternal
): string | undefined {
    return previousAnswers.transportManual || options.existingDeployTaskConfig?.transport;
}
