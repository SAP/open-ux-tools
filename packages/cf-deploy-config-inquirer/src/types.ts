import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

export enum promptNames {
    /** The prompt for the destination name. */
    destinationName = 'destinationName',
    /** The prompt for adding an managed app router. */
    addManagedApprouter = 'addManagedApprouter',
    /** The prompt for overwriting the destination. */
    overwrite = 'overwrite'
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
    cfChoiceList?: CfSystemChoice[];
    additionalChoiceList?: CfSystemChoice[];
    /** The default value for the destination option in the prompt. */
    defaultDestinationOption?: string;
    /** Indicates whether the overwrite question should be shown. */
    addOverwriteQuestion?: boolean;
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
    /* Indicates if the user has opted to include a managed application router in the deployment configuration.*/
    addManagedApprouter?: boolean;
}

export interface CfSystemChoice {
    name: string;
    value: string;
}
