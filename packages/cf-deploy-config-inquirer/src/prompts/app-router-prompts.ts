import type { ListQuestion, ConfirmQuestion, InputQuestion } from '@sap-ux/inquirer-common';
import { t } from '../i18n';
import type {
    CfAppRouterDeployConfigQuestions,
    CfAppRouterDeployConfigAnswers,
    CfAppRouterDeployConfigPromptOptions
} from '../types';
import { appRouterPromptNames, RouterModuleType } from '../types';
import { validateMtaPath, validateMtaId } from './validators';
import type { Logger } from '@sap-ux/logger';
import { getCFAbapInstanceChoices, ErrorHandler } from '@sap-ux/inquirer-common';
import { validateAbapService } from './validators';

/**
 * Generates a prompt for selecting the MTA path.
 *
 * This function creates an input prompt that allows the user to browse and select a folder for the MTA path.
 * It provides default values, a custom breadcrumb message, and validation for ensuring the selected path exists.
 *
 * @param mtaPath
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
 * Generates a prompt for entering the MTA ID..
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
 * This prompt allows users to choose between a standalone app router or a managed app router for deployment.
 * The prompt is mandatory, with a default selection of the "standard" router type.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for selecting the router type.
 */
function getRouterTypePrompt(): CfAppRouterDeployConfigQuestions {
    return {
        type: 'list',
        name: appRouterPromptNames.routerType,
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        default: (): RouterModuleType => RouterModuleType.Standard,
        message: t('prompts.routerTypeMessage'),
        choices: [
            { name: t('routerType.standaloneAppRouter'), value: RouterModuleType.Standard },
            { name: t('routerType.managedAppRouter'), value: RouterModuleType.Managed }
        ]
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
            previousAnswers.routerType !== RouterModuleType.Managed,
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
 * Generates a prompt for adding a destination service.
 *
 * This prompt is shown if the user selects a standalone app router. It asks if the user wants to add a destination service,
 * with a default answer of 'false'.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for adding a destination service.
 */
function getDestinationService(): CfAppRouterDeployConfigQuestions {
    return {
        when: (previousAnswers: CfAppRouterDeployConfigAnswers): boolean =>
            previousAnswers.routerType !== RouterModuleType.Managed,
        type: 'confirm',
        name: appRouterPromptNames.addDestinationService,
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
 * The prompt is for selecting an ABAP environment service.
 *
 * @returns {CfAppRouterDeployConfigQuestions} - The prompt configuration object for selecting a service provider.
 */
function getServiceProvider(): CfAppRouterDeployConfigQuestions {
    const errorHandler = new ErrorHandler();
    return {
        when: (previousAnswers: CfAppRouterDeployConfigAnswers): boolean => {
            return !!previousAnswers.addDestinationService && previousAnswers.routerType !== RouterModuleType.Managed;
        },
        type: 'list',
        name: appRouterPromptNames.addServiceProvider,
        guiOptions: {
            breadcrumb: t('prompts.abapEnvBindingBreadcrumbMessage')
        },
        choices: () => getCFAbapInstanceChoices(errorHandler),
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
 * @returns {CfAppRouterDeployConfigQuestions[]} Returns an array of questions related to cf deployment configuration.
 */
export async function getAppRouterQuestions(
    promptOptions: CfAppRouterDeployConfigPromptOptions,
    log?: Logger
): Promise<CfAppRouterDeployConfigQuestions[]> {
    const mtaPath = promptOptions[appRouterPromptNames.mtaPath];
    const addMtaId = promptOptions[appRouterPromptNames.mtaId] ?? false;
    const addMtaDescription = promptOptions[appRouterPromptNames.mtaDescription] ?? false;
    const addMtaVersion = promptOptions[appRouterPromptNames.mtaVersion] ?? false;
    const addRouterTypeQuestion = promptOptions[appRouterPromptNames.routerType] ?? false;
    const addConnectivityService = promptOptions[appRouterPromptNames.addConnectivityService] ?? false;
    const addServiceProvider = promptOptions[appRouterPromptNames.addServiceProvider];
    const addDestinationService = promptOptions[appRouterPromptNames.addDestinationService] ?? false;

    const questions: CfAppRouterDeployConfigQuestions[] = [];
    // Collect questions into an array
    questions.push(getMtaPathPrompt(mtaPath));

    if (addMtaId) {
        log?.info(t('info.addMtaId'));
        questions.push(getMtaIdPrompt());
    }

    if (addMtaDescription) {
        log?.info(t('info.addMtaDescription'));
        questions.push(getMtaDescriptionPrompt());
    }

    if (addMtaVersion) {
        log?.info(t('info.addMtaVersion'));
        questions.push(getMtaVersionPrompt());
    }

    if (addRouterTypeQuestion) {
        log?.info(t('info.addRouterType'));
        questions.push(getRouterTypePrompt());
    }

    if (addConnectivityService) {
        log?.info(t('info.addConnectivityService'));
        questions.push(getConnectivityServicePrompt());
    }

    if (addDestinationService) {
        log?.info(t('info.addDestinationService'));
        questions.push(getDestinationService());
    }

    if (addServiceProvider) {
        questions.push(getServiceProvider());
    }

    return questions;
}
