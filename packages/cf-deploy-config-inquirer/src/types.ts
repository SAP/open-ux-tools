import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Enum defining prompt names for Cloud Foundry (CF) deployment configuration.
 */
export enum promptNames {
    /** The prompt to specify the destination name for CF deployment. */
    destinationName = 'cfDestination',
    /** The prompt to specify if a managed app router should be added to the deployment. */
    addManagedAppRouter = 'cfAddManagedAppRouter',
    /** The prompt for confirming destination overwrite. */
    overwrite = 'cfOverwrite'
}

/**
 * Options specific to the 'addManagedAppRouter' prompt.
 */
type AddManagedAppRouterPromptOptions = {
    /**
     * Indicates whether the managed app router question should be shown.
     * This prompt is only displayed if no MTA file is found.
     * Default is false.
     */
    addManagedAppRouter: boolean;
};

/**
 * Options specific to the 'overwrite' prompt.
 */
type OverwritePromptOptions = {
    /** Indicates whether the overwrite question should be shown. */
    addOverwriteQuestion: boolean;
};

/**
 * Configuration options for the 'destinationName' prompt used in deployment settings.
 */
export type DestinationNamePromptOptions = {
    /** The Cloud Foundry destination name to be used in the deployment process. */
    destination?: string;
    /** Default value to suggest for the destination name. */
    defaultValue: string;
    /** Flag to indicate if a hint message should be shown to indicate the app router is configured to use direct service binding . */
    directBindingDestinationHint?: boolean;
    /**
     * List of additional destination choices available for the prompt.
     * - In BAS environments, this list will be appended to BTP destination options.
     * - If `additionalChoiceList` is provided and the environment is VS Code,
     *   the prompt will render as a list, allowing users to select from the provided choices instead of input.
     */
    additionalChoiceList?: CfSystemChoice[];
    /**
     * Flag to indicate if the destination prompt should use auto completion
     */
    useAutocomplete?: boolean;
};

/**
 * Defines options for boolean-type prompts in CF deployment configuration.
 */
type booleanValuePromptOptions = Record<promptNames.overwrite, OverwritePromptOptions> &
    Record<promptNames.addManagedAppRouter, AddManagedAppRouterPromptOptions>;

/**
 * Defines options for string-type prompts in CF deployment configuration.
 */
type stringValuePromptOptions = Record<promptNames.destinationName, DestinationNamePromptOptions>;

/**
 * Configuration options for CF deployment prompts.
 */
export type CfDeployConfigPromptOptions = Partial<stringValuePromptOptions & booleanValuePromptOptions>;

/**
 * Represents a question in the CF deployment configuration.
 * Extends `YUIQuestion` with optional autocomplete functionality.
 */
export type CfDeployConfigQuestions = YUIQuestion<CfDeployConfigAnswers> &
    Partial<Pick<AutocompleteQuestionOptions, 'source'>>;

/**
 * User responses for CF deployment configuration.
 */
export interface CfDeployConfigAnswers {
    /** The selected Cloud Foundry destination. */
    destination?: string;
    /** Indicates whether the user opted to include a managed application router. */
    addManagedRouter?: boolean;
    /* Indicates whether the user opted to overwrite the destination. */
    overwrite?: boolean;
}

/**
 * Interface for selectable system choices within prompts.
 */
export interface CfSystemChoice {
    /** Display name of the system choice. */
    name: string;
    /** Value associated with the system choice. */
    value: string;
    /** Flag indicating if the system choice is an scp destination. */
    scp: boolean;
    /** URL associated with the system choice. */
    url: string;
}
