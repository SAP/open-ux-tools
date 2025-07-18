import type { YUIQuestion, GuiOptions, PromptSeverityMessage } from '@sap-ux/inquirer-common';
import type { ListQuestionOptions } from 'inquirer';
import type { InboundContent } from '@sap-ux/axios-extension';

/**
 * Enumeration of prompt names used in the FLP configuration.
 */
export enum promptNames {
    existingFlpConfigInfo = 'existingFlpConfigInfo',
    inboundId = 'inboundId',
    semanticObject = 'semanticObject',
    action = 'action',
    overwrite = 'overwrite',
    title = 'title',
    subTitle = 'subTitle',
    icon = 'icon',
    additionalParameters = 'additionalParameters'
}

export enum tilePromptNames {
    tileHandlingAction = 'tileHandlingAction',
    copyFromExisting = 'copyFromExisting'
}

/**
 * Interface representing the answers collected from the FLP configuration prompts.
 */
export interface FLPConfigAnswers {
    [promptNames.existingFlpConfigInfo]?: string;
    [promptNames.inboundId]?: InboundContent;
    [promptNames.semanticObject]: string;
    [promptNames.action]: string;
    [promptNames.overwrite]?: boolean;
    [promptNames.title]?: string;
    [promptNames.subTitle]?: string;
    [promptNames.icon]?: string;
    [promptNames.additionalParameters]?: string;
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
export interface ExistingFlpConfigInfo {
    hide?: boolean;
}

/**
 * Options for the 'semanticObject' prompt.
 */
export interface SemanticObjectPromptOptions {
    default?: string;
    hide?: boolean;
    /**
     * If set to true, the prompt will show a tooltip with information about semantic objects prompt.
     */
    showTooltip?: boolean;
}

/**
 * Options for the 'action' prompt.
 */
export interface ActionPromptOptions {
    default?: string;
    hide?: boolean;
    /**
     * If set to false, the prompt will not validate for duplicate semantic object/action combination.
     */
    executeDuplicateValidation?: boolean;
    /**
     * If set to true, the prompt will show a tooltip with information about action prompt.
     */
    showTooltip?: boolean;
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

export interface IconPromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * Options for the 'additionalParameters' prompt.
 */
export interface ParameterStringPromptOptions {
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
    Record<promptNames.semanticObject, SemanticObjectPromptOptions> &
    Record<promptNames.action, ActionPromptOptions> &
    Record<promptNames.overwrite, OverwritePromptOptions> &
    Record<promptNames.title, TitlePromptOptions> &
    Record<promptNames.subTitle, SubTitlePromptOptions> &
    Record<promptNames.icon, IconPromptOptions> &
    Record<promptNames.additionalParameters, ParameterStringPromptOptions> &
    Record<promptNames.existingFlpConfigInfo, ExistingFlpConfigInfo>;

/**
 * The options for the FLP config inquirer & the prompts.
 */
export type FLPConfigPromptOptions = Partial<flpConfigPromptOptions> & FLPConfigCommonInquirerOptions;

export const tileActions = {
    REPLACE: 'replace',
    ADD: 'add'
} as const;

export interface TileSettingsAnswers {
    [promptNames.existingFlpConfigInfo]?: string;
    [tilePromptNames.tileHandlingAction]: string;
    [tilePromptNames.copyFromExisting]: boolean;
}
