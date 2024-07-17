import { t } from '../../i18n';
import { isCustomerBase } from '../../base/helper';
import { getProjectNames } from '../../base/file-system';
import { BasicInfoAnswers, ConfigurationInfoAnswers, TargetEnvAnswers } from '../../types';
import {
    isNotEmptyString,
    validateClient,
    validateEnvironment,
    validateNamespace,
    validateProjectName
} from '../../base/validators';

import { isAppStudio } from '@sap-ux/btp-utils';
import { OperationsType } from '@sap-ux/axios-extension';
import { checkEndpoints } from '@sap-ux/environment-check';
import { filterDataSourcesByType } from '@sap-ux/project-access';
import type { ManifestNamespace, UI5FlexLayer } from '@sap-ux/project-access';
import type { NumberQuestion, ListQuestion, InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

export interface ChoiceOption<T = string> {
    name: string;
    value: T;
}

export function isVisible(isCFEnv: boolean, isLoggedIn: boolean): boolean {
    return !isCFEnv || (isCFEnv && isLoggedIn);
}

function getEnvironments(isCfInstalled: boolean): ChoiceOption<OperationsType>[] {
    const choices: ChoiceOption<OperationsType>[] = [{ name: 'OnPremise', value: 'P' }];

    if (isCfInstalled) {
        choices.push({ name: 'Cloud Foundry', value: 'C' });
    } else {
        // TODO: What to do in case of an error case where you need to call appWizard?
        // TODO: Make mechanism that shows errors or messages vscode style based on environment CLI or yeoman
        // this.appWizard.showInformation(Messages.CLOUD_FOUNDRY_NOT_INSTALLED, MessageType.prompt);
        // console.log(Messages.CLOUD_FOUNDRY_NOT_INSTALLED);
    }

    return choices;
}

export function getDefaultProjectName(path: string): string {
    const projectNames = getProjectNames(path);
    const defaultPrefix = 'app.variant';

    if (projectNames.length === 0) {
        return `${defaultPrefix}1`;
    }

    const lastProject = projectNames[0];
    const lastProjectIdx = lastProject.replace(defaultPrefix, '');
    const adpProjectIndex = parseInt(lastProjectIdx) + 1;

    return `${defaultPrefix}${adpProjectIndex}`;
}

export function getProjectNameTooltip(isCustomerBase: boolean) {
    return !isCustomerBase
        ? `${t('prompts.inputCannotBeEmpty')} ${t('validators.projectNameLengthErrorInt')} ${t(
              'validators.projectNameValidationErrorInt'
          )}`
        : `${t('prompts.inputCannotBeEmpty')} ${t('validators.projectNameLengthErrorExt')} ${t(
              'validators.projectNameValidationErrorExt'
          )}`;
}

export function generateValidNamespace(projectName: string, isCustomerBase: boolean): string {
    return !isCustomerBase ? projectName : 'customer.' + projectName;
}

export function getNamespacePrompt(
    isCustomerBase: boolean,
    isCfMode: boolean,
    isLoggedIn: boolean
): YUIQuestion<BasicInfoAnswers> {
    const prompt = {
        type: 'input',
        name: 'namespace',
        message: t('prompts.namespaceLabel'),
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        default: (answers: BasicInfoAnswers) => generateValidNamespace(answers.projectName, isCustomerBase),
        store: false,
        when: () => isVisible(isCfMode, isLoggedIn)
    } as InputQuestion<BasicInfoAnswers>;

    if (!isCustomerBase && isVisible(isCfMode, isLoggedIn)) {
        if (prompt.guiOptions) {
            prompt.guiOptions.type = 'label';
        }
        prompt.when = (answers: BasicInfoAnswers) => {
            return !!answers.projectName;
        };
    } else {
        if (prompt.guiOptions) {
            prompt.guiOptions.mandatory = true;
        }
        prompt.validate = (value: string, answers: BasicInfoAnswers) =>
            validateNamespace(value, answers.projectName, isCustomerBase);
    }

    return prompt;
}

export async function getSystemPrompt(systems: string[]) {
    return isAppStudio() ? await getSystemListPrompt(systems) : await getSystemNativePrompt(systems);
}

export async function getSystems(): Promise<Array<string>> {
    let destinationNames: Array<string> = [];

    try {
        const { endpoints, messages } = await checkEndpoints();
        if (endpoints) {
            destinationNames = Object.keys(endpoints)
                .map((item: any) => {
                    return endpoints[item].Name;
                })
                .sort((a, b) => {
                    return a.toLowerCase().localeCompare(b.toLowerCase(), 'en', { sensitivity: 'base' });
                });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
    }

    return destinationNames;
}

export async function getSystemListPrompt(systems: string[]): Promise<YUIQuestion<ConfigurationInfoAnswers>> {
    // TODO: fetch all systems

    return {
        type: 'list',
        name: 'system',
        message: t('prompts.systemLabel'),
        choices: () => systems,
        guiOptions: {
            hint: t('prompts.systemTooltip')
        }
        // when: isAppStudio() ? this.systemInfo?.adaptationProjectTypes?.length : true, // TODO:
        // validate: this._systemPromptValidationHandler.bind(this) // TODO:
    } as ListQuestion<ConfigurationInfoAnswers>;
}

export async function getSystemNativePrompt(systems: string[]) {
    // check for extension installed if not installed prompt getSystemInputPrompt
    if (!systems || systems.length === 0) {
    }
    return getSystemListPrompt(systems);
}

export function getSystemInputPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
    return {
        type: 'input',
        name: 'system',
        message: 'System URL',
        // validate: this._systemPromptValidationHandler.bind(this), TODO:
        guiOptions: {
            mandatory: true
        },
        store: false
    } as InputQuestion<ConfigurationInfoAnswers>;
}

export function getSystemClientPrompt(): YUIQuestion<ConfigurationInfoAnswers> {
    return {
        type: 'input',
        name: 'client',
        message: 'System client',
        validate: validateClient,
        when: (answers: ConfigurationInfoAnswers) => {
            if (answers.system) {
                return isAppStudio() ? false : true;
                // return isAppStudio() ? false : !this.localDestinationService.getIsExtensionInstalled(); // TODO:
            }
            return false;
        },
        guiOptions: {
            mandatory: true
        },
        store: false
    } as InputQuestion<ConfigurationInfoAnswers>;
}

export default class ProjectPrompter {
    private isCustomerBase: boolean;

    constructor(layer: UI5FlexLayer) {
        this.isCustomerBase = isCustomerBase(layer);
    }

    public getTargetEnvPrompt(loginEnabled: boolean, isCfInstalled: boolean): YUIQuestion<TargetEnvAnswers>[] {
        return [
            {
                type: 'list',
                name: 'targetEnv',
                message: t('prompts.targetEnvLabel'),
                choices: () => getEnvironments(isCfInstalled),
                default: () => getEnvironments(isCfInstalled)[0]?.name,
                guiOptions: {
                    mandatory: true,
                    hint: t('prompts.targetEnvTooltip')
                },
                validate: (value: OperationsType) => validateEnvironment(value, loginEnabled)
            } as ListQuestion<TargetEnvAnswers>
        ];
    }

    public getBasicInfoPrompts(path: string, isLoggedIn = false, isCFEnv = false): YUIQuestion<BasicInfoAnswers>[] {
        return [
            {
                type: 'input',
                name: 'projectName',
                message: () => (isCFEnv ? 'Module Name' : 'Project Name'),
                default: () => getDefaultProjectName(path),
                guiOptions: {
                    mandatory: true,
                    hint: getProjectNameTooltip(this.isCustomerBase)
                },
                validate: (value: string) => {
                    return validateProjectName(value, path, this.isCustomerBase, isCFEnv);
                },
                when: () => isVisible(isCFEnv, isLoggedIn),
                store: false
            } as InputQuestion<BasicInfoAnswers>,
            {
                type: 'input',
                name: 'applicationTitle',
                message: t('prompts.appTitleLabel'),
                default: () => t('prompts.appTitleDefault'),
                guiOptions: {
                    mandatory: true,
                    hint: t('prompts.appTitleTooltip')
                },
                validate: (value: string) => {
                    if (!isNotEmptyString(value)) {
                        return t('validators.cannotBeEmpty');
                    }
                    return true;
                },
                when: () => {
                    return isVisible(isCFEnv, isLoggedIn);
                },
                store: false
            } as InputQuestion<BasicInfoAnswers>,
            getNamespacePrompt(this.isCustomerBase, isCFEnv, isLoggedIn)
        ];
    }

    public async getConfigurationPrompts(): Promise<YUIQuestion<ConfigurationInfoAnswers>[]> {
        const systems = await getSystems();

        return [await getSystemPrompt(systems), getSystemClientPrompt()];
    }
}
