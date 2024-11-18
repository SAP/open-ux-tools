import type { YUIQuestion, GuiOptions, PromptSeverityMessage } from '@sap-ux/inquirer-common';

export type AllowedCharacters = '_';

/**
 * Enumeration of prompt names used in the FLP configuration.
 */
export enum promptNames {
    semanticObject = 'semanticObject',
    action = 'action',
    overwrite = 'overwrite',
    title = 'title',
    subTitle = 'subTitle'
}

/**
 * Interface representing the answers collected from the FLP configuration prompts.
 */
export interface FLPConfigAnswers {
    [promptNames.semanticObject]: string;
    [promptNames.action]: string;
    [promptNames.overwrite]?: boolean;
    [promptNames.title]?: string;
    [promptNames.subTitle]?: string;
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
export interface FLPConfigQuestion extends YUIQuestion<FLPConfigAnswers> {
    name: promptNames;
    guiOptions?: GuiOptions;
    additionalMessages?: PromptSeverityMessage;
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
 * The options which are common for the FLP config inquirer.
 */
type FLPConfigCommonInquirerOptions = {
    silentOverwrite?: boolean;
};

/**
 * The options for the FLP config inquirer & the prompts.
 */
type flpConfigPromptOptions = Record<promptNames.semanticObject, SemanticObjectPromptOptions> &
    Record<promptNames.action, ActionPromptOptions> &
    Record<promptNames.overwrite, OverwritePromptOptions> &
    Record<promptNames.title, TitlePromptOptions> &
    Record<promptNames.subTitle, SubTitlePromptOptions>;

/**
 * The options for the FLP config inquirer & the prompts.
 */
export type FLPConfigPromptOptions = Partial<flpConfigPromptOptions> & FLPConfigCommonInquirerOptions;
