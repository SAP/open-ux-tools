import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { Validator } from 'inquirer';
import type {
    AbapDeployConfigAnswers,
    AbapDeployConfigAnswersInternal,
    BackendTarget,
    TransportConfig
} from '@sap-ux/deploy-config-generator-shared';

export const enum TargetSystemType {
    Url = 'Url'
}

export const enum ClientChoiceValue {
    Base = 'base',
    New = 'new',
    Blank = 'blank'
}

export interface AbapSystemChoice {
    name: string;
    value: string;
    scp?: boolean;
    url?: string;
    client?: string;
    isDefault?: boolean;
    isS4HC?: boolean;
}

/**
 * Enumeration of prompt names used by
 */
export enum promptNames {
    destination = 'destination',
    destinationCliSetter = 'destinationCliSetter',
    targetSystem = 'targetSystem',
    targetSystemCliSetter = 'targetSystemCliSetter',
    url = 'url',
    scp = 'scp',
    scpSetter = 'scpSetter',
    clientChoice = 'clientChoice',
    clientChoiceCliSetter = 'clientChoiceCliSetter',
    client = 'client',
    username = 'username',
    password = 'password',
    ui5AbapRepo = 'ui5AbapRepo',
    description = 'description',
    packageInputChoice = 'packageInputChoice',
    packageCliExecution = 'packageCliExecution',
    packageManual = 'packageManual',
    packageAutocomplete = 'packageAutocomplete',
    transportInputChoice = 'transportInputChoice',
    transportCliExecution = 'transportCliExecution',
    transportCreated = 'transportCreated',
    transportFromList = 'transportFromList',
    transportManual = 'transportManual',
    index = 'index',
    overwrite = 'overwrite'
}

/**
 * Options for the UI5 ABAP repository prompt.
 * If `hide` is set to `true`, the prompt will not be shown, it is required to add a default value in this case.
 */
export type UI5AbapRepoPromptOptions =
    | {
          hide?: false;
          default?: string;
          /**
           * If set to true, the prompt will be hidden if the target system is on-premise.
           */
          hideIfOnPremise?: boolean;
      }
    | {
          hide: true;
          default: string;
      };

export type DescriptionPromptOptions = {
    /**
     * Default description value.
     */
    default?: string;
};

type PackagePromptOptions = {
    /**
     * Add custom validation
     */
    validate?: Validator<AbapDeployConfigAnswers>;
};

export type PackageManualPromptOptions = PackagePromptOptions & {
    /**
     * Default package value.
     */
    default?: string;
};

export type TransportManualPromptOptions = {
    /**
     * Default transport value.
     */
    default?: string;
};

export type OverwritePromptOptions = {
    /**
     * This option allows the prompt to be hidden and should be used when the overwrite prompt should not be shown.
     * It should be set to false when existing configuration will be overwritten.
     */
    hide?: boolean;
};

export type IndexPromptOptions = {
    /**
     * This option indicates if an generating an index.html is allowed.
     */
    indexGenerationAllowed?: boolean;
};

export type PackageAutocompletePromptOptions = PackagePromptOptions & {
    /**
     * Determines if the package autocomplete prompt should use auto complete prompt for packages.
     * Note that the auto-complete module must be registered with the inquirer instance to use this feature.
     */
    useAutocomplete?: boolean;
};

type abapDeployConfigPromptOptions = Record<promptNames.ui5AbapRepo, UI5AbapRepoPromptOptions> &
    Record<promptNames.description, DescriptionPromptOptions> &
    Record<promptNames.packageManual, PackageManualPromptOptions> &
    Record<promptNames.transportManual, TransportManualPromptOptions> &
    Record<promptNames.overwrite, OverwritePromptOptions> &
    Record<promptNames.index, IndexPromptOptions> &
    Record<promptNames.packageAutocomplete, PackageAutocompletePromptOptions>;

/**
 * The options which are common for the abap deploy config inquirer.
 */
type AbapDeployConfigCommonInquirerOptions = {
    backendTarget?: BackendTarget;
};

/**
 * The options for the abap deploy config inquirer & the prompts.
 */
export type AbapDeployConfigPromptOptions = Partial<abapDeployConfigPromptOptions> &
    AbapDeployConfigCommonInquirerOptions;
export interface InitTransportConfigResult {
    transportConfig?: TransportConfig;
    transportConfigNeedsCreds?: boolean;
    error?: string;
    warning?: string;
}

export type AbapDeployConfigQuestion = YUIQuestion<AbapDeployConfigAnswersInternal>;
