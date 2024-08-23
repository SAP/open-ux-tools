import type { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { validateProjectName, validateNamespaceAdp, validateEmptyString } from '@sap-ux/project-input-validator';

import { t } from '../../../i18n';
import { FlexLayer } from '../../../types';
import type { BasicInfoAnswers } from '../../../types';
import { generateValidNamespace, getDefaultProjectName, getProjectNameTooltip } from './helper';

/**
 * Generates an array of prompt objects configured for collecting basic information about a project.
 *
 * @param {string} path - The file path or project path where the project is located or will be created.
 * @param {string} layer - The layer.
 * @returns {YUIQuestion<BasicInfoAnswers>[]} An array of YUI prompt objects configured for user interaction
 *         in a CLI or GUI, including validations and tooltips based on the context.
 */
export function getPrompts(path: string, layer: FlexLayer): YUIQuestion<BasicInfoAnswers>[] {
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    return [
        {
            type: 'input',
            name: 'projectName',
            message: 'Project Name',
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
            default: t('prompts.appTitleDefault'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.appTitleTooltip'),
                breadcrumb: t('prompts.appTitleLabel')
            },
            validate: (value: string) => validateEmptyString(value),
            store: false
        } as InputQuestion<BasicInfoAnswers>,
        getNamespacePrompt(isCustomerBase)
    ];
}

/**
 * Generates a prompt object for the namespace input based on the project context.
 *
 * @param {boolean} isCustomerBase - Flag indicating if the context is based on a customer base layer.
 * @returns {YUIQuestion<BasicInfoAnswers>} A YUI prompt object specifically configured for the namespace input.
 */
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
            validateNamespaceAdp(value, answers.projectName, isCustomerBase);
    }

    return prompt;
}
