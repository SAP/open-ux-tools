import { t } from '../../i18n';
import { ChoiceOption } from '../..';
import { getProjectNames } from '../../base/file-system';

import { OperationsType } from '@sap-ux/axios-extension';
export interface PageLabel {
    name: string;
    description: string;
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

export function getEnvironments(isCfInstalled: boolean): ChoiceOption<OperationsType>[] {
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

export function getUIPageLabels(isCFEnv: boolean): PageLabel[] {
    if (!isCFEnv) {
        return [
            {
                name: 'Adaptation Project - Basic Information',
                description:
                    'You are about to create a new App Variant. App Variant inherits the properties of the source application. The changes that you make will reflect only in the app variant and not in the source application.'
            },
            { name: 'Adaptation Project - Configuration', description: 'Adaptation Project - Configuration' }
        ];
    }

    return [
        { name: 'Login to Cloud Foundry', description: 'Provide credentials.' },
        { name: 'Project path', description: 'Provide path to MTA project.' },
        {
            name: 'Adaptation Project - Basic Information',
            description:
                'You are about to create a new App Variant. App Variant inherits the properties of the source application. The changes that you make will reflect only in the app variant and not in the source application.'
        },
        { name: 'Application Details', description: 'Setup application details.' }
    ];
}
