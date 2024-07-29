import { t } from '../../i18n';
import { getProjectNames } from '../../base/file-system';

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

export function getUIPageLabels(): PageLabel[] {
    return [
        {
            name: 'Adaptation Project - Basic Information',
            description:
                'You are about to create a new App Variant. App Variant inherits the properties of the source application. The changes that you make will reflect only in the app variant and not in the source application.'
        },
        { name: 'Adaptation Project - Configuration', description: 'Adaptation Project - Configuration' }
    ];
}
