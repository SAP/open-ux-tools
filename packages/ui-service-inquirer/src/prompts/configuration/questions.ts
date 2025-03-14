import { Severity } from '@sap-devx/yeoman-ui-types';
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import {
    type AbapDeployConfigQuestion,
    getPackagePrompts,
    getTransportRequestPrompts
} from '@sap-ux/abap-deploy-config-inquirer';
import { type Logger } from '@sap-ux/logger';
import type { ConfirmQuestion, ExpandQuestion } from 'inquirer';
import { t } from '../../i18n';
import type { ServiceConfigQuestion, UiServiceAnswers } from '../../types';
import { createAbapTarget, getServiceNameChoices, getValidationErrorLink } from '../prompt-helper';
import { PromptState } from '../prompt-state';

/**
 * Get the configuration questions.
 *
 * @param logger - logger instance to use for logging
 * @returns the configuration questions
 */
export function getConfigQuestions(logger: Logger): ServiceConfigQuestion[] {
    PromptState.resetServiceConfig();
    let draftEnabled = true;
    const abapTarget = createAbapTarget(
        PromptState.systemSelection.connectedSystem?.destination,
        PromptState.systemSelection.connectedSystem?.backendSystem
    );

    const packagePrompts = getPackagePrompts(
        {
            packageAutocomplete: {
                useAutocomplete: true
            },
            backendTarget: {
                abapTarget: abapTarget,
                serviceProvider: PromptState.systemSelection.connectedSystem?.serviceProvider
            }
        },
        true,
        true
    ) as AbapDeployConfigQuestion[];

    const transportPrompts = getTransportRequestPrompts(
        {
            backendTarget: {
                abapTarget: abapTarget,
                serviceProvider: PromptState.systemSelection.connectedSystem?.serviceProvider
            },
            transportInputChoice: {
                showCreateDuringDeploy: false
            },
            ui5AbapRepo: {
                default: 'ztestapp'
            }
        },
        true,
        true
    ) as AbapDeployConfigQuestion[];

    const configPrompts = [
        {
            when: async (answers: UiServiceAnswers): Promise<boolean> => {
                if (!!answers.packageManual || !!answers.packageAutocomplete) {
                    try {
                        const packageValue = answers.packageManual ?? answers.packageAutocomplete ?? '';
                        PromptState.serviceConfig.content =
                            (await PromptState.systemSelection.objectGenerator?.getContent(packageValue)) ?? '';
                        const content = JSON.parse(PromptState.serviceConfig?.content);
                        content.businessObject.projectionBehavior.withDraft = true;
                        PromptState.serviceConfig.content = JSON.stringify(content);
                        PromptState.serviceConfig.serviceName =
                            content.businessService.serviceBinding.serviceBindingName;
                    } catch (e) {
                        logger?.error(`${t('error.fetchingContentForServiceBinding')}: ${e.message}`);
                    }
                }
                return !!PromptState.serviceConfig.serviceName || !!PromptState.serviceConfig.content;
            },
            type: 'expand',
            name: 'serviceName',
            guiOptions: {
                breadcrumb: t('prompts.serviceNameBreadcrumb')
            },
            message: t('prompts.serviceName'),
            choices: () => getServiceNameChoices(PromptState.serviceConfig.serviceName),
            default: () => 0,
            validate: async () => {
                try {
                    const validation = await PromptState.systemSelection.objectGenerator?.validateContent(
                        PromptState.serviceConfig.content
                    );
                    if (validation?.severity === 'ERROR') {
                        return await getValidationErrorLink();
                    }
                    return true;
                } catch (e) {
                    logger.error(`${t('error.validatingContent')}: ${e.message}`);
                    return await getValidationErrorLink();
                }
            }
        } as ExpandQuestion<UiServiceAnswers>,
        {
            name: 'draftEnabled',
            type: 'confirm',
            message: t('prompts.draftEnabled'),
            guiOptions: {
                breadcrumb: true,
                mandatory: true
            },
            default: true,
            validate: async (input: boolean) => {
                if (input !== draftEnabled && PromptState.serviceConfig.content) {
                    const content = JSON.parse(PromptState.serviceConfig.content);
                    content.businessObject.projectionBehavior.withDraft = input;
                    PromptState.serviceConfig.content = JSON.stringify(content);
                    try {
                        const validation = await PromptState.systemSelection.objectGenerator?.validateContent(
                            PromptState.serviceConfig.content
                        );
                        if (validation?.severity === 'ERROR') {
                            return t('error.validatingContent');
                        }
                        draftEnabled = input;
                    } catch (error) {
                        logger.error(error.message);
                    }
                    draftEnabled = input;
                }
                return true;
            }
        } as ConfirmQuestion<UiServiceAnswers>,
        {
            name: 'launchAppGen',
            type: 'confirm',
            message: t('prompts.launchAppGen'),
            guiOptions: {
                breadcrumb: t('prompts.launchAppGenBreadcrumb')
            },
            additionalMessages: (val: boolean): IMessageSeverity | undefined => {
                let additionalMessage;
                if (val) {
                    additionalMessage = {
                        message: t('info.appGenLaunch'),
                        severity: Severity.information
                    };
                }
                return additionalMessage;
            },
            default: false
        } as ConfirmQuestion<UiServiceAnswers>
    ] as ServiceConfigQuestion[];
    return [...packagePrompts, ...transportPrompts, ...configPrompts];
}
