import type { NumberQuestion, ListQuestion, InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ManifestNamespace, UI5FlexLayer } from '@sap-ux/project-access';
import { t } from '../../i18n';
import { filterDataSourcesByType } from '@sap-ux/project-access';
import { isCustomerBase } from '../../base/helper';
import { OperationsType } from '@sap-ux/axios-extension';
import { isNotEmptyString, validateEnvironment, validateNamespace, validateProjectName } from '../../base/validators';
import { BasicInfoAnswers, TargetEnvAnswers } from '../../types';
import { getProjectNames } from '../../base/file-system';

export interface ChoiceOption<T = string> {
    name: string;
    value: T;
}

export function isVisible(isCFEnv: boolean, isLoggedIn: boolean): boolean {
    return !isCFEnv || (isCFEnv && isLoggedIn);
}

// export enum Environment

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

/**
 * Determines whether the namespace prompt should be visible.
 *
 * @param {boolean} isCustomerBase - Whether the internal mode is enabled.
 * @param {boolean} isCfMode - Cloud Foundry mode state.
 * @param {boolean} isLoggedIn - User's login state.
 * @returns {Function} A function that determines visibility based on answers.
 */
function determineVisibility(
    isCustomerBase: boolean,
    isCfMode: boolean,
    isLoggedIn: boolean
): (answers: BasicInfoAnswers) => boolean {
    return (answers: BasicInfoAnswers) => (!isCustomerBase ? !!answers.projectName : isVisible(isCfMode, isLoggedIn));
}

/**
 * Sets up validation for the namespace if needed.
 *
 * @param {boolean} isCustomerBase - Whether the internal mode is enabled.
 * @param {boolean} isCfMode - Cloud Foundry mode state.
 * @param {boolean} isLoggedIn - User's login state.
 * @returns {(value: string, answers: BasicInfoAnswers) => boolean | string} Validation function or undefined.
 */
function setupValidation(
    isCustomerBase: boolean,
    isCfMode: boolean,
    isLoggedIn: boolean
): (value: string, answers: BasicInfoAnswers) => boolean | string {
    return !isCustomerBase && isVisible(isCfMode, isLoggedIn)
        ? () => true
        : (value: string, answers: BasicInfoAnswers) => validateNamespace(value, answers.projectName, isCustomerBase);
}

// export function getNamespacePrompt(
//     isCustomerBase: boolean,
//     isCfMode: boolean,
//     isLoggedIn: boolean
// ): YUIQuestion<BasicInfoAnswers> {
//     return {
//         type: 'input',
//         name: 'namespace',
//         message: t('prompts.namespaceLabel'),
//         guiOptions: {
//             applyDefaultWhenDirty: true,
//             mandatory: isCustomerBase,
//             type: !isCustomerBase ? 'label' : 'input'
//         },
//         default: (answers: BasicInfoAnswers) => generateValidNamespace(answers.projectName, isCustomerBase),
//         when: determineVisibility(isCustomerBase, isCfMode, isLoggedIn),
//         store: false,
//         validate: setupValidation(isCustomerBase, isCfMode, isLoggedIn)
//     } as InputQuestion<BasicInfoAnswers>;
// }

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
}
