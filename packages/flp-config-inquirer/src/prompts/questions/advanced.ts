import { validateEmptyString } from '@sap-ux/project-input-validator';
import type { InboundContent } from '@sap-ux/axios-extension';
import { t } from '../../i18n';
import { promptNames } from '../../types';
import type { FLPConfigQuestion, FLPConfigAnswers } from '../../types';
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
 * @param {ManifestNamespace.Inbound} inbounds - List of existing inbound IDs to conditionally display this prompt.
 * @returns {FLPConfigQuestion} The prompt configuration for specifying a parameter string.
 */
export function getParameterStringPrompt(inbounds?: ManifestNamespace.Inbound): FLPConfigQuestion {
    return {
        type: 'editor',
        name: promptNames.additionalParameters,
        message: t('prompts.additionalParameters'),
        default: (answers: FLPConfigAnswers): string => {
            const parameters = answers?.inboundId?.signature?.parameters;
            return parameters ? JSON.stringify(parameters, null, 2) : '';
        },
        validate: (value: string, answers: FLPConfigAnswers): string | boolean => {
            if (!value) {
                return true; // No additional parameters provided, skip validation
            }
            try {
                JSON.parse(value);
            } catch (error) {
                return t('validators.invalidParameterString');
            }
            return _validateDuplicateInbound(inbounds, answers);
        },
        guiOptions: {
            hint: t('tooltips.additionalParameters'),
            mandatory: false
        }
    };
}

/**
 * Validates if the inbound configuration is a duplicate.
 *
 * @param {ManifestNamespace.Inbound} inbounds - Existing inbounds to check against.
 * @param {FLPConfigAnswers} answers - Current answers to validate.
 * @returns {string | boolean} Error message if duplicate, otherwise true.
 */
function _validateDuplicateInbound(inbounds?: ManifestNamespace.Inbound, answers?: FLPConfigAnswers): string | boolean {
    if (!inbounds || !answers) {
        return true;
    }
    const { semanticObject, action, title, additionalParameters } = answers;
    const unformattedAdditionalParameters = additionalParameters?.replace(/\s/g, '');
    const isDuplicate = Object.values(inbounds).some(
        (inbound: any) =>
            inbound.semanticObject === semanticObject &&
            inbound.action === action &&
            inbound.title === title &&
            JSON.stringify(inbound?.signature?.parameters ?? {}) === (unformattedAdditionalParameters ?? '')
    );
    return isDuplicate ? t('validators.duplicateInbound') : true;
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
