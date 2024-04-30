import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { type ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { ErrorHandler } from './error-handler/error-handler';
import { getQuestions } from './prompts';
import LoggerHelper from './prompts/logger-helper';
import {
    DatasourceType,
    promptNames,
    type CapRuntime,
    type CapService,
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    type OdataServiceQuestion
} from './types';
import { PromptState, setTelemetryClient } from './utils';

/**
 * Get the inquirer prompts for odata service.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link OdataServicePromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @param enableGuidedAnswers - if true, the prompts will use guided answers to help users with validation errors
 * @returns the prompts used to provide input for odata service generation
 */
async function getPrompts(
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger,
    enableGuidedAnswers = false
): Promise<OdataServiceQuestion[]> {
    LoggerHelper.logger = logger ?? new ToolsLogger({ logPrefix: '@sap-ux/odata-service-inquirer' });
    ErrorHandler.logger = LoggerHelper.logger;
    ErrorHandler.guidedAnswersEnabled = enableGuidedAnswers;

    return getQuestions(promptOptions);
}

/**
 * Prompt for odata service writer inputs.
 *
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param promptOptions - options that can control some of the prompt behavior. See {@link OdataServicePromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @param enableGuidedAnswers - if true, the prompts will use guided answers to help users with validation errors
 * @param telemetryClient - the telemetry client to use for sending telemetry data
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger,
    enableGuidedAnswers?: boolean,
    telemetryClient?: ToolsSuiteTelemetryClient,
    isYUI = false
): Promise<OdataServiceAnswers> {
    PromptState.isYUI = isYUI;

    setTelemetryClient(telemetryClient);

    const odataServicePrompts = await getPrompts(promptOptions, logger, enableGuidedAnswers);

    const answers = await adapter.prompt<OdataServiceAnswers>(odataServicePrompts);

    // Add dervied service answers to the answers object
    Object.assign(answers, PromptState.odataService);

    return answers;
}

export {
    DatasourceType,
    OdataVersion,
    getPrompts,
    prompt,
    promptNames,
    type CapRuntime,
    type CapService,
    type InquirerAdapter,
    type OdataServiceAnswers,
    type OdataServicePromptOptions
};
