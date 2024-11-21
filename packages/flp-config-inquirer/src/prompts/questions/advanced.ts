import { ListQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../i18n';
import {
    promptNames,
    type ConfigurationModePromptOptions,
    type FLPConfigQuestion,
    ConfigurationMode,
    FLPConfigAnswers,
    InboundIdPromptOptions,
    CreateAnotherInboundPromptOptions
} from '../../types';
import { validateEmptyString } from '@sap-ux/project-input-validator';

const modeChoices = [
    { name: ConfigurationMode.AddNew, value: ConfigurationMode.AddNew },
    { name: ConfigurationMode.EditExisting, value: ConfigurationMode.EditExisting }
];

/**
 * Creates the 'configurationMode' prompt for FLP configuration.
 *
 * @param {ConfigurationModePromptOptions} [options] - Optional configuration for the configuration mode prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the configuration mode.
 */
export function getConfigurationModePrompt(
    inboundIds: string[],
    options?: ConfigurationModePromptOptions
): FLPConfigQuestion {
    return {
        type: 'list',
        name: promptNames.configurationMode,
        message: t('prompts.configurationMode'),
        choices: modeChoices,
        default: modeChoices[0],
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true
        },
        when: options?.hide ? false : inboundIds && inboundIds.length > 0
    };
}

/**
 * Creates the 'inboundId' prompt for FLP configuration.
 *
 * @param {InboundIdPromptOptions} [options] - Optional configuration for the inbound id prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the inbound id.
 */
export function getInboundIdsPrompt(
    inboundIds: string[],
    isCloudProject: boolean = true,
    options?: InboundIdPromptOptions
): FLPConfigQuestion {
    return {
        type: 'list',
        name: promptNames.inboundId,
        message: t('prompts.inboundIds'),
        choices: inboundIds,
        default: inboundIds[0],
        validate: validateEmptyString,
        when: options?.hide ? false : isCloudProject && inboundIds?.length > 0,
        guiOptions: {
            hint: t('tooltips.inboundId'),
            breadcrumb: t('prompts.inboundIds'),
            mandatory: true
        }
    };
}

/**
 * Creates the 'createAnotherInbound' prompt for FLP configuration.
 *
 * @param {CreateAnotherInboundPromptOptions} [options] - Optional configuration for the create another inbound prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the create another inbound.
 */
export function getCreateAnotherInboundPrompt(options?: CreateAnotherInboundPromptOptions): FLPConfigQuestion {
    return {
        type: 'confirm',
        name: promptNames.createAnotherInbound,
        message: t('prompts.createAnotherInbound'),
        default: false,
        when: options?.hide
            ? false
            : (answers: FLPConfigAnswers) => answers?.configurationMode === ConfigurationMode.AddNew,
        guiOptions: {
            hint: t('tooltips.inboundId'),
            breadcrumb: t('prompts.inboundIds')
        }
    };
}
