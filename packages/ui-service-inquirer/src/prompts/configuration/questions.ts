import { Severity } from '@sap-devx/yeoman-ui-types';
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
 * @param logger - a logger compatible with the {@link Logger} interface
 * @returns the configuration questions
 */
export function getConfigQuestions(logger?: Logger): ServiceConfigQuestion[] {
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
                        logger?.error('inside when block');
                        const packageValue = (answers.packageManual || answers.packageAutocomplete) ?? '';
                        PromptState.serviceConfig.content =
                            (await PromptState.systemSelection.objectGenerator?.getContent(packageValue)) ?? '';
                        // if (content) {
                        //     PromptState.serviceConfig.content = content;
                        // }
                        logger?.error('Content: ' + PromptState.serviceConfig.content);
                        const content = JSON.parse(PromptState.serviceConfig?.content);
                        content.businessObject.projectionBehavior.withDraft = true;
                        PromptState.serviceConfig.content = JSON.stringify(content);
                        PromptState.serviceConfig.serviceName =
                            content.businessService.serviceBinding.serviceBindingName;
                    } catch (e) {
                        logger?.error(`${t('ERROR_FETCHING_CONTENT_FOR_SERVICE_BINDING')}: ${e.message}`);
                    }
                }
                return !!PromptState.serviceConfig.serviceName || !!PromptState.serviceConfig.content;
            },
            type: 'expand',
            name: 'serviceName',
            guiOptions: {
                breadcrumb: t('PROMPT_SERVICE_NAME_BREADCRUMB')
            },
            message: t('PROMPT_SERVICE_NAME'),
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
                    //UiServiceGenLogger.logger.error(`${t('ERROR_VALIDATING_CONTENT')}: ${e.message}`);
                    return await getValidationErrorLink();
                }
            }
        } as ExpandQuestion<UiServiceAnswers>,
        {
            name: 'draftEnabled',
            type: 'confirm',
            message: t('PROMPT_DRAFT_ENABLED'),
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
                            return t('ERROR_VALIDATING_CONTENT');
                        }
                        draftEnabled = input;
                    } catch (error) {
                        //UiServiceGenLogger.logger.error(error.message);
                    }
                    draftEnabled = input;
                }
                return true;
            }
        } as ConfirmQuestion<UiServiceAnswers>,
        {
            name: 'launchAppGen',
            type: 'confirm',
            message: t('PROMPT_LAUNCH_APP_GEN'),
            guiOptions: {
                breadcrumb: t('PROMPT_LAUNCH_APP_GEN_BREADCRUMB')
            },
            additionalMessages: (val: boolean) => {
                if (val) {
                    return {
                        message: t('INFO_APP_GEN_LAUNCH'),
                        severity: Severity.information
                    };
                }
            },
            default: false
        } as ConfirmQuestion<UiServiceAnswers>
    ] as ServiceConfigQuestion[];
    return [...packagePrompts, ...transportPrompts, ...configPrompts];
}
