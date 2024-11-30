import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Enum defining prompt names for Cloud Foundry (CF) deployment configuration.
 */
export enum promptNames {
    /** The prompt to specify the destination name for CF deployment. */
    destinationName = 'destinationName',
    /** The prompt to specify if a managed app router should be added to the deployment. */
    addManagedAppRouter = 'addManagedAppRouter',
    /** The prompt for confirming destination overwrite. */
    overwrite = 'overwriteDestinationName'
}

/**
 * Enum defining prompt names for Application Router configuration.
 */
export enum appRouterPromptNames {
    /* The prompt to specify the MTA path to the MTA folder. */
    mtaPath = 'mtaPath',
    /* The prompt to specify the MTA ID. */
    mtaId = 'mtaId',
    /* The prompt to specify the MTA description. */
    mtaDescription = 'mtaDescription',
    /* The prompt to specify the MTA version. */
    mtaVersion = 'mtaVersion',
    /* Prompt for selecting the type of Application Router (standard or managed) */
    routerType = 'routerType',
    /* Prompt for selecting the Connectivity service */
    addConnectivityService = 'addConnectivityService',
    /* Prompt for selecting abap service binding*/
    addABAPServiceBinding = 'addABAPServiceBinding',
    /* Prompt for selecting the ABAP environments */
    abapServiceProvider = 'abapServiceProvider'
}

/**
 * Configuration options for the 'destinationName' prompt used in deployment settings.
 */
export type DestinationNamePromptOptions = {
    /** Default value to suggest for the destination name. */
    defaultValue: string;
    /** Flag to indicate if a hint message should be shown to indicate the app router is configured.*/
    hint?: boolean;
    /**
     * List of additional destination choices available for the prompt.
     * - In BAS environments, this list will be appended to BTP destination options.
     * - If `additionalChoiceList` is provided and the environment is VS Code,
     *   the prompt will render as a list, allowing users to select from the provided choices instead of input.
     */
    additionalChoiceList?: CfSystemChoice[];
    /**
     * Indicates BTP destination list choices should be available for the prompt.
     * If `addBTPDestinationList` is set to true, the prompt will include BTP destination choices else it will not.
     * By default, this is set to true.
     */
    addBTPDestinationList?: boolean;
    /**
     * Flag to indicate if the destination prompt should use auto completion
     */
    useAutocomplete?: boolean;
};

/**
 * Defines options for boolean-type prompts in CF deployment configuration.
 */
export type booleanPromptOptions = Partial<
    Record<
        | promptNames.overwrite
        | promptNames.addManagedAppRouter
        | appRouterPromptNames.mtaId
        | appRouterPromptNames.mtaDescription
        | appRouterPromptNames.mtaVersion
        | appRouterPromptNames.routerType
        | appRouterPromptNames.addABAPServiceBinding
        | appRouterPromptNames.addConnectivityService,
        boolean
    >
>;

/**
 * Defines options for string-type prompts in CF deployment configuration.
 */
type stringPromptOptions = Partial<Record<promptNames.destinationName, DestinationNamePromptOptions>>;

/**
 * Configuration options for CF deployment prompts.
 */
export type CfDeployConfigPromptOptions = Partial<stringPromptOptions & booleanPromptOptions>;

/**
 * Configuration options for CF App Router deployment prompts.
 */
export type CfAppRouterDeployConfigPromptOptions = Partial<stringPromptOptions & booleanPromptOptions> &
    Record<appRouterPromptNames.mtaPath, string>;

/**
 * Represents a question in the CF deployment configuration.
 * Extends `YUIQuestion` with optional autocomplete functionality.
 */
export type CfDeployConfigQuestions = YUIQuestion<CfDeployConfigAnswers> &
    Partial<Pick<AutocompleteQuestionOptions, 'source'>>;

export type CfAppRouterDeployConfigQuestions = YUIQuestion<CfAppRouterDeployConfigAnswers>;

/**
 * User responses for CF deployment configuration.
 */
export interface CfDeployConfigAnswers {
    /** The selected Cloud Foundry destination. */
    destinationName?: string;
    /** Indicates whether the user opted to include a managed application router. */
    addManagedRouter?: boolean;
    /** Indicates whether the user opted to overwrite the destination. */
    overwrite?: boolean;
}

/**
 * Defines the types of router modules for the Application Router configuration.
 */
export const RouterModuleType = {
    Standard: 'standard',
    Managed: 'managed'
} as const;

export type RouterModuleType = (typeof RouterModuleType)[keyof typeof RouterModuleType];

/**
 * Interface representing the configuration for MTA.
 * Includes properties for identifying and describing the MTA.
 */
export interface MtaConfig {
    /* The MTA ID. */
    mtaId: string;
    /* The path to the MTA project. */
    mtaPath: string;
    /* The MTA description. */
    mtaDescription?: string;
    /* The MTA version. */
    mtaVersion?: string;
}

/*
 * Interface representing the answers provided during the application router deployment configuration.
 */
export interface CfAppRouterDeployConfigAnswers extends MtaConfig {
    /* The type of router to be used for the application. */
    routerType: RouterModuleType;
    /* The selected connectivity service for the application router. */
    addConnectivityService?: boolean;
    /* Option to use abap Service Binding for the application router. */
    addABAPServiceBinding?: boolean;
    /* The selected abap environment for the application router. */
    abapServiceProvider?: {
        label?: string;
        service?: string;
    };
}

/**
 * Interface for selectable system choices within prompts.
 */
export interface CfSystemChoice {
    /** Display name of the system choice. */
    name: string;
    /** Value associated with the system choice. */
    value: string;
    /** Flag indicating if the system choice is an SCP destination. */
    scp: boolean;
    /** URL associated with the system choice. */
    url: string;
}
