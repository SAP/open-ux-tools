import type { CapCustomPaths } from '@sap-ux/project-access';
import type { ChoiceOptions } from '@sap-ux/inquirer-common';
import type { CapServiceChoice, promptNames } from '../../../types.js';
import type { CapService } from '@sap-ux/cap-config-writer';

/**
 * Enumeration of internal prompt names used internally and not supported for modification using OdataServiceInquirerPromptOptions
 */
export enum capInternalPromptNames {
    capProjectPath = 'capProjectPath',
    capCliStateSetter = 'capCliStateSetter'
}

/**
 * Answers to CAP service prompt
 */
export interface CapServiceAnswers extends CapService {
    [promptNames.capProject]: CapProjectChoice['value'];
    [capInternalPromptNames.capProjectPath]: string;
    [promptNames.capService]: CapServiceChoice['value'];
}

export type CapProjectRootPath = {
    folderName: string;
    path: string;
};

export type CapProjectPaths = CapProjectRootPath & CapCustomPaths;

export interface CapProjectChoice extends ChoiceOptions {
    value: CapProjectPaths | string;
}
