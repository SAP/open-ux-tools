import { parseParameters } from '@sap-ux/adp-tooling';
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
 * @param {string[]} inboundIds - List of existing inbound IDs to conditionally display this prompt.
 * @returns {FLPConfigQuestion} The prompt configuration for specifying a parameter string.
 */
export function getParameterStringPrompt(inboundIds: string[]): FLPConfigQuestion {
    return {
        type: 'editor',
        name: promptNames.additionalParameters,
        message: t('prompts.additionalParameters'),
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
        when: inboundIds?.length === 0,
        guiOptions: {
            hint: t('tooltips.additionalParameters'),
            mandatory: false
        }
    };
}

/**
 * Creates the 'createAnotherInbound' confirmation prompt for adding additional inbounds.
 *
 * @param {boolean} isCLI - Indicates if the platform is CLI.
 * @returns {FLPConfigQuestion} The prompt configuration for confirming whether to create another inbound.
 */
export function getCreateAnotherInboundPrompt(isCLI: boolean): FLPConfigQuestion {
    return {
        type: 'confirm',
        name: promptNames.createAnotherInbound,
        message: t('prompts.createAnotherInbound'),
        default: false,
        when: (answers: FLPConfigAnswers) => !isCLI && !!answers?.inboundId,
        guiOptions: {
            hint: t('tooltips.inboundId'),
            breadcrumb: t('prompts.inboundIds')
        }
    };
}
