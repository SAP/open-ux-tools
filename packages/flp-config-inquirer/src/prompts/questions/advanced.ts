import { validateEmptyString } from '@sap-ux/project-input-validator';
import type { InboundContent } from '@sap-ux/axios-extension';
import { t } from '../../i18n';
import { promptNames } from '../../types';
import type { FLPConfigQuestion, FLPConfigAnswers, IconPromptOptions } from '../../types';
import type { ManifestNamespace } from '@sap-ux/project-access';

/**
 * Creates the 'inboundId' prompt for FLP configuration.
 *
 * @param {ManifestNamespace.Inbound} inbounds - List of existing inbounds to populate the prompt choices.
 * @returns {FLPConfigQuestion} The prompt configuration for selecting an inbound ID.
 */
export function getInboundIdsPrompt(inbounds: ManifestNamespace.Inbound): FLPConfigQuestion {
    const choices = Object.entries(inbounds).map(([inboundId, data]) => ({
        name: inboundId,
        value: data
    }));
    return {
        type: 'list',
        name: promptNames.inboundId,
        message: t('prompts.inboundIds'),
        choices: choices,
        default: () => choices[0]?.value,
        validate: (value: InboundContent): boolean | string =>
            validateEmptyString(value.semanticObject) && validateEmptyString(value.action),
        when: choices?.length > 0,
        guiOptions: {
            hint: t('tooltips.inboundId'),
            breadcrumb: t('prompts.inboundIds'),
            mandatory: true
        }
    };
}

/**
 * Creates the 'additionalParameters' prompt for specifying parameters in JSON format.
 *
 * @returns {FLPConfigQuestion} The prompt configuration for specifying a parameter string.
 */
export function getParameterStringPrompt(): FLPConfigQuestion {
    return {
        type: 'editor',
        name: promptNames.additionalParameters,
        message: t('prompts.additionalParameters'),
        default: (answers: FLPConfigAnswers): string => {
            const parameters = answers?.inboundId?.signature?.parameters;
            return parameters ? JSON.stringify(parameters, null, 2) : '';
        },
        validate: (value: string): string | boolean => {
            if (!value) {
                return true; // No additional parameters provided, skip validation
            }
            try {
                JSON.parse(value);
                return true;
            } catch {
                return t('validators.invalidParameterString');
            }
        },
        guiOptions: {
            hint: t('tooltips.additionalParameters'),
            mandatory: false
        }
    };
}

/**
 * Creates the 'existingFlpConfigInfo' prompt for displaying existing FLP configuration information.
 *
 * @param isCLI - Indicates if the platform is CLI (unused).
 * @returns {FLPConfigQuestion} The prompt configuration for displaying existing FLP config info.
 */
export function getExistingFlpConfigInfoPrompt(isCLI: boolean): FLPConfigQuestion {
    return {
        type: 'input',
        name: promptNames.existingFlpConfigInfo,
        message: t('prompts.existingFLPConfig'),
        when: () => !isCLI,
        guiOptions: {
            type: 'label',
            mandatory: false
        }
    };
}

/**
 * Creates the 'icon' prompt for FLP configuration.
 *
 * @param {IconPromptOptions} [options] - Optional configuration for the icon prompt, including default values.
 * @returns {FLPConfigQuestion} The prompt configuration for the icon.
 */
export function getIconPrompt(options?: IconPromptOptions): FLPConfigQuestion {
    return {
        name: promptNames.icon,
        type: 'input',
        guiOptions: {
            breadcrumb: true
        },
        message: t('prompts.icon'),
        default: (answers: FLPConfigAnswers): string => {
            if (options?.default) {
                return options.default;
            }
            return answers?.inboundId?.icon ?? '';
        },
        filter: (val: string): string => val?.trim()
    };
}

/**
 * Creates the 'confirmReplace' prompt for confirming tile replacement.
 *
 * @returns {FLPConfigQuestion} The prompt configuration for confirming tile replacement.
 */
export function getConfirmReplacePrompt(): FLPConfigQuestion {
    return {
        type: 'confirm',
        name: promptNames.confirmReplace,
        message: t('prompts.confirmReplace'),
        default: false,
        guiOptions: {
            hint: t('tooltips.confirmReplace'),
            mandatory: true
        },
        validate: (value): boolean => value
    };
}
