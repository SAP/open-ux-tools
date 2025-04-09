import type { ListQuestion, ConfirmQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import type {
    CfAppRouterDeployConfigQuestions,
    CfAppRouterDeployConfigAnswers,
    CfAppRouterDeployConfigPromptOptions
} from '../types';
import { appRouterPromptNames, RouterModuleType } from '../types';
import { validateMtaPath, validateMtaId, validateAbapService } from './validators';
import type { Logger } from '@sap-ux/logger';
import { getCFAbapInstanceChoices, ErrorHandler } from '@sap-ux/inquirer-common';
import type { ListChoiceOptions } from 'inquirer';

/**
 * Generates a prompt for selecting the MTA path.
 *
 * @param mtaPath  Mta Path string which allows the user to browse and select a folder for the MTA path
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for selecting the MTA path.
 */
function getMtaPathPrompt(mtaPath: string): CfAppRouterDeployConfigQuestions {
    return {
        type: 'input',
        guiOptions: {
            type: 'folder-browser',
            breadcrumb: t('prompts.mtaPathBreadcrumbMessage')
        },
        name: appRouterPromptNames.mtaPath,
        message: t('prompts.mtaPathMessage'),
        default: () => mtaPath,
        validate: (input: string): string | boolean => validateMtaPath(input)
    } as InputQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Generates a prompt for entering the MTA ID.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for entering the MTA ID.
 */
function getMtaIdPrompt(): CfAppRouterDeployConfigQuestions {
    return {
        type: 'input',
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        name: appRouterPromptNames.mtaId,
        message: t('prompts.mtaIdMessage'),
        validate: (input: string, previousAnswers: CfAppRouterDeployConfigAnswers): boolean | string =>
            validateMtaId(input, previousAnswers),
        filter: (input: string): string => input.replace(/\./g, '-')
    } as InputQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Generates a prompt for entering the MTA description.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for entering the MTA description.
 */
function getMtaDescriptionPrompt(): CfAppRouterDeployConfigQuestions {
    return {
        type: 'input',
        name: appRouterPromptNames.mtaDescription,
        guiOptions: {
            breadcrumb: true
        },
        message: t('prompts.mtaDescriptionMessage'),
        filter: (input: string): string => input?.trim() ?? 'Fiori elements app'
    } as InputQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Generates a prompt for entering the MTA version.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for entering the MTA version.
 */
function getMtaVersionPrompt(): CfAppRouterDeployConfigQuestions {
    return {
        default: '0.0.1',
        name: appRouterPromptNames.mtaVersion
    } as InputQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Generates a prompt for selecting the router type.
 *
 * This prompt allows users to choose between a standalone | managed | app frontend router for deployment.
 * The prompt is mandatory, with a default selection of the "managed" router type.
 *
 * @param {boolean} isInternalFeaturesSettingEnabled - Flag to determine if internal features setting is enabled.
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for selecting the router type.
 */
function getRouterTypePrompt(isInternalFeaturesSettingEnabled: boolean = false): CfAppRouterDeployConfigQuestions {
    return {
        type: 'list',
        name: appRouterPromptNames.routerType,
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        default: () => RouterModuleType.Managed, // Should always be the preferred choice
        message: t('prompts.routerTypeMessage'),
        choices: () => {
            const choices: ListChoiceOptions[] = [
                { name: t('routerType.managedAppRouter'), value: RouterModuleType.Managed },
                { name: t('routerType.standaloneAppRouter'), value: RouterModuleType.Standard }
            ];
            if (isInternalFeaturesSettingEnabled) {
                choices.splice(1, 0, { name: t('routerType.appFrontAppService'), value: RouterModuleType.AppFront });
            }
            return choices as ListChoiceOptions[];
        }
    } as ListQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Generates a prompt for adding a connectivity service.
 *
 * This prompt is shown if the user selects a standalone app router. It asks if the user wants to add a connectivity service,
 * with a default answer of 'false'.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for adding a connectivity service.
 */
function getConnectivityServicePrompt(): CfAppRouterDeployConfigQuestions {
    return {
        when: (previousAnswers: CfAppRouterDeployConfigAnswers): boolean =>
            previousAnswers.routerType === RouterModuleType.Standard,
        type: 'confirm',
        name: appRouterPromptNames.addConnectivityService,
        guiOptions: {
            breadcrumb: t('prompts.addConnectivityServiceBreadcrumbMessage')
        },
        message: t('prompts.addConnectivityMessage'),
        default: (): boolean => {
            return false;
        }
    } as ConfirmQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Generates a prompt for adding abap service binding
 *
 * This prompt is shown if the user selects a standalone app router. It asks if the user wants to add a destination service,
 * with a default answer of 'false'.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for adding a destination service.
 */
function getDestinationService(): CfAppRouterDeployConfigQuestions {
    return {
        when: (previousAnswers: CfAppRouterDeployConfigAnswers): boolean =>
            previousAnswers.routerType === RouterModuleType.Standard,
        type: 'confirm',
        name: appRouterPromptNames.addABAPServiceBinding,
        message: t('prompts.serviceAdvancedOptionMessage'),
        default: (): boolean => {
            return false;
        }
    };
}

/**
 * Generates a prompt for selecting a service provider from available services.
 *
 * This prompt will be shown if the user chooses to add a destination service and the router type standalone.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for selecting for selecting an ABAP environment service.
 */
function getServiceProvider(): CfAppRouterDeployConfigQuestions {
    const errorHandler = new ErrorHandler();
    return {
        when: (previousAnswers: CfAppRouterDeployConfigAnswers): boolean => {
            return !!previousAnswers.addABAPServiceBinding && previousAnswers.routerType === RouterModuleType.Standard;
        },
        type: 'list',
        name: appRouterPromptNames.abapServiceProvider,
        guiOptions: {
            breadcrumb: t('prompts.abapEnvBindingBreadcrumbMessage')
        },
        choices: async () => {
            const abapChoices = await getCFAbapInstanceChoices(errorHandler);
            const choices: ListChoiceOptions[] = [];
            if (abapChoices.length > 0) {
                abapChoices.forEach((choice) => {
                    choices.push({
                        name: choice.name,
                        value: { label: choice.value['label'], service: choice.value['serviceName'] }
                    });
                });
            } else {
                choices.push({ name: t('errors.abapEnvsUnavailable'), value: 'NO_ABAP_ENVS' });
            }
            return choices;
        },
        message: t('prompts.selectServiceMessage'),
        default: () => t('errors.abapEnvsUnavailable'),
        validate: (choice: string): string | boolean => validateAbapService(choice, errorHandler)
    } as ListQuestion<CfAppRouterDeployConfigAnswers>;
}

/**
 * Retrieves a list of deployment questions based on the application root and prompt options.
 *
 * @param {CfAppRouterDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @param {Logger} [log] - The logger instance to use for logging.
 * @param {boolean} [isInternalFeaturesSettingEnabled] - Whether internal features setting is enabled.
 * @returns {CfAppRouterDeployConfigQuestions[]} Returns an array of questions related to cf deployment configuration.
 */
export async function getAppRouterQuestions(
    promptOptions: CfAppRouterDeployConfigPromptOptions,
    log?: Logger,
    isInternalFeaturesSettingEnabled: boolean = false
): Promise<CfAppRouterDeployConfigQuestions[]> {
    const mtaPath = promptOptions[appRouterPromptNames.mtaPath];

    // add mta path prompt to question array
    const questions: CfAppRouterDeployConfigQuestions[] = [];
    questions.push(getMtaPathPrompt(mtaPath));

    // Mapping of options
    const questionMapping: {
        key: keyof CfAppRouterDeployConfigPromptOptions;
        getQuestion: (isFeatureEnabled?: boolean) => CfAppRouterDeployConfigQuestions;
        logMessage?: string;
    }[] = [
        { key: appRouterPromptNames.mtaId, getQuestion: getMtaIdPrompt },
        { key: appRouterPromptNames.mtaDescription, getQuestion: getMtaDescriptionPrompt },
        { key: appRouterPromptNames.mtaVersion, getQuestion: getMtaVersionPrompt },
        {
            key: appRouterPromptNames.routerType,
            getQuestion: (isFeatureEnabled) => getRouterTypePrompt(isFeatureEnabled)
        },
        {
            key: appRouterPromptNames.addConnectivityService,
            getQuestion: getConnectivityServicePrompt,
            logMessage: t('info.addConnectivityService')
        },
        {
            key: appRouterPromptNames.addABAPServiceBinding,
            getQuestion: getDestinationService,
            logMessage: t('info.addABAPServiceBinding')
        }
    ];

    // Iterate over the mapping to add questions
    for (const { key, logMessage, getQuestion } of questionMapping) {
        const shouldAddQuestion = promptOptions[key] ?? false;
        if (shouldAddQuestion) {
            if (logMessage) {
                log?.info(t(logMessage));
            }
            questions.push(getQuestion(isInternalFeaturesSettingEnabled));
        }
    }

    // Add prompts for selecting abap environment if addABAPServiceBinding is true
    if (promptOptions[appRouterPromptNames.addABAPServiceBinding]) {
        questions.push(getServiceProvider());
    }

    return questions;
}
