import { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../i18n';
import { BasicInfoAnswers } from '../../types';
import { validateProjectName, isNotEmptyString, validateNamespace } from '../../base/validators';
import { getDefaultProjectName, getProjectNameTooltip, generateValidNamespace } from './prompt-helpers';

export function getPrompts(path: string, layer: string): YUIQuestion<BasicInfoAnswers>[] {
    const isCustomerBase = layer === 'CUSTOMER_BASE';
    return [
        {
            type: 'input',
            name: 'projectName',
            message: () => 'Project Name',
            default: () => getDefaultProjectName(path),
            guiOptions: {
                mandatory: true,
                hint: getProjectNameTooltip(isCustomerBase),
                breadcrumb: 'Project Name'
            },
            validate: (value: string) => {
                return validateProjectName(value, path, isCustomerBase);
            },
            store: false
        } as InputQuestion<BasicInfoAnswers>,
        {
            type: 'input',
            name: 'applicationTitle',
            message: t('prompts.appTitleLabel'),
            default: () => t('prompts.appTitleDefault'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.appTitleTooltip'),
                breadcrumb: t('prompts.appTitleLabel')
            },
            validate: (value: string) => {
                if (!isNotEmptyString(value)) {
                    return t('validators.cannotBeEmpty');
                }
                return true;
            },
            store: false
        } as InputQuestion<BasicInfoAnswers>,
        getNamespacePrompt(isCustomerBase)
    ];
}

function getNamespacePrompt(isCustomerBase: boolean): YUIQuestion<BasicInfoAnswers> {
    const prompt = {
        type: 'input',
        name: 'namespace',
        message: t('prompts.namespaceLabel'),
        guiOptions: {
            applyDefaultWhenDirty: true
        },
        default: (answers: BasicInfoAnswers) => generateValidNamespace(answers.projectName, isCustomerBase),
        store: false
    } as InputQuestion<BasicInfoAnswers>;

    if (!isCustomerBase) {
        if (prompt.guiOptions) {
            prompt.guiOptions.type = 'label';
        }
        prompt.when = (answers: BasicInfoAnswers) => {
            return !!answers.projectName;
        };
    } else {
        if (prompt.guiOptions) {
            prompt.guiOptions.mandatory = true;
            prompt.guiOptions.breadcrumb = t('prompts.namespaceLabel');
        }
        prompt.validate = (value: string, answers: BasicInfoAnswers) =>
            validateNamespace(value, answers.projectName, isCustomerBase);
    }

    return prompt;
}
