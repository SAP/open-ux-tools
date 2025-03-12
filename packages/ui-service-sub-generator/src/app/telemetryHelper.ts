import { ObjectType } from '@sap-ux/ui-service-inquirer';
import type { UiServiceAnswers } from '@sap-ux/ui-service-inquirer';
import type { TelemetryProperties } from '@sap-ux/telemetry';

/**
 * Get the telemetry data for the UI Service generator event.
 *
 * @param answers - the answers to the UI Service prompts
 * @param options - the options passed to the generator
 * @returns the telemetry data
 */
export function getTelemetryData(answers: UiServiceAnswers, options: any): TelemetryProperties {
    let source: string | undefined;
    if (options.data?.path) {
        source = 'Storyboard';
    } else if (options.data?.providerSystem) {
        source = 'ServiceCenter';
    }
    return {
        ...(!!source && { LaunchSource: source }), // only add source if it exists, same as app gen telemetry
        ObjectType: answers.businessObjectInterface ? ObjectType.BUSINESS_OBJECT : ObjectType.CDS_VIEW,
        DraftEnabled: !!answers.draftEnabled,
        LaunchAppGen: !!answers.launchAppGen
    };
}
