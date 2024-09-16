import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { type Logger } from '@sap-ux/logger';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { type ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import autocomplete from 'inquirer-autocomplete-prompt';
import { ERROR_TYPE, ErrorHandler } from './error-handler/error-handler';
import { initI18nOdataServiceInquirer } from './i18n';
import { getQuestions } from './prompts';
import { newSystemChoiceValue } from './prompts/datasources/sap-system/system-selection';
import LoggerHelper from './prompts/logger-helper';
import {
    DatasourceType,
    promptNames,
    type CapRuntime,
    type CapService,
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    type OdataServiceQuestion,
    type SapSystemType
} from './types';
import { PromptState, setTelemetryClient } from './utils';

/**
 * Get the inquirer prompts for odata service.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link OdataServicePromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @param enableGuidedAnswers - if true, the prompts will use guided answers to help users with validation errors
 * @param telemetryClient - the telemetry client to use for sending telemetry data
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host
 * @returns the prompts used to provide input for odata service generation and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
async function getPrompts(
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger,
    enableGuidedAnswers = false,
    telemetryClient?: ToolsSuiteTelemetryClient,
    isYUI = false
): Promise<{ prompts: OdataServiceQuestion[]; answers: Partial<OdataServiceAnswers> }> {
    // prompt texts must be loaded before the prompts are created, wait for the i18n bundle to be initialized
    await initI18nOdataServiceInquirer();
    if (logger) {
        LoggerHelper.logger = logger;
    }
    ErrorHandler.logger = LoggerHelper.logger;
    ErrorHandler.guidedAnswersEnabled = enableGuidedAnswers;
    PromptState.isYUI = isYUI;
    setTelemetryClient(telemetryClient);

    return {
        prompts: await getQuestions(promptOptions),
        // Return reference to derived answers object that will be populated with user responses (after prompting is complete)
        answers: PromptState.odataService
    };
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
    if (adapter?.promptModule && promptOptions?.serviceSelection?.useAutoComplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }
    const odataServicePrompts = (await getPrompts(promptOptions, logger, enableGuidedAnswers, telemetryClient, isYUI))
        .prompts;
    const answers = await adapter.prompt<OdataServiceAnswers>(odataServicePrompts);
    // Add dervied service answers to the answers object
    Object.assign(answers, PromptState.odataService);
    return answers;
}

export {
    // @derecated - temp export to support to support open source migration
    DatasourceType,
    // @deprecated - temp export to support to support open source migration
    ERROR_TYPE,
    // @deprecated - temp export to support to support open source migration
    ErrorHandler,
    // @deprecated - temp export to support to support open source migration
    OdataVersion,
    // @deprecated - temp export to support to support open source migration
    newSystemChoiceValue,
    // @deprecated - temp export to support to support open source migration
    type SapSystemType,
    getPrompts,
    prompt,
    promptNames,
    type CapRuntime,
    type CapService,
    type InquirerAdapter,
    type OdataServiceAnswers,
    type OdataServicePromptOptions
};
