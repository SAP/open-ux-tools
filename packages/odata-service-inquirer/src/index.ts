import { type InquirerAdapter, ERROR_TYPE, ErrorHandler, setTelemetryClient } from '@sap-ux/inquirer-common';
import { type Logger } from '@sap-ux/logger';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { type ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import type { Question } from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import { initI18nOdataServiceInquirer } from './i18n';
import { getQuestions } from './prompts';
import type { ServiceAnswer } from './prompts/datasources/sap-system/service-selection';
import {
    type SystemSelectionAnswers,
    getSystemSelectionQuestions as getSystemSelectionQuestionsBase
} from './prompts/datasources/sap-system/system-selection';
import type {
    CfAbapEnvServiceChoice,
    NewSystemChoice,
    SystemSelectionAnswerType
} from './prompts/datasources/sap-system/system-selection/prompt-helpers';

import type { Annotations } from '@sap-ux/axios-extension';
import type { CapRuntime, CapService } from '@sap-ux/cap-config-writer';
import type { TemplateType } from '@sap-ux/fiori-elements-writer';
import { getEntitySelectionQuestions } from './prompts/edmx/questions';
import LoggerHelper from './prompts/logger-helper';
import {
    type EntityPromptOptions,
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    type OdataServiceQuestion,
    type SapSystemType,
    type ConnectedSystem,
    DatasourceType,
    EntityRelatedAnswers,
    promptNames
} from './types';
import { getPromptHostEnvironment, PromptState } from './utils';

/**
 * Get the inquirer prompts for odata service.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link OdataServicePromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @param enableGuidedAnswers - if true, the prompts will use guided answers to help users with validation errors
 * @param telemetryClient - the telemetry client to use for sending telemetry data
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host
 * @param connectedSystem - if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns the prompts used to provide input for odata service generation and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
async function getPrompts(
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger,
    enableGuidedAnswers = false,
    telemetryClient?: ToolsSuiteTelemetryClient,
    isYUI = false,
    connectedSystem?: ConnectedSystem
): Promise<{ prompts: OdataServiceQuestion[]; answers: Partial<OdataServiceAnswers> }> {
    // prompt texts must be loaded before the prompts are created, wait for the i18n bundle to be initialized
    await initI18nOdataServiceInquirer();
    if (logger) {
        LoggerHelper.logger = logger;
    }
    ErrorHandler.logger = LoggerHelper.logger;
    ErrorHandler.guidedAnswersEnabled = enableGuidedAnswers;
    // Sets the platform for error handler telem reporting, based on the `isYUI` option
    ErrorHandler.platform = getPromptHostEnvironment().technical;
    ErrorHandler.guidedAnswersTrigger = '@sap-ux/odata-service-inquirer';
    PromptState.isYUI = isYUI;

    setTelemetryClient(telemetryClient);

    return {
        prompts: await getQuestions(promptOptions, connectedSystem),
        // Return reference to derived answers object that will be populated with user responses (after prompting is complete)
        answers: PromptState.odataService
    };
}

/**
 * Get the system selection questions.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link OdataServicePromptOptions} for details
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host. PromptState.isYUI will be set to this value
 * @returns the prompts used to provide input for system selection and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
async function getSystemSelectionQuestions(
    promptOptions?: OdataServicePromptOptions,
    isYUI?: boolean
): Promise<{ prompts: Question<SystemSelectionAnswers & ServiceAnswer>[]; answers: Partial<OdataServiceAnswers> }> {
    if (isYUI !== undefined) {
        PromptState.isYUI = isYUI;
    }
    return {
        prompts: await getSystemSelectionQuestionsBase(promptOptions),
        answers: PromptState.odataService
    };
}

/**
 * Get the questions that may be used to prompt for entity selection, table configuration, annotation generation, and ALP specific table configuration.
 * Since these are releated to service metadata processing and entity selection, they are grouped together.
 *
 * @param metadata the metadata (edmx) string from which to extract entity choices
 * @param templateType the template type which will define the type of prompts and their choices
 * @param isCapService if true, the service is a CAP service, some prompts will be adjusted accordingly
 * @param promptOptions options that can control some of the prompt behavior. See {@link EntityPromptOptions} for details
 * @param annotations annotations to be used for entity selection, only used for analytical list page presentation variant qualifier choices when the edmx odata version is `2`
 * @param logger a logger compatible with the {@link Logger} interface
 * @param isYUI if true, the prompt is being called from the Yeoman UI extension host
 * @returns the prompts which may be used to prompt for entity selection, table configuration, annotation generation, and ALP specific table configuration
 */
function getEntityRelatedPrompts(
    metadata: string,
    templateType: TemplateType,
    isCapService = false,
    promptOptions?: EntityPromptOptions,
    annotations?: Annotations,
    logger?: Logger,
    isYUI = false
): Question<EntityRelatedAnswers>[] {
    if (logger) {
        LoggerHelper.logger = logger;
    }
    PromptState.isYUI = isYUI;
    return getEntitySelectionQuestions(metadata, templateType, isCapService, promptOptions, annotations);
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
 * @param connectedSystem - if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger,
    enableGuidedAnswers?: boolean,
    telemetryClient?: ToolsSuiteTelemetryClient,
    isYUI = false,
    connectedSystem?: ConnectedSystem
): Promise<OdataServiceAnswers> {
    if (adapter?.promptModule && promptOptions?.serviceSelection?.useAutoComplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }
    const odataServicePrompts = (
        await getPrompts(promptOptions, logger, enableGuidedAnswers, telemetryClient, isYUI, connectedSystem)
    ).prompts;
    const answers = await adapter.prompt<OdataServiceAnswers>(odataServicePrompts);
    // Add dervied service answers to the answers object
    Object.assign(answers, PromptState.odataService);
    return answers;
}

export {
    CfAbapEnvServiceChoice,
    // @deprecated - temp export to support to support open source migration
    DatasourceType,
    EntityRelatedAnswers,
    // @deprecated - temp export to support to support open source migration
    ERROR_TYPE,
    // @deprecated - temp export to support to support open source migration
    ErrorHandler,
    getEntityRelatedPrompts,
    getPrompts,
    getSystemSelectionQuestions,
    NewSystemChoice,
    // @deprecated - temp export to support to support open source migration
    OdataVersion,
    prompt,
    promptNames,
    // @deprecated - temp export to support to support open source migration
    SystemSelectionAnswerType,
    type CapRuntime,
    type CapService,
    type InquirerAdapter,
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    // @deprecated - temp export to support to support open source migration
    type SapSystemType
};
