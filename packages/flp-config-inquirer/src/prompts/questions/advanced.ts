import { parseParameters } from '@sap-ux/adp-tooling';
import { validateEmptyString } from '@sap-ux/project-input-validator';

import type {
    FLPConfigQuestion,
    FLPConfigAnswers,
    InboundIdPromptOptions,
    CreateAnotherInboundPromptOptions,
    ParameterStringPromptOptions,
    EmptyInboundsLabelOptions
} from '../../types';
import { t } from '../../i18n';
import { promptNames } from '../../types';

/**
 * Creates the 'inboundId' prompt for FLP configuration.
 *
 * @param {string[]} inboundIds - List of existing inbound IDs to populate the prompt choices.
 * @param {InboundIdPromptOptions} [options] - Optional configuration for the inbound ID prompt, including defaults.
 * @returns {FLPConfigQuestion} The prompt configuration for selecting an inbound ID.
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
        }
    };
}

/**
 * Creates the 'emptyInboundsInfo' label prompt for cases where no inbounds exist.
 *
 * @param {string[]} inboundIds - List of existing inbound IDs to determine whether to display this label.
 * @param {string} [appId] - Application ID to generate a link for the Fiori application library.
 * @param {EmptyInboundsLabelOptions} [options] - Optional configuration for the label prompt.
 * @returns {FLPConfigQuestion} The prompt configuration for displaying an information label when no inbounds exist.
 */
export function getEmptyInboundsLabelPrompt(
    inboundIds: string[],
    appId?: string,
    options?: EmptyInboundsLabelOptions
): FLPConfigQuestion {
    return {
        type: 'input',
        name: promptNames.emptyInboundsInfo,
        message: t('prompts.emptyInboundsInfo'),
        guiOptions: {
            type: 'label',
            mandatory: false,
            link: {
                text: 'application page.',
                url: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/${
                    appId ? `index.html?appId=${appId}&releaseGroupTextCombined=SC` : '#/home'
                }`
            }
        },
        when: options?.hide ? false : inboundIds.length === 0
    };
}

/**
 * Creates the 'parameterString' prompt for specifying parameters in JSON format.
 *
 * @param {string[]} inboundIds - List of existing inbound IDs to conditionally display this prompt.
 * @param {ParameterStringPromptOptions} [options] - Optional configuration for the parameter string prompt, including defaults.
 * @returns {FLPConfigQuestion} The prompt configuration for specifying a parameter string.
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
 * Creates the 'createAnotherInbound' confirmation prompt for adding additional inbounds.
 *
 * @param {boolean} isCLI - Indicates if the platform is CLI.
 * @param {CreateAnotherInboundPromptOptions} [options] - Optional configuration for the confirmation prompt, including defaults.
 * @returns {FLPConfigQuestion} The prompt configuration for confirming whether to create another inbound.
 */
export function getCreateAnotherInboundPrompt(
    isCLI: boolean,
    options?: CreateAnotherInboundPromptOptions
): FLPConfigQuestion {
    return {
        type: 'confirm',
        name: promptNames.createAnotherInbound,
        message: t('prompts.createAnotherInbound'),
        default: false,
        when: options?.hide ? false : (answers: FLPConfigAnswers) => !isCLI && !!answers?.inboundId,
        guiOptions: {
            hint: t('tooltips.inboundId'),
            breadcrumb: t('prompts.inboundIds')
        }
    };
}
