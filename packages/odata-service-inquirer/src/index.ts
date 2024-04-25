import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { ErrorHandler } from './error-handler/error-handler';
import { getQuestions } from './prompts';
import LoggerHelper from './prompts/logger-helper';
import { PromptStateHelper } from './prompts/prompt-helpers';
import { validateODataVersion } from './prompts/validators';
import type { OdataServiceAnswers, OdataServicePromptOptions, OdataServiceQuestion } from './types';
import { DatasourceType, promptNames, type CapRuntime, type CapService } from './types';
import { type ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { setTelemetryClient } from './utils';

/**
 * Get the inquirer prompts for odata service.
 *
 * @param promptOptions
 * @param logger    - a logger compatible with the {@link Logger} interface
 * @param enableGuidedAnswers
 * @returns the prompts used to provide input for odata service generation
 */
async function getPrompts(
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger,
    enableGuidedAnswers = false
): Promise<OdataServiceQuestion[]> {
    // Initialize the logger refs
    LoggerHelper.logger = logger ?? new ToolsLogger({ logPrefix: '@sap-ux/odata-service-inquirer' });
    ErrorHandler.logger = LoggerHelper.logger;
    ErrorHandler.guidedAnswersEnabled = enableGuidedAnswers;

    return getQuestions(promptOptions);
}

/**
 * Prompt for odata service writer inputs.
 *
 * @param adapter
 * @param promptOptions
 * @param logger
 * @param enableGuidedAnswers - if true, the prompts will use guided answers to help users with validation errors
 * @param telemetryClient - the telemetry client to use for sending telemetry data
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger,
    enableGuidedAnswers?: boolean,
    telemetryClient?: ToolsSuiteTelemetryClient
): Promise<OdataServiceAnswers> {
    setTelemetryClient(telemetryClient);

    const odataServicePrompts = await getPrompts(promptOptions, logger, enableGuidedAnswers);

    const answers = await adapter.prompt<OdataServiceAnswers>(odataServicePrompts);

    // Add dervied service answers to the answers object
    Object.assign(answers, PromptStateHelper.odataService);

    return answers;
}

export {
    DatasourceType,
    OdataVersion,
    getPrompts,
    prompt,
    promptNames,
    // temp exports, remove once development is done
    validateODataVersion,
    type CapRuntime,
    type CapService,
    type InquirerAdapter,
    type OdataServiceAnswers,
    type OdataServicePromptOptions
};
