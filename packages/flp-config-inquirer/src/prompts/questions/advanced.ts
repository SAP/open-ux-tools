import { Severity } from '@sap-devx/yeoman-ui-types';
import { parseParameters } from '@sap-ux/adp-tooling';
import { validateEmptyString } from '@sap-ux/project-input-validator';

import { t } from '../../i18n';
import {
    promptNames,
    type FLPConfigQuestion,
    FLPConfigAnswers,
    InboundIdPromptOptions,
    CreateAnotherInboundPromptOptions,
    ParameterStringPromptOptions
} from '../../types';

/**
 * Creates the 'inboundId' prompt for FLP configuration.
 *
 * @param {InboundIdPromptOptions} [options] - Optional configuration for the inbound id prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the inbound id.
 */
export function getInboundIdsPrompt(inboundIds: string[], options?: InboundIdPromptOptions): FLPConfigQuestion {
    return {
        type: 'list',
        name: promptNames.inboundId,
        message: t('prompts.inboundIds'),
        choices: inboundIds,
        default: inboundIds[0],
        validate: validateEmptyString,
        when: options?.hide ? false : inboundIds?.length > 0,
        guiOptions: {
            hint: t('tooltips.inboundId'),
            breadcrumb: t('prompts.inboundIds'),
            mandatory: true
        },
        additionalMessages: () => {
            if (inboundIds?.length === 0) {
                return {
                    message: t('validators.noInboundKeysAreFound'),
                    severity: Severity.warning
                };
            }
        }
    };
}

/**
 * Creates the 'parameterString' prompt for FLP configuration.
 *
 * @param {ParameterStringPromptOptions} [options] - Optional configuration for the parameter string prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the parameter string.
 */
export function getParameterStringPrompt(
    inboundIds: string[],
    options?: ParameterStringPromptOptions
): FLPConfigQuestion {
    return {
        type: 'editor',
        name: promptNames.parameterString,
        message: t('prompts.parameterString'),
        validate: (value: string) => {
            if (!value) {
                return true;
            }

            try {
                parseParameters(value);
            } catch (error) {
                return error.message;
            }

            return true;
        },
        when: options?.hide ? false : inboundIds?.length === 0,
        guiOptions: {
            hint: t('tooltips.parameterString'),
            mandatory: false
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
        when: options?.hide ? false : (answers: FLPConfigAnswers) => !!answers?.inboundId,
        guiOptions: {
            hint: t('tooltips.inboundId'),
            breadcrumb: t('prompts.inboundIds')
        }
    };
}
