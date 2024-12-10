import type { YUIQuestion, GuiOptions, PromptSeverityMessage } from '@sap-ux/inquirer-common';
import type { ListQuestionOptions } from 'inquirer';

/**
 * Enumeration of prompt names used in the FLP configuration.
 */
export enum promptNames {
    inboundId = 'inboundId',
    emptyInboundsInfo = 'emptyInboundsInfo',
    semanticObject = 'semanticObject',
    action = 'action',
    overwrite = 'overwrite',
    title = 'title',
    subTitle = 'subTitle',
    additionalParameters = 'additionalParameters',
    createAnotherInbound = 'createAnotherInbound'
}

/**
 * Interface representing the answers collected from the FLP configuration prompts.
 */
export interface FLPConfigAnswers {
    [promptNames.inboundId]?: string;
    [promptNames.emptyInboundsInfo]?: string;
    [promptNames.semanticObject]: string;
    [promptNames.action]: string;
    [promptNames.overwrite]?: boolean;
    [promptNames.title]?: string;
    [promptNames.subTitle]?: string;
    [promptNames.additionalParameters]?: string;
    [promptNames.createAnotherInbound]?: boolean;
    s4Continue?: boolean;
}

/**
 * Boolean reference to already existing inbound id key.
 */
export interface ExistingInboundRef {
    value: boolean;
}

/**
 * The question type specific to FLP configuration prompts.
 */
export interface FLPConfigQuestion
    extends YUIQuestion<FLPConfigAnswers>,
        Partial<Pick<ListQuestionOptions, 'choices'>> {
    name: promptNames;
    guiOptions?: GuiOptions;
    additionalMessages?: PromptSeverityMessage;
}

/**
 * Options for the 'inboundId' prompt.
 */
export interface InboundIdPromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * Options for the 'empty inbound label' prompt.
 */
export interface EmptyInboundsLabelOptions {
    hide?: boolean;
}

/**
 * Options for the 'semanticObject' prompt.
 */
export interface SemanticObjectPromptOptions {
    default?: string;
}

/**
 * Options for the 'action' prompt.
 */
export interface ActionPromptOptions {
    default?: string;
}

/**
 * Options for the 'overwrite' prompt.
 */
export interface OverwritePromptOptions {
    hide?: boolean;
    default?: boolean;
}

/**
 * Options for the 'title' prompt.
 */
export interface TitlePromptOptions {
    default?: string;
}

/**
 * Options for the 'subTitle' prompt.
 */
export interface SubTitlePromptOptions {
    default?: string;
}

/**
 * Options for the 'additionalParameters' prompt.
 */
export interface ParameterStringPromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * Options for the 'createAnotherInbound' prompt.
 */
export interface CreateAnotherInboundPromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * The options which are common for the FLP config inquirer.
 */
type FLPConfigCommonInquirerOptions = {
    silentOverwrite?: boolean;
};

/**
 * The options for the FLP config inquirer & the prompts.
 */
type flpConfigPromptOptions = Record<promptNames.inboundId, InboundIdPromptOptions> &
    Record<promptNames.emptyInboundsInfo, EmptyInboundsLabelOptions> &
    Record<promptNames.semanticObject, SemanticObjectPromptOptions> &
    Record<promptNames.action, ActionPromptOptions> &
    Record<promptNames.overwrite, OverwritePromptOptions> &
    Record<promptNames.title, TitlePromptOptions> &
    Record<promptNames.subTitle, SubTitlePromptOptions> &
    Record<promptNames.additionalParameters, ParameterStringPromptOptions> &
    Record<promptNames.createAnotherInbound, CreateAnotherInboundPromptOptions>;

/**
 * The options for the FLP config inquirer & the prompts.
 */
export type FLPConfigPromptOptions = Partial<flpConfigPromptOptions> & FLPConfigCommonInquirerOptions;
