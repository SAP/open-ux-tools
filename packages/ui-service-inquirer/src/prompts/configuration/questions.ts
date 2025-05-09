import { Severity } from '@sap-devx/yeoman-ui-types';
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import {
    type AbapDeployConfigQuestion,
    type AbapDeployConfigPromptOptions,
    getPackagePrompts,
    getTransportRequestPrompts
} from '@sap-ux/abap-deploy-config-inquirer';
import { type Logger } from '@sap-ux/logger';
import type { Question } from 'inquirer';
import { t } from '../../i18n';
import { type ServiceConfigOptions, type ServiceConfigQuestion, type UiServiceAnswers } from '../../types';
import {
    createAbapTarget,
    defaultOrShowAppGenLaunchQuestion,
    defaultOrShowDraftQuestion,
    getServiceNameChoices,
    getValidationErrorLink
} from '../prompt-helper';
import { PromptState } from '../prompt-state';

/**
 * Get the configuration questions.
 *
 * @param logger - logger instance to use for logging
 * @param options - configuration options for prompts
 * @returns the configuration questions
 */
export function getConfigQuestions(logger: Logger, options?: ServiceConfigOptions): ServiceConfigQuestion[] {
    PromptState.resetServiceConfig();
    const abapTarget = createAbapTarget(
        PromptState.systemSelection.connectedSystem?.destination,
        PromptState.systemSelection.connectedSystem?.backendSystem
    );

    const transportOptions = {
        backendTarget: {
            abapTarget: abapTarget,
            serviceProvider: PromptState.systemSelection.connectedSystem?.serviceProvider
        },
        transportCreated: {
            description: t('prompts.options.transportDescription')
        },
        transportInputChoice: {
            showCreateDuringDeploy: false
        },
        ui5AbapRepo: {
            default: ''
        }
    };

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

    const transportPrompts = getTransportRequestPrompts(transportOptions, true, true) as AbapDeployConfigQuestion[];

    const configPrompts = [getServiceNameQuestion(logger, transportOptions, options)];

    if (defaultOrShowDraftQuestion(options?.useDraftEnabled)) {
        configPrompts.push(getDraftEnabledQuestion(logger));
    }

    if (defaultOrShowAppGenLaunchQuestion(options?.useLaunchGen)) {
        configPrompts.push(getAppGenLaunchQuestion());
    }

    return [...packagePrompts, ...transportPrompts, ...(configPrompts as ServiceConfigQuestion[])];
}

/**
 * Returns the service name question.
 *
 * @param logger - logger instance to use for logging
 * @param transportOptions - transport options for prompts
 * @param options - configuration options for prompts
 * @returns question for service name
 */
function getServiceNameQuestion(
    logger: Logger,
    transportOptions: AbapDeployConfigPromptOptions,
    options?: ServiceConfigOptions
): Question<UiServiceAnswers> {
    return {
        when: async (answers: UiServiceAnswers): Promise<boolean> => {
            if (!!answers.packageManual || !!answers.packageAutocomplete) {
                try {
                    const packageValue = answers.packageManual || answers.packageAutocomplete;
                    if (packageValue) {
                        PromptState.serviceConfig.content =
                            (await PromptState.systemSelection.objectGenerator?.getContent(packageValue)) ?? '';
                        const content = JSON.parse(PromptState.serviceConfig?.content);
                        if (
                            defaultOrShowDraftQuestion(options?.useDraftEnabled) &&
                            content.businessObject?.projectionBehavior?.withDraft
                        ) {
                            PromptState.serviceConfig.showDraftEnabled = true;
                        }
                        transportOptions.ui5AbapRepo!.default = `${(
                            content.general?.namespace ?? 'Z'
                        ).toLowerCase()}testapp`;
                        PromptState.serviceConfig.content = JSON.stringify(content);
                        PromptState.serviceConfig.serviceName =
                            content.businessService.serviceBinding.serviceBindingName;
                    }
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
    } as Question<UiServiceAnswers>;
}

/**
 * Returns the draft enabled question.
 *
 * @param logger - logger instance to use for logging
 * @returns question for draft enabled
 */
function getDraftEnabledQuestion(logger: Logger): Question<UiServiceAnswers> {
    let draftEnabled = true;
    return {
        when: (): boolean => PromptState.serviceConfig.showDraftEnabled,
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
    } as Question<UiServiceAnswers>;
}

/**
 * Returns the app gen launch question.
 *
 * @returns question for app gen launch
 */
function getAppGenLaunchQuestion(): Question<UiServiceAnswers> {
    return {
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
    } as Question<UiServiceAnswers>;
}
