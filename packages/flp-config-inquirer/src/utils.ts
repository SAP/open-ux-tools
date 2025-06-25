import {
    type DescriptorVariant,
    type NewInboundNavigation,
    type InternalInboundNavigation,
    FlexLayer,
    flpConfigurationExists,
    NamespacePrefix
} from '@sap-ux/adp-tooling';
import type { InboundContent } from '@sap-ux/axios-extension';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { type FLPConfigPromptOptions, type FLPConfigAnswers, type TileSettingsAnswers, tileActions } from './types';
/**
 * Returns FLP configuration prompt options based on the provided inbounds, variant, and tile settings answers.
 *
 * @param {TileSettingsAnswers} tileSettingsAnswers - The answers for tile settings.
 * @param {ManifestNamespace.Inbound} inbounds - The inbounds from the manifest.
 * @param {DescriptorVariant} variant - The descriptor variant object.
 * @returns {FLPConfigPromptOptions} The FLP configuration prompt options.
 */
export function getAdpFlpConfigPromptOptions(
    tileSettingsAnswers: TileSettingsAnswers,
    inbounds?: ManifestNamespace.Inbound,
    variant?: DescriptorVariant
): FLPConfigPromptOptions {
    const { tileHandlingAction, copyFromExisting } = tileSettingsAnswers ?? {};

    // If the user chooses to add a new tile and copy the original, semantic object and action are required
    if (!inbounds || (tileHandlingAction === tileActions.ADD && copyFromExisting === false)) {
        const hideExistingFlpConfigInfo = variant ? !(!inbounds && flpConfigurationExists(variant)) : true;
        return {
            existingFlpConfigInfo: { hide: hideExistingFlpConfigInfo },
            action: { executeDuplicateValidation: true },
            inboundId: { hide: true },
            overwrite: { hide: true }
        };
    }
    // If the user chooses to replace the original tile, are not required and are taken from the existing selected inbound
    if (tileHandlingAction === tileActions.REPLACE) {
        return {
            existingFlpConfigInfo: { hide: true },
            overwrite: { hide: true },
            semanticObject: { hide: true },
            action: { hide: true, showTooltip: true },
            additionalParameters: { hide: true }
        };
    }

    // If the user chooses to add a new tile and copy the original, semantic object and action are required
    return {
        existingFlpConfigInfo: { hide: true },
        semanticObject: { showTooltip: true },
        action: { executeDuplicateValidation: true, showTooltip: true },
        overwrite: { hide: true }
    };
}

/**
 * Builds the configuration for replacing an existing FLP inbound based on the provided answers and layer.
 *
 * @param {FLPConfigAnswers} flpConfigAnswers - The answers for FLP configuration.
 * @param {FlexLayer} layer - The layer of the project.
 * @returns {InternalInboundNavigation} The configuration for the replaced FLP inbound.
 */
function buildReplaceInboundConfig(flpConfigAnswers: FLPConfigAnswers, layer: FlexLayer): InternalInboundNavigation {
    const {
        semanticObject,
        action,
        signature: { parameters } = {}
    } = flpConfigAnswers.inboundId ?? ({} as InboundContent);
    let inboundId = !semanticObject || !action ? '' : `${semanticObject}-${action}`;
    inboundId = layer === FlexLayer.CUSTOMER_BASE ? `${NamespacePrefix.CUSTOMER}${inboundId}` : inboundId;
    return {
        inboundId,
        semanticObject: semanticObject ?? '',
        action: action ?? '',
        title: flpConfigAnswers.title ?? '',
        subTitle: flpConfigAnswers.subTitle ?? '',
        icon: flpConfigAnswers.icon ?? '',
        additionalParameters: parameters ? JSON.stringify(parameters) : ''
    };
}

/**
 * Builds the configuration for adding a new FLP inbound based on the provided answers and layer.
 *
 * @param {FLPConfigAnswers} flpConfigAnswers - The answers for FLP configuration.
 * @param {FlexLayer} layer - The layer of the project.
 * @returns {InternalInboundNavigation} The configuration for the new FLP inbound.
 */
function buildAddInboundConfig(flpConfigAnswers: FLPConfigAnswers, layer: FlexLayer): InternalInboundNavigation {
    let inboundId =
        !flpConfigAnswers.semanticObject || !flpConfigAnswers.action
            ? ''
            : `${flpConfigAnswers.semanticObject}-${flpConfigAnswers.action}`;
    inboundId = layer === FlexLayer.CUSTOMER_BASE ? `${NamespacePrefix.CUSTOMER}${inboundId}` : inboundId;

    return {
        inboundId,
        semanticObject: flpConfigAnswers.semanticObject ?? '',
        action: flpConfigAnswers.action ?? '',
        title: flpConfigAnswers.title ?? '',
        subTitle: flpConfigAnswers.subTitle ?? '',
        icon: flpConfigAnswers.icon ?? '',
        additionalParameters: flpConfigAnswers.additionalParameters ?? ''
    };
}

/**
 * Returns the configuration for writing FLP inbounds based on the provided answers and inbound content.
 *
 * @param {FLPConfigAnswers} flpConfigAnswers - The answers for FLP configuration.
 * @param {FlexLayer} layer - The layer of the project.
 * @param {TileSettingsAnswers} [tileSettingsAnswers] - The answers for tile settings.
 * @returns {InternalInboundNavigation | NewInboundNavigation} The configuration for FLP inbounds writer.
 */
export function getAdpFlpInboundsWriterConfig(
    flpConfigAnswers: FLPConfigAnswers,
    layer: FlexLayer,
    tileSettingsAnswers?: TileSettingsAnswers
): InternalInboundNavigation | NewInboundNavigation {
    const { tileHandlingAction } = tileSettingsAnswers ?? {};
    if (tileHandlingAction === tileActions.REPLACE) {
        return buildReplaceInboundConfig(flpConfigAnswers, layer);
    }
    return buildAddInboundConfig(flpConfigAnswers, layer);
}
