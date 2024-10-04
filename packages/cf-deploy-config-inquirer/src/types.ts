import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

export enum promptNames {
    /** The prompt for the destination name. */
    destinationName = 'destinationName',
    /** The prompt for adding an application router. */
    addApplicationRouter = 'addApplicationRouter'
}

export interface CfDeployConfigPromptOptions {
    /** Indicates whether the MTA YAML file exists. */
    mtaYamlExists: boolean;
    /** Whether to show destination name hint */
    showDestinationHintMessage?: boolean;
    /** The Cloud Foundry destination name. */
    cfDestination: string;
    /** Indicates if the project is a CAP project. */
    isCapProject?: boolean;
    /** A list of available system choices. */
    choices?: CfSystemChoice[];
    /** The default value for the destination option in the prompt. */
    defaultDestinationOption?: string;
    /**
     * The type of prompt to be displayed. It can either be:
     * - 'list': Presents a list of destination options for the user to select from, will be available in BAS only.
     * - 'input': Allows the user to input a value manually, available in vscode only.
     */
    promptType: 'list' | 'input';
}

/**
 * Type representing a question in the CF deployment configuration.
 * Extends `YUIQuestion` with optional autocomplete functionality.
 */
export type CfDeployConfigQuestions = YUIQuestion<CfDeployConfigAnswers> &
    Partial<Pick<AutocompleteQuestionOptions, 'source'>>;

export interface CfDeployConfigAnswers {
    /* The selected Cloud Foundry destination */
    cfDestination?: string;
    targetName?: string;
    /* Indicates if the user has opted to include a managed application router in the deployment configuration.*/
    addManagedApprouter?: boolean;
}

export interface CfSystemChoice {
    name: string;
    value: string;
}
