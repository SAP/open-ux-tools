import type { FileBrowserQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { getCapCustomPaths } from '@sap-ux/project-access';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { Question } from 'inquirer';
import { t } from '../../../i18n';
import type { CapServiceChoice, OdataServicePromptOptions } from '../../../types';
import { promptNames } from '../../../types';
import { PromptState } from '../../../utils';
import { errorHandler } from '../../prompt-helpers';
import { enterCapPathChoiceValue, getCapEdmx, getCapProjectChoices, getCapServiceChoices } from './cap-helpers';
import {
    capInternalPromptNames,
    type CapProjectChoice,
    type CapProjectPaths,
    type CapProjectRootPath,
    type CapServiceAnswers
} from './types';
import { validateCapPath } from './validators';

/**
 * Find the specified choice in the list of CAP project choices and return its index.
 *
 * @param capChoices The list of CAP project choices
 * @param defaultChoicePath The path of the default choice
 * @returns The index of the default choice in the list of CAP project choices
 */
function getDefaultCapChoice(
    capChoices: CapProjectChoice[],
    defaultChoicePath?: string
): CapProjectChoice['value'] | number {
    if (defaultChoicePath) {
        return capChoices.findIndex((choice) => {
            if (typeof choice.value === 'string') {
                return choice.value === defaultChoicePath;
            }
            return choice.value.path === defaultChoicePath;
        });
    } else if (capChoices.length === 2) {
        return 0;
    }
    return -1;
}
/**
 * Get the prompts for selecting a CAP project from local path discovery.
 * Two prompts are returned, one for selecting a CAP project from a list of discovered projects and
 * one for entering a custom path to a CAP project.
 *
 * @param promptOptions - The prompt options which control CAP project search paths and default value
 * @returns the prompt used to provide input for selecting a CAP project
 */
export function getLocalCapProjectPrompts(
    promptOptions?: OdataServicePromptOptions
): (YUIQuestion<CapServiceAnswers> | Question)[] {
    let capChoices: Awaited<CapProjectChoice[]> = [];
    const defaultCapPath = promptOptions?.[promptNames.capProject]?.defaultChoice;
    const defaultCapService = promptOptions?.[promptNames.capService]?.defaultChoice;
    let selectedCapProject: CapProjectPaths | undefined;
    let capServiceChoices: CapServiceChoice[];
    let defaultServiceIndex = 0;
    PromptState.reset();

    const prompts: (ListQuestion<CapServiceAnswers> | FileBrowserQuestion<CapServiceAnswers> | Question)[] = [
        {
            when: async (): Promise<boolean> => {
                capChoices = await getCapProjectChoices(promptOptions?.[promptNames.capProject]?.capSearchPaths ?? []);
                return capChoices?.length > 1;
            },
            type: 'list',
            name: promptNames.capProject,
            message: t('prompts.capProject.message'),
            default: () => {
                const defChoice = getDefaultCapChoice(capChoices, defaultCapPath);
                return defChoice;
            },
            choices: () => capChoices,
            guiOptions: {
                applyDefaultWhenDirty: true,
                mandatory: true,
                breadcrumb: t('prompts.capProject.breadcrumb')
            }
        } as ListQuestion<CapServiceAnswers>,
        {
            when: (answers): boolean => capChoices.length === 1 || answers?.capProject === enterCapPathChoiceValue,
            type: 'input',
            guiType: 'folder-browser',
            name: capInternalPromptNames.capProjectPath,
            message: t('prompts.capProjectPath.message'),
            default: () => {
                if (defaultCapPath) {
                    return defaultCapPath;
                }
            },
            guiOptions: { mandatory: true, breadcrumb: t('prompts.capProject.breadcrumb') },
            validate: async (projectPath: string): Promise<string | boolean> => {
                const validCapPath = await validateCapPath(projectPath);
                // Load the cap paths if the path is valid
                if (validCapPath === true) {
                    selectedCapProject = Object.assign(
                        { path: projectPath } as CapProjectRootPath,
                        await getCapCustomPaths(projectPath)
                    );
                    return true;
                }
                selectedCapProject = undefined;
                return validCapPath;
            }
        } as FileBrowserQuestion<CapServiceAnswers>,
        {
            when: async (answers) => {
                if (typeof answers?.capProject === 'object') {
                    selectedCapProject = answers.capProject;
                }

                if (selectedCapProject) {
                    capServiceChoices = await getCapServiceChoices(selectedCapProject);
                    return true;
                }
                return false;
            },
            type: 'list',
            name: promptNames.capService,
            message: t('prompts.capService.message'),
            choices: () => {
                if (defaultCapService) {
                    // Find the cap service, qualified by the provided project path
                    defaultServiceIndex = capServiceChoices?.findIndex(
                        (choice) =>
                            // project path is an extra validation that the prompt options for each
                            // of `defaultCapProject` and `defaultCapService` are compatible
                            choice.value?.projectPath === defaultCapService?.projectPath &&
                            choice.value?.serviceName === defaultCapService?.serviceName
                    );
                }
                return capServiceChoices;
            },
            guiOptions: {
                applyDefaultWhenDirty: true,
                mandatory: true,
                breadcrumb: true
            },
            default: () => {
                return capServiceChoices?.length > 1 ? defaultServiceIndex : 0;
            },
            validate: async (capService: CapServiceChoice['value']): Promise<string | boolean> => {
                const errMsg = errorHandler.getErrorMsg(undefined, true);
                if (errMsg) {
                    return errMsg;
                }
                if (capService) {
                    PromptState.odataService.metadata = await getCapEdmx(capService);
                    PromptState.odataService.servicePath = capService.urlPath;
                    PromptState.odataService.odataVersion = OdataVersion.v4;
                    return PromptState.odataService.metadata !== undefined
                        ? true
                        : t('prompts.validationMessages.metadataInvalid');
                }
                return false;
            }
        } as ListQuestion<CapServiceAnswers>
    ];

    if (getHostEnvironment() === hostEnvironment.cli) {
        prompts.push({
            when: async (answers: CapServiceAnswers): Promise<boolean> => {
                if (answers?.capService) {
                    PromptState.odataService.metadata = await getCapEdmx(answers?.capService);
                    PromptState.odataService.servicePath = answers?.capService.urlPath;
                    PromptState.odataService.odataVersion = OdataVersion.v4;
                }
                return false;
            },
            name: capInternalPromptNames.capCliStateSetter
        } as Question);
    }

    return prompts;
}
