import {
    type TileSettingsAnswers,
    type DescriptorVariant,
    type NewInboundNavigation,
    type InternalInboundNavigation,
    tileActions,
    flpConfigurationExists
} from '@sap-ux/adp-tooling';
import type { InboundContent, Inbound } from '@sap-ux/axios-extension';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { FLPConfigPromptOptions, FLPConfigAnswers } from './types';
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
            action: { hide: true },
            additionalParameters: { hide: true }
        };
    }

    // If the user chooses to add a new tile and copy the original, semantic object and action are required
    return {
        existingFlpConfigInfo: { hide: true },
        overwrite: { hide: true }
    };
}

/**
 * Returns the configuration for writing FLP inbounds based on the provided answers and inbound content.
 *
 * @param {FLPConfigAnswers} flpConfigAnswers - The answers for FLP configuration.
 * @param {TileSettingsAnswers} tileSettingsAnswers - The answers for tile settings.
 * @returns {InternalInboundNavigation | NewInboundNavigation} The configuration for FLP inbounds writer.
 */
export function getAdpFlpInboundsWriterConfig(
    flpConfigAnswers: FLPConfigAnswers,
    tileSettingsAnswers?: TileSettingsAnswers
): InternalInboundNavigation | NewInboundNavigation {
    const { tileHandlingAction } = tileSettingsAnswers ?? {};
    if (tileHandlingAction === tileActions.REPLACE) {
        const {
            semanticObject,
            action,
            signature: { parameters }
        } = flpConfigAnswers.inboundId ?? ({} as InboundContent);
        return {
            inboundId: `${semanticObject}-${action}`,
            semanticObject: semanticObject ?? '',
            action: action ?? '',
            title: flpConfigAnswers.title ?? '',
            subTitle: flpConfigAnswers.subTitle ?? '',
            icon: flpConfigAnswers.icon ?? '',
            additionalParameters: JSON.stringify(parameters) ?? ''
        };
    }

    return {
        semanticObject: flpConfigAnswers.semanticObject ?? '',
        action: flpConfigAnswers.action ?? '',
        title: flpConfigAnswers.title ?? '',
        subTitle: flpConfigAnswers.subTitle ?? '',
        icon: flpConfigAnswers.icon ?? '',
        additionalParameters: flpConfigAnswers.additionalParameters ?? ''
    };
}

/**
 * Transforms an array of inbound objects from the SystemInfo API format into a ManifestNamespace.Inbound object.
 *
 * @param {Inbound[]} inbounds - The array of inbound objects to transform.
 * @returns {ManifestNamespace.Inbound | undefined} The transformed inbounds or undefined if input is empty.
 */
export function filterAndMapInboundsToManifest(inbounds: Inbound[]): ManifestNamespace.Inbound | undefined {
    if (!inbounds || inbounds.length === 0) {
        return undefined;
    }
    return inbounds.reduce((acc: { [key: string]: InboundContent }, inbound) => {
        // Skip if hideLauncher is not false
        if (!inbound?.content || inbound.content.hideLauncher !== false) {
            return acc;
        }
        const { semanticObject, action } = inbound.content;
        if (semanticObject && action) {
            const key = `${semanticObject}-${action}`;
            acc[key] = inbound.content;
        }
        return acc;
    }, {} as { [key: string]: InboundContent });
}
