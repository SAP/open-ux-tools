import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Enum defining prompt names for Cloud Foundry (CF) deployment configuration.
 */
export enum promptNames {
    /** The prompt to specify the destination name for CF deployment. */
    destinationName = 'destinationName',
    /** The prompt to specify if a managed app router should be added to the deployment. */
    addManagedApprouter = 'addManagedApprouter',
    /** The prompt for confirming destination overwrite. */
    overwrite = 'overwrite'
}

/**
 * Options specific to the 'overwrite' prompt.
 */
type OverwritePromptOptions = {
    /** Indicates whether the overwrite question should be shown. */
    addOverwriteQuestion: boolean;
};

/**
 * Options specific to the 'destinationName' prompt.
 */
export type destinationNamePromptOptions = {
    /** The Cloud Foundry destination name to be used. */
    cfDestination: string;
    /** Default destination value for CF. */
    defaultValue: string;
    /** Whether to show a hint for the destination name. */
    showDestinationHintMessage?: boolean;
    /** List of available system choices for destination selection. */
    cfChoiceList: CfSystemChoice[];
    /** Additional choices available for the destination. */
    additionalChoiceList?: CfSystemChoice[];
};

/**
 * Defines options for boolean-type prompts in CF deployment configuration.
 */
type booleanValuePromptOptions = Record<promptNames.overwrite, OverwritePromptOptions>;

/**
 * Defines options for string-type prompts in CF deployment configuration.
 */
type stringValuePromptOptions = Record<promptNames.destinationName, destinationNamePromptOptions>;

/**
 * Configuration options for CF deployment prompts.
 * Combines string and boolean prompt options, allowing partial selection.
 */
export type CfDeployConfigPromptOptions = Partial<stringValuePromptOptions & booleanValuePromptOptions> & {
    /** Indicates if the MTA YAML file exists in the project. */
    mtaYamlExists: boolean;
    /** Specifies if the project is a CAP project. */
    isCapProject?: boolean;
};

/**
 * Represents a question in the CF deployment configuration.
 * Extends `YUIQuestion` with optional autocomplete functionality.
 */
export type CfDeployConfigQuestions = YUIQuestion<CfDeployConfigAnswers> & {
    choices?: CfSystemChoice[];
} & Partial<Pick<AutocompleteQuestionOptions, 'source'>>;

/**
 * User responses for CF deployment configuration.
 */
export interface CfDeployConfigAnswers {
    /** The selected Cloud Foundry destination. */
    cfDestination?: string;
    /** Indicates whether the user opted to include a managed application router. */
    addManagedApprouter?: boolean;
    /** Indicates whether the user opted to overwrite the destination. */
    cfOverwrite?: boolean;
}

/**
 * Interface for selectable system choices within prompts.
 */
export interface CfSystemChoice {
    /** Display name of the system choice. */
    name: string;
    /** Value associated with the system choice. */
    value: string;
}
