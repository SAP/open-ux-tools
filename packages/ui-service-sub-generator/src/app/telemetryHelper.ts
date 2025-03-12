import { ObjectType } from '@sap-ux/ui-service-inquirer';
import type { UiServiceAnswers } from '@sap-ux/ui-service-inquirer';
import type { TelemetryProperties } from '@sap-ux/telemetry';
import type { PromptOptions } from './types';

/**
 * Get the telemetry data for the UI Service generator event.
 *
 * @param answers - the answers to the UI Service prompts
 * @param optionsData - the options passed to the generator
 * @returns the telemetry data
 */
export function getTelemetryData(answers: UiServiceAnswers, optionsData?: PromptOptions): TelemetryProperties {
    let source: string | undefined;
    if (optionsData?.path) {
        source = 'Storyboard';
    } else if (optionsData?.providerSystem) {
        source = 'ServiceCenter';
    }
    return {
        ...(!!source && { LaunchSource: source }), // only add source if it exists, same as app gen telemetry
        ObjectType: answers.businessObjectInterface ? ObjectType.BUSINESS_OBJECT : ObjectType.CDS_VIEW,
        DraftEnabled: !!answers.draftEnabled,
        LaunchAppGen: !!answers.launchAppGen
    };
}
