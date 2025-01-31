import type { CapCustomPaths } from '@sap-ux/project-access';
import type { CapServiceChoice, promptNames } from '../../../types';
import type { CapService } from '@sap-ux/cap-config-writer';
import type { ListChoiceOptions } from 'inquirer';

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

export interface CapProjectChoice extends ListChoiceOptions {
    value: CapProjectPaths | string;
}
